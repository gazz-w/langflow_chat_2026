import csv
import io
import json
import os
import re
import time
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, render_template, request
from limits import RateLimitItemPerDay, RateLimitItemPerHour, storage, strategies
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

LANGFLOW_BASE_URL = os.environ["LANGFLOW_BASE_URL"]
FLOW_ID = os.environ["FLOW_ID"]
LANGFLOW_API_KEY = os.environ["LANGFLOW_API_KEY"]
MEMORY_COMPONENT_ID = os.environ["MEMORY_COMPONENT_ID"]

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# Atrás do Caddy (1 proxy). ProxyFix faz o request.remote_addr refletir
# o IP real do cliente (header X-Forwarded-For) em vez do IP do container.
# Se um dia ligar o proxy da Cloudflare (nuvem laranja), mudar x_for para 2.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

# ── Rate limiting (controle de abuso por IP) ───────────────────────────
# Storage compartilhado entre os workers do gunicorn. Em produção usa
# Redis (RATELIMIT_STORAGE_URI); em dev cai para memória local.
HOUR_MAX = 30
DAY_MAX = 100
_rate_storage = storage.storage_from_string(
    os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
)
_rate_strategy = strategies.FixedWindowRateLimiter(_rate_storage)
_HOUR_LIMIT = RateLimitItemPerHour(HOUR_MAX)
_DAY_LIMIT = RateLimitItemPerDay(DAY_MAX)


def _client_ip() -> str:
    return request.remote_addr or "desconhecido"


def rate_limit_ok(ip: str) -> bool:
    """Checa os dois limites SEM consumir. Falha aberta se o storage cair."""
    try:
        return _rate_strategy.test(_HOUR_LIMIT, "chat", ip) and _rate_strategy.test(
            _DAY_LIMIT, "chat", ip
        )
    except Exception:
        return True


def rate_limit_consume(ip: str) -> None:
    """Consome um slot em cada janela (hora e dia)."""
    try:
        _rate_strategy.hit(_HOUR_LIMIT, "chat", ip)
        _rate_strategy.hit(_DAY_LIMIT, "chat", ip)
    except Exception:
        pass


def usage_snapshot(ip: str) -> dict:
    """Uso atual do IP, sem consumir. Falha aberta (mostra cheio)."""
    try:
        hour = _rate_strategy.get_window_stats(_HOUR_LIMIT, "chat", ip)
        day = _rate_strategy.get_window_stats(_DAY_LIMIT, "chat", ip)
        return {
            "hour": {"remaining": hour.remaining, "limit": HOUR_MAX},
            "day": {"remaining": day.remaining, "limit": DAY_MAX},
        }
    except Exception:
        return {
            "hour": {"remaining": HOUR_MAX, "limit": HOUR_MAX},
            "day": {"remaining": DAY_MAX, "limit": DAY_MAX},
        }


def extract_reply(payload: dict) -> str:
    """Pega o texto da resposta de dentro da estrutura aninhada do Langflow."""
    message = payload["outputs"][0]["outputs"][0]["results"]["message"]
    return message["text"]


DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(__file__))
LEADS_FILE = os.path.join(DATA_DIR, "leads.jsonl")
CONSENT_VERSION = "2026-05-18.v1"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()
    email = (body.get("email") or "").strip()

    digits = re.sub(r"\D", "", phone)
    if len(name) < 2:
        return jsonify({"error": "Informe seu nome."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "E-mail inválido."}), 400
    if len(digits) < 10:
        return jsonify({"error": "Telefone inválido."}), 400

    lead = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "phone": phone,
        "email": email,
        "session_id": (body.get("session_id") or "").strip(),
        "consent_community": bool(body.get("consent_community")),
        "consent_share_agencies": bool(body.get("consent_share_agencies")),
        "consent_version": CONSENT_VERSION,
    }

    try:
        with open(LEADS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(lead, ensure_ascii=False) + "\n")
    except OSError:
        return jsonify({"error": "Não foi possível salvar o cadastro."}), 500

    return jsonify({"ok": True})


_rates_cache = {"ts": 0.0, "data": None}


@app.route("/rates")
def rates():
    now = time.time()
    if _rates_cache["data"] and now - _rates_cache["ts"] < 600:
        return jsonify(_rates_cache["data"])

    try:
        resp = requests.get(
            "https://api.frankfurter.app/latest?base=EUR&symbols=BRL,USD",
            timeout=10,
        )
        resp.raise_for_status()
        r = resp.json()["rates"]
        data = {
            "eur_brl": round(r["BRL"], 2),
            "usd_brl": round(r["BRL"] / r["USD"], 2),
        }
    except (requests.RequestException, KeyError, ValueError, ZeroDivisionError):
        if _rates_cache["data"]:
            return jsonify(_rates_cache["data"])
        return jsonify({"error": "indisponível"}), 502

    _rates_cache["ts"] = now
    _rates_cache["data"] = data
    return jsonify(data)


ALLOWED_CURRENCIES = {"BRL", "USD", "EUR", "GBP"}
_fx_cache: dict[tuple[str, str], tuple[float, float]] = {}


@app.route("/convert")
def convert():
    frm = (request.args.get("from") or "").upper()
    to = (request.args.get("to") or "").upper()
    try:
        amount = float((request.args.get("amount") or "1").replace(",", "."))
    except ValueError:
        return jsonify({"error": "valor inválido"}), 400

    if frm not in ALLOWED_CURRENCIES or to not in ALLOWED_CURRENCIES:
        return jsonify({"error": "moeda não suportada"}), 400
    if frm == to:
        return jsonify({"result": round(amount, 2), "rate": 1.0})

    now = time.time()
    cached = _fx_cache.get((frm, to))
    if cached and now - cached[1] < 600:
        rate = cached[0]
    else:
        try:
            resp = requests.get(
                f"https://api.frankfurter.app/latest?from={frm}&to={to}",
                timeout=10,
            )
            resp.raise_for_status()
            rate = resp.json()["rates"][to]
        except (requests.RequestException, KeyError, ValueError):
            if cached:
                rate = cached[0]
            else:
                return jsonify({"error": "indisponível"}), 502
        else:
            _fx_cache[(frm, to)] = (rate, now)

    return jsonify({"result": round(amount * rate, 2), "rate": rate})


@app.route("/usage")
def usage():
    """Espia o consumo do IP sem gastar requisição. Usado pelo contador."""
    return jsonify(usage_snapshot(_client_ip()))


@app.route("/chat", methods=["POST"])
def chat():
    ip = _client_ip()

    # Rejeita o abuso ANTES de gastar tokens com o Langflow.
    if not rate_limit_ok(ip):
        return (
            jsonify(
                {
                    "error": "Você atingiu o limite de mensagens. "
                    "Tente novamente mais tarde.",
                    "usage": usage_snapshot(ip),
                }
            ),
            429,
        )

    body = request.get_json(silent=True) or {}
    user_message = (body.get("message") or "").strip()
    session_id = (body.get("session_id") or "").strip()

    if not user_message:
        # Mensagem vazia não consome slot — é rejeitada de imediato.
        return jsonify({"error": "Mensagem vazia."}), 400

    # Requisição válida: consome um slot em cada janela.
    rate_limit_consume(ip)

    langflow_payload = {
        "input_value": user_message,
        "output_type": "chat",
        "input_type": "chat",
    }
    if session_id:
        # session_id no topo escopa a GRAVAÇÃO (ChatInput/ChatOutput).
        # O tweak força o componente Memory a LER só a sessão deste usuário —
        # sem isso o Memory lê todas as conversas (vazamento entre usuários).
        langflow_payload["session_id"] = session_id
        langflow_payload["tweaks"] = {
            MEMORY_COMPONENT_ID: {"session_id": session_id}
        }

    try:
        resp = requests.post(
            f"{LANGFLOW_BASE_URL}/api/v1/run/{FLOW_ID}?stream=false",
            json=langflow_payload,
            headers={"x-api-key": LANGFLOW_API_KEY},
            timeout=60,
        )
        resp.raise_for_status()
        reply = extract_reply(resp.json())
    except requests.RequestException as exc:
        return (
            jsonify(
                {
                    "error": f"Falha ao falar com o Langflow: {exc}",
                    "usage": usage_snapshot(ip),
                }
            ),
            502,
        )
    except (KeyError, IndexError, ValueError):
        return (
            jsonify(
                {
                    "error": "Resposta do Langflow em formato inesperado.",
                    "usage": usage_snapshot(ip),
                }
            ),
            502,
        )

    return jsonify({"reply": reply, "usage": usage_snapshot(ip)})


# ── Painel administrativo (acesso restrito) ────────────────────────────
# A proteção principal (senha) é feita pelo Caddy no subdomínio admin.
# ADMIN_HOST é uma trava extra: o painel só responde no host correto.
ADMIN_HOST = os.environ.get("ADMIN_HOST", "")
_BRT = timezone(timedelta(hours=-3))


def _admin_allowed() -> bool:
    """Defesa em profundidade: o painel só responde no host admin."""
    return not ADMIN_HOST or request.host == ADMIN_HOST


def _fmt_ts(ts: str) -> str:
    try:
        return datetime.fromisoformat(ts).astimezone(_BRT).strftime("%d/%m/%Y %H:%M")
    except (ValueError, TypeError):
        return ts or "—"


def read_leads() -> list:
    """Lê o leads.jsonl e devolve os cadastros (mais recentes primeiro)."""
    leads = []
    try:
        with open(LEADS_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    lead = json.loads(line)
                except ValueError:
                    continue
                lead["ts_fmt"] = _fmt_ts(lead.get("ts", ""))
                leads.append(lead)
    except OSError:
        pass
    leads.reverse()
    return leads


PAGE_SIZE = 50


def _filter_by_email(leads: list, query: str) -> list:
    """Filtra leads cujo e-mail contém o termo (case-insensitive)."""
    if not query:
        return leads
    q = query.lower()
    return [lead for lead in leads if q in (lead.get("email") or "").lower()]


@app.route("/admin")
def admin():
    if not _admin_allowed():
        return "Não encontrado", 404

    query = (request.args.get("q") or "").strip()
    all_leads = read_leads()
    total = len(all_leads)

    leads = _filter_by_email(all_leads, query)
    filtered = len(leads)

    try:
        page = max(1, int(request.args.get("page", "1")))
    except ValueError:
        page = 1
    pages = max(1, (filtered + PAGE_SIZE - 1) // PAGE_SIZE)
    page = min(page, pages)
    start = (page - 1) * PAGE_SIZE
    page_leads = leads[start:start + PAGE_SIZE]

    return render_template(
        "admin.html",
        leads=page_leads,
        total=total,
        filtered=filtered,
        query=query,
        page=page,
        pages=pages,
    )


@app.route("/admin/export.csv")
def admin_export():
    if not _admin_allowed():
        return "Não encontrado", 404

    query = (request.args.get("q") or "").strip()
    leads = _filter_by_email(read_leads(), query)

    buf = io.StringIO()
    buf.write("﻿")  # BOM: faz o Excel abrir os acentos corretamente
    writer = csv.writer(buf, delimiter=";")
    writer.writerow([
        "Data", "Nome", "Telefone", "E-mail", "Sessão",
        "Consentimento comunidade", "Consentimento agências",
        "Versão do consentimento",
    ])
    for lead in leads:
        writer.writerow([
            lead.get("ts_fmt", ""),
            lead.get("name", ""),
            lead.get("phone", ""),
            lead.get("email", ""),
            lead.get("session_id", ""),
            "sim" if lead.get("consent_community") else "não",
            "sim" if lead.get("consent_share_agencies") else "não",
            lead.get("consent_version", ""),
        ])

    filename = f"leads_{datetime.now(_BRT).strftime('%Y-%m-%d')}.csv"
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.route("/admin/session/<session_id>")
def admin_session(session_id):
    if not _admin_allowed():
        return "Não encontrado", 404
    messages, error = [], None
    try:
        resp = requests.get(
            f"{LANGFLOW_BASE_URL}/api/v1/monitor/messages",
            params={"session_id": session_id},
            headers={"x-api-key": LANGFLOW_API_KEY},
            timeout=15,
        )
        resp.raise_for_status()
        messages = resp.json()
        messages.sort(key=lambda m: m.get("timestamp") or "")
    except requests.RequestException as exc:
        error = f"Não foi possível carregar a conversa: {exc}"
    except (ValueError, AttributeError):
        error = "Resposta do Langflow em formato inesperado."
    return render_template(
        "admin_session.html",
        session_id=session_id,
        messages=messages,
        error=error,
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=False)

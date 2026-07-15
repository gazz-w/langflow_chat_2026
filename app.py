import csv
import io
import json
import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    jsonify,
    render_template,
    request,
    stream_with_context,
)
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


def _sse(obj: dict) -> str:
    """Serializa um evento no formato Server-Sent Events."""
    return "data: " + json.dumps(obj, ensure_ascii=False) + "\n\n"


def _stream_langflow(payload: dict, ip: str, session_id: str = "", user_id: str = ""):
    """Consome o run do Langflow em modo stream (NDJSON) e repassa como SSE.

    O Agent atual não emite eventos 'token' (o texto completo chega no
    evento 'end'), mas o parser já trata 'token' — quando o flow passar a
    suportá-lo, o streaming real funciona sem mudar nada aqui.
    """
    emitted = False
    try:
        with requests.post(
            f"{LANGFLOW_BASE_URL}/api/v1/run/{FLOW_ID}?stream=true",
            json=payload,
            headers={"x-api-key": LANGFLOW_API_KEY},
            stream=True,
            timeout=(10, 90),
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if line.startswith("data:"):
                    # Tolera SSE além de NDJSON (formato varia entre versões).
                    line = line[5:].strip()
                try:
                    event = json.loads(line)
                except ValueError:
                    continue
                etype = event.get("event")
                data = event.get("data") or {}
                if etype == "token":
                    chunk = data.get("chunk") or ""
                    if chunk:
                        emitted = True
                        yield _sse({"type": "token", "text": chunk})
                elif etype == "end":
                    if not emitted:
                        reply = extract_reply(data.get("result") or {})
                        yield _sse({"type": "token", "text": reply})
                    yield _sse({"type": "done", "usage": usage_snapshot(ip)})
                    schedule_lead_scoring(session_id, user_id)
                    return
        yield _sse({
            "type": "error",
            "error": "Resposta do Langflow em formato inesperado.",
            "usage": usage_snapshot(ip),
        })
    except requests.RequestException as exc:
        # Detalhe técnico só no log do servidor — nunca na tela do usuário
        # (a mensagem da exceção expõe URL interna e o id do flow).
        app.logger.warning("Falha no stream do Langflow: %s", exc)
        yield _sse({
            "type": "error",
            "error": "Não consegui falar com a assistente agora. "
            "Tente novamente em instantes.",
            "usage": usage_snapshot(ip),
        })
    except (KeyError, IndexError, ValueError, TypeError):
        yield _sse({
            "type": "error",
            "error": "Resposta do Langflow em formato inesperado.",
            "usage": usage_snapshot(ip),
        })


DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(__file__))
LEADS_FILE = os.path.join(DATA_DIR, "leads.jsonl")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.jsonl")
FEEDBACK_FILE = os.path.join(DATA_DIR, "feedback.jsonl")
CONSENT_VERSION = "2026-05-18.v1"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Cache por worker dos pares (user_id, session_id) já gravados — evita
# reescrever a mesma linha a cada mensagem. A garantia real de unicidade
# é a deduplicação na leitura (sessions_for_user).
_seen_sessions = set()


def record_session(user_id: str, session_id: str) -> None:
    """Registra o vínculo user_id <-> session_id (uma vez por par)."""
    pair = (user_id, session_id)
    if pair in _seen_sessions:
        return
    _seen_sessions.add(pair)
    entry = {
        "user_id": user_id,
        "session_id": session_id,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    try:
        with open(SESSIONS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        pass


def sessions_for_user(user_id: str) -> list:
    """Sessões distintas de um usuário, da mais antiga para a mais recente."""
    seen, ordered = set(), []
    try:
        with open(SESSIONS_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue
                sid = entry.get("session_id")
                if entry.get("user_id") == user_id and sid and sid not in seen:
                    seen.add(sid)
                    ordered.append({"session_id": sid, "ts": entry.get("ts", "")})
    except OSError:
        pass
    return ordered


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
        "user_id": (body.get("user_id") or "").strip(),
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
    user_id = (body.get("user_id") or "").strip()

    if not user_message:
        # Mensagem vazia não consome slot — é rejeitada de imediato.
        return jsonify({"error": "Mensagem vazia."}), 400

    # Requisição válida: consome um slot em cada janela.
    rate_limit_consume(ip)

    # Vincula esta sessão ao usuário (para o histórico no painel admin).
    if user_id and session_id:
        record_session(user_id, session_id)

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

    # Modo streaming (SSE): o cliente pede com {"stream": true}. Erros de
    # validação/limite acima continuam respondendo JSON — o frontend decide
    # pelo Content-Type. Sem "stream", segue o caminho síncrono original.
    if body.get("stream"):
        return Response(
            stream_with_context(
                _stream_langflow(langflow_payload, ip, session_id, user_id)
            ),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

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
        # Detalhe técnico só no log — a mensagem da exceção expõe URL
        # interna e o id do flow.
        app.logger.warning("Falha ao falar com o Langflow: %s", exc)
        return (
            jsonify(
                {
                    "error": "Não consegui falar com a assistente agora. "
                    "Tente novamente em instantes.",
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

    schedule_lead_scoring(session_id, user_id)
    return jsonify({"reply": reply, "usage": usage_snapshot(ip)})


def _clip(text, limit: int) -> str:
    """Normaliza e limita o tamanho de um campo (defesa contra payloads gordos)."""
    return (str(text or "")).strip()[:limit]


@app.route("/feedback", methods=["POST"])
def feedback():
    """Registra a avaliação (👍/👎) de uma resposta, com pergunta+resposta para
    permitir revisar e melhorar o prompt/pipeline. Grava em feedback.jsonl."""
    body = request.get_json(silent=True) or {}
    rating = (body.get("rating") or "").strip()
    if rating not in ("up", "down"):
        return jsonify({"error": "Avaliação inválida."}), 400

    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "rating": rating,
        "reason": _clip(body.get("reason"), 300),
        "question": _clip(body.get("question"), 2000),
        "answer": _clip(body.get("answer"), 8000),
        "msg_id": _clip(body.get("msg_id"), 80),
        "session_id": _clip(body.get("session_id"), 120),
        "user_id": _clip(body.get("user_id"), 120),
    }
    try:
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        return jsonify({"error": "Não foi possível registrar o feedback."}), 500

    return jsonify({"ok": True})


# ── Classificação de leads (IA) ────────────────────────────────────────
# Após cada troca de mensagens, uma thread de fundo pede à Claude (Haiku,
# barata) um perfil estruturado do lead a partir da conversa e um score
# quente/morno/frio. Sem ANTHROPIC_API_KEY no .env, fica desabilitado.
# Aceita os dois nomes de variável (o padrão e o usado no .env do projeto).
ANTHROPIC_API_KEY = (
    os.environ.get("ANTHROPIC_API_KEY")
    or os.environ.get("CLAUDE_API_KEY_NEW", "")
)
LEAD_SCORING_MODEL = os.environ.get("LEAD_SCORING_MODEL", "claude-haiku-4-5-20251001")
LEAD_SCORES_FILE = os.path.join(DATA_DIR, "lead_scores.jsonl")

_scoring_inflight = set()  # session_ids com classificação em andamento

SCORING_SYSTEM = (
    "Você classifica leads de uma assistente de intercâmbio (chatbot da "
    "influenciadora Ananda). Receberá a transcrição de uma conversa entre "
    "um visitante e a assistente. Responda APENAS com um objeto JSON, sem "
    "markdown e sem texto extra, neste formato:\n"
    '{"score": "quente"|"morno"|"frio", "destino": string|null, '
    '"orcamento": string|null, "prazo": string|null, '
    '"quer_agencia": boolean, "resumo": string}\n\n'
    "Critérios do score:\n"
    "- quente: intenção clara de fazer intercâmbio (fala em contratar, "
    "pede próximos passos, menciona datas/orçamento concretos ou pede "
    "contato com agência);\n"
    "- morno: interesse real, mas ainda pesquisando (compara destinos, "
    "pergunta custos gerais);\n"
    "- frio: curiosidade genérica, estudo escolar ou fora do tema.\n"
    "Campos: destino = país/cidade de interesse; orcamento = qualquer "
    "menção a valores; prazo = quando pretende ir; quer_agencia = pediu "
    "ou aceitaria contato comercial; resumo = 1 frase objetiva sobre o "
    "momento do lead. Use null quando não houver informação."
)


def _score_lead(session_id: str, user_id: str) -> None:
    """Roda em thread de fundo: lê a conversa no Langflow, pede à Claude o
    perfil do lead e grava a classificação em lead_scores.jsonl."""
    try:
        messages, err = _fetch_messages(session_id)
        if err or not messages:
            return
        lines = []
        for m in messages[-24:]:
            who = "Visitante" if m.get("sender") == "User" else "Assistente"
            text = (m.get("text") or "").strip()
            if text:
                lines.append(f"{who}: {text}")
        convo = "\n".join(lines)[-6000:]
        if not convo:
            return

        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": LEAD_SCORING_MODEL,
                "max_tokens": 300,
                "system": SCORING_SYSTEM,
                "messages": [{"role": "user", "content": convo}],
            },
            timeout=30,
        )
        resp.raise_for_status()
        raw = resp.json()["content"][0]["text"]
        # Tolera cercas de código e texto ao redor: fica só com o {...}.
        raw = raw[raw.find("{"): raw.rfind("}") + 1]
        data = json.loads(raw)

        score = str(data.get("score") or "").lower()
        if score not in ("quente", "morno", "frio"):
            return
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "session_id": session_id,
            "user_id": user_id,
            "score": score,
            "destino": _clip(data.get("destino"), 80),
            "orcamento": _clip(data.get("orcamento"), 80),
            "prazo": _clip(data.get("prazo"), 80),
            "quer_agencia": bool(data.get("quer_agencia")),
            "resumo": _clip(data.get("resumo"), 200),
            "n_msgs": len(messages),
        }
        with open(LEAD_SCORES_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as exc:  # noqa: BLE001 — thread de fundo nunca propaga
        app.logger.warning("Falha na classificação do lead: %s", exc)
    finally:
        _scoring_inflight.discard(session_id)


def schedule_lead_scoring(session_id: str, user_id: str) -> None:
    """Dispara a classificação em segundo plano (não atrasa a resposta)."""
    if not ANTHROPIC_API_KEY or not session_id or not user_id:
        return
    if session_id in _scoring_inflight:
        return
    _scoring_inflight.add(session_id)
    threading.Thread(
        target=_score_lead, args=(session_id, user_id), daemon=True
    ).start()


def read_lead_scores() -> dict:
    """Devolve user_id -> classificação mais recente (arquivo é append-only)."""
    scores = {}
    try:
        with open(LEAD_SCORES_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                except ValueError:
                    continue
                uid = e.get("user_id")
                if uid:
                    scores[uid] = e  # a última linha do arquivo vence
    except OSError:
        pass
    return scores


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


def read_feedback() -> list:
    """Lê feedback.jsonl (mais recentes primeiro), mantendo apenas a avaliação
    mais recente de cada mensagem (o usuário pode ter trocado 👍↔👎)."""
    raw = []
    try:
        with open(FEEDBACK_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    raw.append(json.loads(line))
                except ValueError:
                    continue
    except OSError:
        pass
    raw.reverse()
    items, seen = [], set()
    for fb in raw:
        mid = fb.get("msg_id")
        if mid and mid in seen:
            continue
        if mid:
            seen.add(mid)
        fb["ts_fmt"] = _fmt_ts(fb.get("ts", ""))
        items.append(fb)
    return items


def _feedback_stats(items: list) -> dict:
    """Agrega os números do topo do painel (inclui o KPI de respostas úteis)."""
    up = sum(1 for i in items if i.get("rating") == "up")
    down = sum(1 for i in items if i.get("rating") == "down")
    total = up + down
    return {
        "up": up,
        "down": down,
        "total": total,
        "helpful_pct": round(up * 100 / total) if total else None,
    }


_SCORE_RANK = {"quente": 0, "morno": 1, "frio": 2}


@app.route("/admin")
def admin():
    if not _admin_allowed():
        return "Não encontrado", 404

    query = (request.args.get("q") or "").strip()
    score_filter = (request.args.get("score") or "").strip()
    all_leads = read_leads()
    total = len(all_leads)

    # Anexa a classificação mais recente de cada lead (se houver).
    scores = read_lead_scores()
    for lead in all_leads:
        lead["score_info"] = scores.get(lead.get("user_id"))

    leads = _filter_by_email(all_leads, query)
    if score_filter in ("quente", "morno", "frio"):
        leads = [
            l for l in leads
            if l.get("score_info") and l["score_info"].get("score") == score_filter
        ]
    elif score_filter == "sort":
        # "Quentes primeiro": ordena por temperatura, preservando a
        # recência dentro de cada grupo (sort estável do Python).
        leads = sorted(
            leads,
            key=lambda l: _SCORE_RANK.get(
                (l.get("score_info") or {}).get("score"), 3
            ),
        )
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
        score_filter=score_filter,
        page=page,
        pages=pages,
    )


@app.route("/admin/export.csv")
def admin_export():
    if not _admin_allowed():
        return "Não encontrado", 404

    query = (request.args.get("q") or "").strip()
    leads = _filter_by_email(read_leads(), query)
    scores = read_lead_scores()

    buf = io.StringIO()
    buf.write("﻿")  # BOM: faz o Excel abrir os acentos corretamente
    writer = csv.writer(buf, delimiter=";")
    writer.writerow([
        "Data", "Nome", "Telefone", "E-mail", "Sessão",
        "Consentimento comunidade", "Consentimento agências",
        "Versão do consentimento",
        "Score", "Destino", "Orçamento", "Prazo", "Quer agência", "Resumo",
    ])
    for lead in leads:
        sc = scores.get(lead.get("user_id")) or {}
        writer.writerow([
            lead.get("ts_fmt", ""),
            lead.get("name", ""),
            lead.get("phone", ""),
            lead.get("email", ""),
            lead.get("session_id", ""),
            "sim" if lead.get("consent_community") else "não",
            "sim" if lead.get("consent_share_agencies") else "não",
            lead.get("consent_version", ""),
            sc.get("score", ""),
            sc.get("destino", ""),
            sc.get("orcamento", ""),
            sc.get("prazo", ""),
            "sim" if sc.get("quer_agencia") else "",
            sc.get("resumo", ""),
        ])

    filename = f"leads_{datetime.now(_BRT).strftime('%Y-%m-%d')}.csv"
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _fetch_messages(session_id: str):
    """Busca as mensagens de uma sessão no Langflow. Retorna (mensagens, erro)."""
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
        return messages, None
    except requests.RequestException as exc:
        return [], f"Não foi possível carregar a conversa: {exc}"
    except (ValueError, AttributeError):
        return [], "Resposta do Langflow em formato inesperado."


@app.route("/admin/session/<session_id>")
def admin_session(session_id):
    if not _admin_allowed():
        return "Não encontrado", 404
    messages, error = _fetch_messages(session_id)
    return render_template(
        "admin_session.html",
        session_id=session_id,
        messages=messages,
        error=error,
    )


@app.route("/admin/user/<user_id>")
def admin_user(user_id):
    if not _admin_allowed():
        return "Não encontrado", 404

    lead = next((l for l in read_leads() if l.get("user_id") == user_id), None)

    conversations, error = [], None
    for sess in sessions_for_user(user_id):
        messages, err = _fetch_messages(sess["session_id"])
        if err and not error:
            error = err
        conversations.append({
            "session_id": sess["session_id"],
            "ts": _fmt_ts(sess.get("ts", "")),
            "messages": messages,
        })

    return render_template(
        "admin_user.html",
        user_id=user_id,
        lead=lead,
        conversations=conversations,
        error=error,
    )


@app.route("/admin/feedback")
def admin_feedback():
    if not _admin_allowed():
        return "Não encontrado", 404

    rating = (request.args.get("rating") or "").strip()
    all_items = read_feedback()
    stats = _feedback_stats(all_items)

    if rating in ("up", "down"):
        items = [i for i in all_items if i.get("rating") == rating]
    else:
        items = all_items

    try:
        page = max(1, int(request.args.get("page", "1")))
    except ValueError:
        page = 1
    pages = max(1, (len(items) + PAGE_SIZE - 1) // PAGE_SIZE)
    page = min(page, pages)
    start = (page - 1) * PAGE_SIZE
    page_items = items[start:start + PAGE_SIZE]

    return render_template(
        "admin_feedback.html",
        items=page_items,
        stats=stats,
        rating=rating,
        page=page,
        pages=pages,
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=False)

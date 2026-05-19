import json
import os
import re
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

LANGFLOW_BASE_URL = os.environ["LANGFLOW_BASE_URL"]
FLOW_ID = os.environ["FLOW_ID"]
LANGFLOW_API_KEY = os.environ["LANGFLOW_API_KEY"]
MEMORY_COMPONENT_ID = os.environ["MEMORY_COMPONENT_ID"]

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


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


@app.route("/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    user_message = (body.get("message") or "").strip()
    session_id = (body.get("session_id") or "").strip()

    if not user_message:
        return jsonify({"error": "Mensagem vazia."}), 400

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
        return jsonify({"error": f"Falha ao falar com o Langflow: {exc}"}), 502
    except (KeyError, IndexError, ValueError):
        return jsonify({"error": "Resposta do Langflow em formato inesperado."}), 502

    return jsonify({"reply": reply})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=False)

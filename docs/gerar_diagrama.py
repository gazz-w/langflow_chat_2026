"""Generates the architecture diagram as a high-resolution PNG (light background)."""
from PIL import Image, ImageDraw, ImageFont
import os

# Colour palette (aligned with the app's visual identity)
ROXO_PRIMARIO = "#6A3DE8"
ROXO_CLARO = "#F0ECFD"
CINZA_ESCURO = "#1F1F1F"
CINZA_MEDIO = "#6B6B75"
CINZA_BORDA = "#D9D9D9"
FUNDO_BOX = "#FFFFFF"
COR_INTERNET = "#2A2A2D"
COR_CADDY = "#6A3DE8"
COR_FLASK = "#4A90E2"
COR_LANGFLOW = "#36B37E"

# Canvas (high resolution for crisp rendering)
LARGURA = 1700
ALTURA = 2000
MARGEM = 80
LARGURA_BOX = 1200  # centred box
OFFSET_BOX = (LARGURA - LARGURA_BOX) // 2

img = Image.new("RGB", (LARGURA, ALTURA), "white")
draw = ImageDraw.Draw(img)


# Load fonts (cross-platform: macOS, Windows, Linux; falls back to default)
def carregar_fonte(tamanho, bold=False):
    if bold:
        candidatos = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    else:
        candidatos = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for caminho in candidatos:
        if os.path.exists(caminho):
            return ImageFont.truetype(caminho, tamanho)
    return ImageFont.load_default()


f_titulo = carregar_fonte(48, bold=True)
f_subtitulo = carregar_fonte(34, bold=True)
f_corpo = carregar_fonte(28)
f_pequena = carregar_fonte(24)
f_legenda = carregar_fonte(22, bold=True)


# ──────── Helpers ────────
def caixa_arredondada(x1, y1, x2, y2, raio, fill, outline, largura_borda=4):
    draw.rounded_rectangle([x1, y1, x2, y2], radius=raio, fill=fill, outline=outline, width=largura_borda)


def texto_centralizado(texto, x_centro, y, fonte, cor):
    bbox = draw.textbbox((0, 0), texto, font=fonte)
    largura = bbox[2] - bbox[0]
    draw.text((x_centro - largura // 2, y), texto, font=fonte, fill=cor)


def seta_vertical(x, y_inicio, y_fim, label=None, label_lado="direita"):
    """Draws a vertical arrow with an optional side label."""
    cor = "#888888"
    draw.line([(x, y_inicio), (x, y_fim - 20)], fill=cor, width=4)
    draw.polygon(
        [(x - 15, y_fim - 25), (x + 15, y_fim - 25), (x, y_fim)],
        fill=cor,
    )
    if label:
        y_label = (y_inicio + y_fim) // 2 - 15
        x_label = x + 30 if label_lado == "direita" else x - 30
        bbox = draw.textbbox((0, 0), label, font=f_legenda)
        largura_label = bbox[2] - bbox[0]
        altura_label = bbox[3] - bbox[1]
        if label_lado == "esquerda":
            x_label -= largura_label
        pad = 8
        draw.rounded_rectangle(
            [x_label - pad, y_label - pad, x_label + largura_label + pad, y_label + altura_label + pad + 5],
            radius=8, fill="#F5F5F5", outline=CINZA_BORDA, width=2,
        )
        draw.text((x_label, y_label), label, font=f_legenda, fill=CINZA_MEDIO)


def caixa_componente(y_topo, altura, titulo, cor_titulo, porta, linhas_descricao, papel=None):
    x1 = OFFSET_BOX
    x2 = x1 + LARGURA_BOX
    y2 = y_topo + altura

    draw.rounded_rectangle([x1 + 6, y_topo + 6, x2 + 6, y2 + 6], radius=20, fill="#EEEEEE")
    caixa_arredondada(x1, y_topo, x2, y2, 20, fill=FUNDO_BOX, outline=cor_titulo, largura_borda=5)
    draw.rounded_rectangle([x1, y_topo, x2, y_topo + 70], radius=20, fill=cor_titulo)
    draw.rectangle([x1, y_topo + 50, x2, y_topo + 70], fill=cor_titulo)

    draw.text((x1 + 40, y_topo + 18), titulo, font=f_subtitulo, fill="white")
    if porta:
        bbox = draw.textbbox((0, 0), porta, font=f_corpo)
        largura_porta = bbox[2] - bbox[0]
        draw.text((x2 - largura_porta - 40, y_topo + 22), porta, font=f_corpo, fill="white")

    if papel:
        draw.text((x1 + 40, y2 - 50), papel, font=f_legenda, fill=CINZA_MEDIO)

    y_desc = y_topo + 100
    for linha in linhas_descricao:
        draw.text((x1 + 50, y_desc), "•  " + linha, font=f_corpo, fill=CINZA_ESCURO)
        y_desc += 50


# ──────── Title ────────
draw.text((MARGEM, 40), "Component Architecture", font=f_titulo, fill=CINZA_ESCURO)
draw.line([(MARGEM, 110), (LARGURA - MARGEM, 110)], fill=ROXO_PRIMARIO, width=4)

# ──────── Layer 1: User / Internet ────────
y_user = 170
x_user1 = LARGURA // 2 - 350
x_user2 = LARGURA // 2 + 350
caixa_arredondada(x_user1, y_user, x_user2, y_user + 140, 70, COR_INTERNET, COR_INTERNET, 4)
texto_centralizado("User / Internet", LARGURA // 2, y_user + 30, f_subtitulo, "white")
texto_centralizado("Browser (Chrome, Firefox, Safari…)", LARGURA // 2, y_user + 85, f_pequena, "#CCCCCC")

# Arrow 1 → Caddy
seta_vertical(LARGURA // 2, y_user + 140, y_user + 280, label="HTTPS (TLS 1.3)")

# ──────── Layer 2: Caddy ────────
y_caddy = y_user + 300
altura_caddy = 340
caixa_componente(
    y_caddy, altura_caddy,
    "Caddy", COR_CADDY, "ports 80/443",
    [
        "Reverse proxy (only service exposed to the internet)",
        "Automatic TLS (Let's Encrypt)",
        "Automatic certificate renewal",
        "Cloudflare Access + origin secret on admin panels",
    ],
    papel="EDGE LAYER",
)

# Arrow 2 → Flask
seta_vertical(LARGURA // 2, y_caddy + altura_caddy, y_caddy + altura_caddy + 150, label="Docker internal network")

# ──────── Layer 3: Flask ────────
y_flask = y_caddy + altura_caddy + 170
altura_flask = 340
caixa_componente(
    y_flask, altura_flask,
    "Flask + Gunicorn", COR_FLASK, "port 5000 (internal)",
    [
        "Serves the static UI (HTML/CSS/JS)",
        "POST /chat — proxies to Langflow",
        "POST /register — lead capture (GDPR)",
        "GET /rates, /convert — utilities",
    ],
    papel="APPLICATION LAYER",
)

# Arrow 3 → Langflow
seta_vertical(LARGURA // 2, y_flask + altura_flask, y_flask + altura_flask + 150, label="Docker internal network")

# ──────── Layer 4: Langflow ────────
y_langflow = y_flask + altura_flask + 170
altura_langflow = 340
caixa_componente(
    y_langflow, altura_langflow,
    "Langflow + Agent", COR_LANGFLOW, "port 7860 (internal)",
    [
        "Claude Haiku 4.5 agent (Anthropic)",
        "Session-isolated memory (session_id)",
        "System prompt & Ananda's persona",
        "RAG knowledge base + tools (extensible)",
    ],
    papel="INTELLIGENCE LAYER",
)

# ──────── Footer ────────
y_rodape = ALTURA - 100
draw.line([(MARGEM, y_rodape), (LARGURA - MARGEM, y_rodape)], fill=CINZA_BORDA, width=2)
draw.text(
    (MARGEM, y_rodape + 20),
    "Component diagram • Viajando com Ananda — AI Assistant",
    font=f_pequena, fill=CINZA_MEDIO,
)
draw.text(
    (MARGEM, y_rodape + 55),
    "viajandocomananda.com",
    font=f_legenda, fill=ROXO_PRIMARIO,
)

# Save
saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diagrama_arquitetura.png")
img.save(saida, "PNG", optimize=True)
print("Diagram generated:", saida)
print("Size:", os.path.getsize(saida) // 1024, "KB")
print("Dimensions:", LARGURA, "x", ALTURA)

"""Gera o cronograma de implantação como gráfico de Gantt (PNG)."""
from PIL import Image, ImageDraw, ImageFont
import os

# Paleta
COR_CURTO = "#6A3DE8"       # Roxo (curto prazo)
COR_MEDIO = "#4A90E2"       # Azul (médio prazo)
COR_LONGO = "#36B37E"       # Verde (longo prazo)
COR_CONCLUIDO = "#2A2A2D"   # Escuro (já concluído)
COR_TEXTO = "#1F1F1F"
COR_CINZA = "#6B6B75"
COR_GRADE = "#E0E0E0"
COR_FUNDO_FASE = "#F5F5F5"

# Canvas
LARGURA = 2200
ALTURA = 1700
MARGEM_ESQ = 480
MARGEM_DIR = 80
MARGEM_TOPO = 200
MARGEM_BASE = 100

# Linha do tempo: M0 = entrega atual, depois 12 meses
NUM_MESES = 13  # M0 a M12
LARGURA_AREA = LARGURA - MARGEM_ESQ - MARGEM_DIR
LARGURA_MES = LARGURA_AREA / NUM_MESES

img = Image.new("RGB", (LARGURA, ALTURA), "white")
draw = ImageDraw.Draw(img)

def carregar_fonte(tamanho, bold=False):
    nome = "arialbd.ttf" if bold else "arial.ttf"
    caminho = f"C:/Windows/Fonts/{nome}"
    if os.path.exists(caminho):
        return ImageFont.truetype(caminho, tamanho)
    return ImageFont.load_default()

f_titulo = carregar_fonte(40, bold=True)
f_subtitulo = carregar_fonte(26, bold=True)
f_corpo = carregar_fonte(22)
f_pequena = carregar_fonte(20)
f_legenda = carregar_fonte(18, bold=True)

# ──────── Título ────────
draw.text((80, 50), "Cronograma de Implantação — 12 meses", font=f_titulo, fill=COR_TEXTO)
draw.line([(80, 110), (LARGURA - 80, 110)], fill=COR_CURTO, width=4)
draw.text(
    (80, 130),
    "Assistente Virtual da Ananda  •  Fase atual: piloto em produção (V1 entregue)",
    font=f_corpo, fill=COR_CINZA,
)

# ──────── Cabeçalho da linha do tempo (meses) ────────
y_meses = MARGEM_TOPO - 50
for i in range(NUM_MESES):
    x = MARGEM_ESQ + i * LARGURA_MES
    label = "Hoje" if i == 0 else f"M{i}"
    bbox = draw.textbbox((0, 0), label, font=f_legenda)
    largura_label = bbox[2] - bbox[0]
    draw.text((x + LARGURA_MES // 2 - largura_label // 2, y_meses), label, font=f_legenda, fill=COR_CINZA)
    # Linha vertical da grade
    draw.line([(x, MARGEM_TOPO), (x, ALTURA - MARGEM_BASE)], fill=COR_GRADE, width=1)

# Última linha
x_final = MARGEM_ESQ + NUM_MESES * LARGURA_MES
draw.line([(x_final, MARGEM_TOPO), (x_final, ALTURA - MARGEM_BASE)], fill=COR_GRADE, width=1)

# Faixas coloridas de fundo das fases (curto / médio / longo)
def faixa_fase(mes_inicio, mes_fim, cor):
    x1 = MARGEM_ESQ + mes_inicio * LARGURA_MES
    x2 = MARGEM_ESQ + mes_fim * LARGURA_MES
    overlay = Image.new("RGBA", (LARGURA, ALTURA), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle([x1, MARGEM_TOPO, x2, ALTURA - MARGEM_BASE], fill=cor + (25,))
    img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

# Não vou usar overlay (complicaria — uso retângulos simples com cores muito claras)
def faixa_fase_simples(mes_inicio, mes_fim, cor_clara, titulo):
    x1 = MARGEM_ESQ + mes_inicio * LARGURA_MES
    x2 = MARGEM_ESQ + mes_fim * LARGURA_MES
    draw.rectangle([x1, MARGEM_TOPO - 25, x2, MARGEM_TOPO - 5], fill=cor_clara)
    draw.text((x1 + 15, MARGEM_TOPO - 23), titulo, font=f_legenda, fill="white")

faixa_fase_simples(0, 3, COR_CURTO, "CURTO PRAZO (M1–M3)")
faixa_fase_simples(3, 6, COR_MEDIO, "MÉDIO PRAZO (M4–M6)")
faixa_fase_simples(6, 13, COR_LONGO, "LONGO PRAZO (M7–M12)")

# ──────── Atividades (barras) ────────
# Lista: (nome, mes_inicio, mes_fim, cor, marco)
atividades = [
    ("V1 em produção (concluída)",              0, 0.3, COR_CONCLUIDO, True),
    ("RAG — base de conhecimento da Ananda",    1, 3,   COR_CURTO,     False),
    ("Refinamento do system prompt",            1, 2,   COR_CURTO,     False),
    ("Teste beta com 20–50 seguidores",         2, 3,   COR_CURTO,     False),
    ("Instrumentação de analytics (KPIs)",      2, 3,   COR_CURTO,     False),
    ("Lançamento público nas redes da Ananda",  3, 3.3, COR_MEDIO,     True),
    ("Integração com WhatsApp Business",        4, 6,   COR_MEDIO,     False),
    ("Tool de web search no Agent",             4, 5,   COR_MEDIO,     False),
    ("Dashboard interno de KPIs",               5, 6,   COR_MEDIO,     False),
    ("Campanha com agências parceiras",         5, 7,   COR_MEDIO,     False),
    ("Expansão Instagram DM e Telegram",        7, 9,   COR_LONGO,     False),
    ("Modelo de afiliação (comissão)",          8, 10,  COR_LONGO,     False),
    ("Multi-tenant para outras criadoras",      9, 12,  COR_LONGO,     False),
    ("Versão PWA mobile",                      10, 12,  COR_LONGO,     False),
]

altura_linha = (ALTURA - MARGEM_TOPO - MARGEM_BASE) / len(atividades)
altura_barra = altura_linha * 0.55

for i, (nome, m_ini, m_fim, cor, marco) in enumerate(atividades):
    y_centro = MARGEM_TOPO + i * altura_linha + altura_linha / 2

    # Linha pontilhada horizontal de fundo
    for x in range(MARGEM_ESQ, LARGURA - MARGEM_DIR, 6):
        draw.line([(x, y_centro), (x + 2, y_centro)], fill="#EEEEEE", width=1)

    # Nome da atividade (rótulo à esquerda)
    bbox = draw.textbbox((0, 0), nome, font=f_corpo)
    altura_texto = bbox[3] - bbox[1]
    draw.text((30, y_centro - altura_texto // 2 - 3), nome, font=f_corpo, fill=COR_TEXTO)

    # Barra
    x1 = MARGEM_ESQ + m_ini * LARGURA_MES + 4
    x2 = MARGEM_ESQ + m_fim * LARGURA_MES - 4
    y1 = y_centro - altura_barra // 2
    y2 = y_centro + altura_barra // 2

    if marco:
        # Marco como losango
        cx = (x1 + x2) / 2
        size = altura_barra / 2 + 4
        draw.polygon(
            [(cx, y_centro - size), (cx + size, y_centro), (cx, y_centro + size), (cx - size, y_centro)],
            fill=cor,
        )
    else:
        # Barra arredondada
        draw.rounded_rectangle([x1, y1, x2, y2], radius=int(altura_barra // 3), fill=cor)

# ──────── Rodapé com legenda ────────
y_legenda = ALTURA - 60
draw.line([(80, y_legenda - 20), (LARGURA - 80, y_legenda - 20)], fill=COR_GRADE, width=1)

def quadrado_legenda(x, y, cor, texto, marco=False):
    if marco:
        size = 10
        cx, cy = x + 10, y + 10
        draw.polygon(
            [(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)],
            fill=cor,
        )
    else:
        draw.rounded_rectangle([x, y, x + 20, y + 20], radius=4, fill=cor)
    draw.text((x + 32, y - 2), texto, font=f_pequena, fill=COR_CINZA)

quadrado_legenda(80, y_legenda, COR_CONCLUIDO, "Concluído")
quadrado_legenda(280, y_legenda, COR_CURTO, "Curto prazo")
quadrado_legenda(500, y_legenda, COR_MEDIO, "Médio prazo")
quadrado_legenda(720, y_legenda, COR_LONGO, "Longo prazo")
quadrado_legenda(940, y_legenda, COR_CURTO, "Marco/Milestone", marco=True)

saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cronograma_implantacao.png")
img.save(saida, "PNG", optimize=True)
print("Cronograma gerado:", saida)
print("Tamanho:", os.path.getsize(saida) // 1024, "KB")

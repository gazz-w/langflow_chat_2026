// Gera o documento "Sistematização 1" do PI III
// Uso: node gerar_sistematizacao_1.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageBreak,
  PageNumber, ImageRun,
} = require('docx');

// ──────── Paleta ────────
const COR_PRIMARIA = "6A3DE8";
const COR_SECUNDARIA = "2A2A2D";
const COR_TEXTO = "1F1F1F";
const COR_BORDA = "D9D9D9";
const COR_DESTAQUE = "F0ECFD";
const COR_CURTO = "6A3DE8";
const COR_MEDIO = "4A90E2";
const COR_LONGO = "36B37E";

const borda = (cor = COR_BORDA) => ({ style: BorderStyle.SINGLE, size: 4, color: cor });
const bordasCompletas = (cor = COR_BORDA) => ({
  top: borda(cor), bottom: borda(cor), left: borda(cor), right: borda(cor),
});

const p = (texto, opts = {}) => new Paragraph({
  spacing: { after: 120, ...(opts.spacing || {}) },
  alignment: opts.alignment,
  children: [new TextRun({ text: texto, ...opts.run })],
  ...opts.extra,
});

const pMulti = (runs, opts = {}) => new Paragraph({
  spacing: { after: 120, ...(opts.spacing || {}) },
  alignment: opts.alignment,
  children: runs,
});

const h1 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text: texto })],
});

const h2 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 160 },
  children: [new TextRun({ text: texto })],
});

const h3 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 120 },
  children: [new TextRun({ text: texto })],
});

const bullet = (texto, runsExtras = []) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text: texto }), ...runsExtras],
});

const link = (texto, url) => new ExternalHyperlink({
  children: [new TextRun({ text: texto, style: "Hyperlink", color: COR_PRIMARIA, underline: {} })],
  link: url,
});

const quebraPagina = () => new Paragraph({ children: [new PageBreak()] });

const celula = ({ texto, runs, bold = false, fundo, largura, alinhamento, paragrafos }) => new TableCell({
  borders: bordasCompletas(),
  width: { size: largura, type: WidthType.DXA },
  shading: fundo ? { fill: fundo, type: ShadingType.CLEAR } : undefined,
  margins: { top: 100, bottom: 100, left: 140, right: 140 },
  children: paragrafos || [new Paragraph({
    alignment: alinhamento,
    children: runs || [new TextRun({ text: texto || "", bold })],
  })],
});

const linhaTabela = (cels) => new TableRow({ children: cels });

const cabecalhoTabela = (titulos, larguras, corFundo = COR_PRIMARIA) => new TableRow({
  tableHeader: true,
  children: titulos.map((t, i) => celula({
    fundo: corFundo, largura: larguras[i], alinhamento: AlignmentType.CENTER,
    runs: [new TextRun({ text: t, bold: true, color: "FFFFFF" })],
  })),
});

// ──────── Capa ────────
const capa = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text: "CENTRO UNIVERSITÁRIO DE BRASÍLIA", bold: true, size: 24, color: COR_SECUNDARIA })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 },
    children: [new TextRun({ text: "PROJETO INTEGRADOR III", size: 22, color: COR_SECUNDARIA })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Sistematização 1", bold: true, size: 36, color: COR_PRIMARIA })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 },
    children: [new TextRun({ text: "Plano de Implantação e Definição de KPIs", size: 28, color: COR_SECUNDARIA })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "Assistente Virtual da Ananda", bold: true, size: 32, color: COR_TEXTO })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 2400 },
    children: [new TextRun({ text: "Chatbot de Intercâmbio com Inteligência Artificial", italics: true, size: 24, color: COR_SECUNDARIA })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Aluno: Gabriel Shimabuko", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Professor: Ricardo Neiva", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 },
    children: [new TextRun({ text: "Brasília — Maio de 2026", size: 24 })] }),
  quebraPagina(),
];

// ──────── Sumário Executivo ────────
const sumarioExec = [
  h1("Sumário Executivo"),
  p("Este documento detalha o plano de implantação e os indicadores de desempenho (KPIs) definidos para a Assistente Virtual da Ananda — chatbot de intercâmbio com inteligência artificial desenvolvido como Projeto Integrador III."),
  p("Diferentemente de soluções ainda em fase conceitual, esta proposta parte de uma vantagem competitiva relevante: o produto V1 já está em produção, com aplicação acessível publicamente em viajandocomananda.com, domínio próprio, certificado HTTPS válido e infraestrutura containerizada. Isso significa que o plano de implantação descrito a seguir não trata de \"como construir\", mas sim de \"como evoluir, lançar comercialmente e mensurar o impacto\" de uma solução já entregue."),
  new Paragraph({
    spacing: { before: 200, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: COR_DESTAQUE },
    border: { top: borda(COR_PRIMARIA), bottom: borda(COR_PRIMARIA), left: borda(COR_PRIMARIA), right: borda(COR_PRIMARIA) },
    children: [
      new TextRun({ text: "Status atual:  ", bold: true }),
      new TextRun({ text: "V1 em produção  •  Aplicação ativa em " }),
      link("https://viajandocomananda.com", "https://viajandocomananda.com"),
    ],
  }),
  h2("Estrutura do documento"),
  bullet("Parte I — Plano de Implantação: etapas, cronograma de 12 meses, recursos necessários e plano de comunicação/treinamento."),
  bullet("Parte II — Métricas e KPIs: indicadores em seis categorias com metas quantificadas e descrição da forma de mensuração."),
  bullet("Anexos: links da aplicação, repositório e referências técnicas."),
  quebraPagina(),
];

// ============================================================
//                  PARTE I — PLANO DE IMPLANTAÇÃO
// ============================================================
const parteI = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text: "PARTE I", bold: true, size: 28, color: COR_PRIMARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Plano de Implantação", bold: true, size: 44, color: COR_TEXTO })],
  }),

  h1("1. Visão Geral do Plano"),
  p("O plano de implantação está organizado em quatro fases sequenciais, distribuídas ao longo de 12 meses. A Fase 1 (V1 em produção) já foi concluída e serve como base técnica para todas as fases subsequentes. As fases seguintes foram pensadas para atender o ciclo natural de maturação de um produto digital: validação restrita, lançamento controlado, escala e diversificação."),
  h2("1.1. Premissas adotadas"),
  bullet("A aplicação V1 já cobre o caso de uso principal (responder dúvidas sobre intercâmbio e capturar leads) e está estável em produção."),
  bullet("A persona-alvo são jovens brasileiros de 18 a 35 anos, seguidores da Ananda em redes sociais (Instagram, TikTok)."),
  bullet("O canal primário de divulgação serão as redes sociais da própria Ananda — não há necessidade de investimento em mídia paga na fase inicial."),
  bullet("O modelo de monetização planejado é por afiliação com agências de intercâmbio parceiras (comissão sobre leads convertidos)."),
  bullet("O orçamento é restrito (~US$ 7/mês na fase atual), exigindo decisões de arquitetura que privilegiem custo-benefício."),
  quebraPagina(),

  // ──────── 2. Etapas de Implantação ────────
  h1("2. Etapas de Implantação"),
  p("A implantação foi dividida em quatro fases, cada uma com escopo, entregáveis e critérios de saída claros. A passagem de uma fase para a seguinte só ocorre quando os critérios de saída forem atendidos — o que evita avançar em escala antes de validar o produto."),

  h2("2.1. Fase 1 — V1 em Produção (CONCLUÍDA)"),
  p("Fase concluída antes desta entrega. Estabeleceu a fundação técnica de todo o projeto."),
  h3("Entregáveis realizados"),
  bullet("Aplicação web responsiva (tema claro/escuro) acessível em viajandocomananda.com."),
  bullet("Backend Flask + Gunicorn em container Docker."),
  bullet("Motor de IA via Langflow com Agent Claude Haiku 4.5 (Anthropic)."),
  bullet("Proxy reverso Caddy com HTTPS automático (Let's Encrypt)."),
  bullet("Cadastro com consentimento LGPD-compliant (opt-in separado por finalidade)."),
  bullet("Painel administrativo do Langflow protegido por basic_auth em subdomínio próprio."),
  bullet("Infraestrutura em VPS Hetzner CX23 com firewall UFW e backups diários automáticos."),

  h2("2.2. Fase 2 — Piloto e Refinamento (M1 a M3)"),
  p("Foco em maturar o produto antes do lançamento público. Refinamentos baseados em uso real, mas em escala controlada para permitir iteração rápida."),
  h3("Entregáveis"),
  bullet("RAG (Retrieval-Augmented Generation): indexação vetorial do conteúdo da Ananda (transcrições de vídeos, posts, FAQs)."),
  bullet("Refinamento do system prompt: tom de voz, vocabulário, estrutura de resposta padronizada."),
  bullet("Instrumentação de analytics (Plausible) para coleta dos KPIs definidos na Parte II."),
  bullet("Convite a 20–50 seguidores selecionados para uso beta."),
  bullet("Coleta de feedback estruturado via formulário pós-conversa."),
  h3("Critério de saída"),
  bullet("NPS (Net Promoter Score) >= 50 entre os usuários beta."),
  bullet("Taxa de respostas marcadas como \"úteis\" pelo usuário >= 70%."),
  bullet("Zero incidentes críticos (indisponibilidade > 1h) registrados."),

  h2("2.3. Fase 3 — Lançamento Público e Expansão (M4 a M6)"),
  p("Lançamento amplo nas redes sociais da Ananda e expansão dos canais de acesso."),
  h3("Entregáveis"),
  bullet("Anúncio oficial no Instagram e TikTok da Ananda (stories, posts e reels)."),
  bullet("Integração com WhatsApp Business API para atendimento via WhatsApp."),
  bullet("Adição da tool de Web Search ao Agent (Tavily ou Serper) para informações sempre atualizadas."),
  bullet("Dashboard interno de KPIs (Metabase ou Grafana) com leituras automáticas dos indicadores."),
  bullet("Primeira campanha conjunta com agências de intercâmbio parceiras."),
  h3("Critério de saída"),
  bullet("Pelo menos 500 cadastros únicos no leads.jsonl."),
  bullet("Pelo menos 10 leads convertidos em contato comercial com agências."),
  bullet("Custo médio por sessão <= R$ 0,15 (mantendo viabilidade da operação)."),

  h2("2.4. Fase 4 — Escala e Monetização (M7 a M12)"),
  p("Diversificação dos canais, modelo de monetização ativo e exploração de novos mercados/segmentos."),
  h3("Entregáveis"),
  bullet("Expansão para Instagram DM e Telegram via integrações próprias."),
  bullet("Modelo de afiliação formalizado com 3+ agências, com tracking de conversão."),
  bullet("Plataforma multi-tenant: licenciamento da solução para outras criadoras de conteúdo do segmento de intercâmbio/turismo."),
  bullet("Versão PWA (Progressive Web App) com instalação no celular."),
  h3("Critério de saída"),
  bullet("Receita recorrente de afiliação cobrindo 100% do custo operacional."),
  bullet("Pelo menos uma outra criadora utilizando a plataforma em modelo multi-tenant."),
  quebraPagina(),

  // ──────── 3. Cronograma ────────
  h1("3. Cronograma de Implantação"),
  p("O cronograma a seguir apresenta as atividades planejadas distribuídas em 12 meses, organizadas pelas três faixas temporais solicitadas (curto, médio e longo prazo). Marcos importantes estão destacados como losangos coloridos."),

  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(path.join(__dirname, "cronograma_implantacao.png")),
      transformation: { width: 600, height: 460 },
      altText: {
        title: "Cronograma de Implantação",
        description: "Gráfico de Gantt mostrando 14 atividades distribuídas em curto, médio e longo prazo ao longo de 12 meses.",
        name: "cronograma",
      },
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 280 },
    children: [new TextRun({
      text: "Figura 1 — Cronograma de implantação em 12 meses (formato Gantt).",
      italics: true, size: 18, color: "6B6B75",
    })],
  }),

  h2("3.1. Resumo por faixa temporal"),

  h3("Curto prazo (M1 a M3): Validação"),
  p("Foco em maturar o produto com usuários reais, em volume controlado. Não há lançamento público nesta fase. O objetivo é evitar comprometer a reputação da Ananda lançando um chatbot que ainda apresenta respostas inadequadas — investir na qualidade primeiro."),

  h3("Médio prazo (M4 a M6): Lançamento e instrumentação"),
  p("Anúncio público, primeiros canais alternativos (WhatsApp) e construção de visibilidade operacional via dashboard de KPIs. É a fase em que o produto começa a gerar valor comercial mensurável."),

  h3("Longo prazo (M7 a M12): Escala e monetização"),
  p("Diversificação para novos canais, formalização do modelo de receita e exploração de novos mercados (multi-tenant). É a fase em que o projeto deixa de ser um experimento acadêmico e passa a operar como um produto sustentável."),
  quebraPagina(),

  // ──────── 4. Recursos ────────
  h1("4. Recursos Necessários"),
  p("Os recursos foram dimensionados de forma conservadora, refletindo a realidade de um projeto que começa enxuto e cresce conforme valida hipóteses. A maior parte dos custos só aumenta após a Fase 3, quando há tráfego suficiente para justificar."),

  h2("4.1. Recursos Humanos"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2200, 2400, 4426],
    rows: [
      cabecalhoTabela(["Papel", "Quem", "Responsabilidade"], [2200, 2400, 4426]),
      linhaTabela([
        celula({ texto: "Product / Dev", largura: 2200 }),
        celula({ texto: "Gabriel Shimabuko", largura: 2400 }),
        celula({ texto: "Desenvolvimento, infraestrutura, manutenção, integrações, evolução do flow de IA.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ texto: "Conteúdo e voz", largura: 2200 }),
        celula({ texto: "Ananda (parceira)", largura: 2400 }),
        celula({ texto: "Fornecer base de conhecimento (vídeos, transcrições, FAQs), validar tom de voz, divulgar nas redes.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ texto: "Validação técnica", largura: 2200 }),
        celula({ texto: "Agências parceiras", largura: 2400 }),
        celula({ texto: "Conferir precisão das respostas sobre vistos, custos e processos de imigração.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ texto: "Beta-testers", largura: 2200 }),
        celula({ texto: "20–50 seguidores selecionados", largura: 2400 }),
        celula({ texto: "Usar a aplicação durante a Fase 2 e responder formulário de feedback estruturado.", largura: 4426 }),
      ]),
    ],
  }),

  h2("4.2. Recursos Técnicos"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2500, 2200, 4326],
    rows: [
      cabecalhoTabela(["Recurso", "Status", "Função"], [2500, 2200, 4326]),
      linhaTabela([
        celula({ texto: "VPS Hetzner CX23", largura: 2500 }),
        celula({ texto: "Ativo", largura: 2200 }),
        celula({ texto: "Servidor de produção (2 vCPU, 4 GB RAM).", largura: 4326 }),
      ]),
      linhaTabela([
        celula({ texto: "Domínio + Cloudflare", largura: 2500 }),
        celula({ texto: "Ativo", largura: 2200 }),
        celula({ texto: "viajandocomananda.com com DNS e proteção.", largura: 4326 }),
      ]),
      linhaTabela([
        celula({ texto: "API Claude (Anthropic)", largura: 2500 }),
        celula({ texto: "Ativo (Haiku 4.5)", largura: 2200 }),
        celula({ texto: "Motor de IA generativa para as respostas.", largura: 4326 }),
      ]),
      linhaTabela([
        celula({ texto: "Banco vetorial", largura: 2500 }),
        celula({ texto: "M1 — a contratar", largura: 2200 }),
        celula({ texto: "Pinecone Free Tier ou Qdrant self-hosted para o RAG.", largura: 4326 }),
      ]),
      linhaTabela([
        celula({ texto: "API Tavily/Serper", largura: 2500 }),
        celula({ texto: "M4 — a contratar", largura: 2200 }),
        celula({ texto: "Web search tool para o Agent.", largura: 4326 }),
      ]),
      linhaTabela([
        celula({ texto: "WhatsApp Business API", largura: 2500 }),
        celula({ texto: "M4 — a contratar", largura: 2200 }),
        celula({ texto: "Canal alternativo de atendimento (via Twilio).", largura: 4326 }),
      ]),
      linhaTabela([
        celula({ texto: "Analytics (Plausible)", largura: 2500 }),
        celula({ texto: "M1 — a contratar", largura: 2200 }),
        celula({ texto: "Métricas de navegação e funil de cadastro.", largura: 4326 }),
      ]),
    ],
  }),

  h2("4.3. Recursos Financeiros"),
  p("Os custos a seguir representam a previsão para uma operação em regime, considerando volumes médios. Em meses de baixo tráfego, os valores variáveis (Claude API, Tavily) podem ser proporcionalmente menores."),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [3000, 1800, 1800, 2426],
    rows: [
      cabecalhoTabela(["Item", "Fase atual", "Fase 4 (escala)", "Tipo de custo"], [3000, 1800, 1800, 2426]),
      linhaTabela([
        celula({ texto: "Servidor VPS (Hetzner)", largura: 3000 }),
        celula({ texto: "R$ 30/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 60/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Fixo", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "Backups automáticos", largura: 3000 }),
        celula({ texto: "R$ 6/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 12/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Fixo", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "Domínio (.com Cloudflare)", largura: 3000 }),
        celula({ texto: "R$ 5/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 5/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Fixo (anual)", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "Claude API (Anthropic)", largura: 3000 }),
        celula({ texto: "R$ 20/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 400/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Variável (por uso)", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "Banco vetorial (Pinecone Free)", largura: 3000 }),
        celula({ texto: "R$ 0/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 350/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Variável", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "Web search (Tavily)", largura: 3000 }),
        celula({ texto: "R$ 0/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 100/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Variável", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "WhatsApp Business (Twilio)", largura: 3000 }),
        celula({ texto: "R$ 0/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 200/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Variável", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ texto: "Analytics (Plausible)", largura: 3000 }),
        celula({ texto: "R$ 50/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "R$ 50/mês", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Fixo", largura: 2426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: COR_DESTAQUE, largura: 3000, runs: [new TextRun({ text: "TOTAL ESTIMADO", bold: true })] }),
        celula({ fundo: COR_DESTAQUE, largura: 1800, alinhamento: AlignmentType.CENTER, runs: [new TextRun({ text: "~R$ 110/mês", bold: true })] }),
        celula({ fundo: COR_DESTAQUE, largura: 1800, alinhamento: AlignmentType.CENTER, runs: [new TextRun({ text: "~R$ 1.180/mês", bold: true })] }),
        celula({ fundo: COR_DESTAQUE, largura: 2426 }),
      ]),
    ],
  }),
  p("O custo na Fase 4 deve ser amplamente coberto pela receita de afiliação com agências parceiras. Um único intercâmbio fechado, com comissão típica de R$ 1.500 a R$ 3.000, paga vários meses de operação."),
  quebraPagina(),

  // ──────── 5. Plano de Comunicação e Treinamento ────────
  h1("5. Plano de Comunicação e Treinamento"),
  h2("5.1. Comunicação com Usuários Finais"),
  p("A divulgação foi pensada para aproveitar o canal natural do projeto: as redes sociais da própria Ananda. Não há investimento em mídia paga na fase de lançamento, o que mantém o custo de aquisição (CAC) muito baixo."),

  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2000, 2400, 4626],
    rows: [
      cabecalhoTabela(["Momento", "Canal", "Mensagem-chave"], [2000, 2400, 4626]),
      linhaTabela([
        celula({ texto: "M2 (Pré-lançamento)", largura: 2000 }),
        celula({ texto: "Stories Instagram", largura: 2400 }),
        celula({ texto: "Convite para grupo beta: \"Estou criando uma assistente virtual sobre intercâmbio. Quem quer testar antes de todo mundo?\"", largura: 4626 }),
      ]),
      linhaTabela([
        celula({ texto: "M4 (Lançamento oficial)", largura: 2000 }),
        celula({ texto: "Reel + Post Instagram + TikTok", largura: 2400 }),
        celula({ texto: "Vídeo demonstrativo: Ananda apresentando o link e fazendo perguntas reais ao chatbot.", largura: 4626 }),
      ]),
      linhaTabela([
        celula({ texto: "M4–M6 (Manutenção de awareness)", largura: 2000 }),
        celula({ texto: "Stories recorrentes", largura: 2400 }),
        celula({ texto: "Sequências mensais: \"Sabia que vocês podem perguntar para a minha assistente sobre…\"", largura: 4626 }),
      ]),
      linhaTabela([
        celula({ texto: "M5 (Expansão WhatsApp)", largura: 2000 }),
        celula({ texto: "Link na bio + Stories", largura: 2400 }),
        celula({ texto: "Anúncio do canal de WhatsApp como alternativa à versão web.", largura: 4626 }),
      ]),
      linhaTabela([
        celula({ texto: "Campanhas com agências (M5+)", largura: 2000 }),
        celula({ texto: "Co-marketing", largura: 2400 }),
        celula({ texto: "Conteúdo conjunto com agências parceiras, sempre com chamada para o chatbot.", largura: 4626 }),
      ]),
    ],
  }),

  h2("5.2. Treinamento Interno (Ananda)"),
  p("A Ananda é a operadora não-técnica do produto. Ela precisa conseguir ajustar pequenos detalhes da assistente sem depender do desenvolvedor para cada mudança."),
  h3("Conteúdo do treinamento (sessão única de ~90 minutos)"),
  bullet("Como acessar o painel administrativo (langflow.viajandocomananda.com)."),
  bullet("Como visualizar e editar o system prompt do Agent."),
  bullet("Como testar uma mudança no Playground antes de salvar."),
  bullet("Como adicionar novos documentos à base de conhecimento (RAG) — drag-and-drop no Langflow."),
  bullet("Como interpretar o dashboard de KPIs."),
  bullet("Procedimentos básicos de emergência: como acionar o desenvolvedor."),
  h3("Materiais de apoio entregues"),
  bullet("Vídeo de 10 minutos com walkthrough do painel."),
  bullet("Guia em PDF com capturas de tela para cada operação."),
  bullet("Canal direto de WhatsApp para dúvidas pontuais."),

  h2("5.3. Documentação Técnica"),
  p("Toda a documentação técnica do projeto é mantida no repositório GitHub e é parte integrante da entrega. Isto garante que outros desenvolvedores possam dar continuidade ao projeto caso necessário."),
  bullet("README.md com instruções de setup e deploy."),
  bullet("Comentários em código nos pontos de decisão arquitetural relevantes (escopo de memória, escape de variáveis no Caddyfile, etc.)."),
  bullet("Histórico de commits descritivo, narrando a evolução do projeto."),
  quebraPagina(),
];

// ============================================================
//                PARTE II — MÉTRICAS E KPIs
// ============================================================
const parteII = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text: "PARTE II", bold: true, size: 28, color: COR_PRIMARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Métricas e KPIs", bold: true, size: 44, color: COR_TEXTO })],
  }),

  h1("6. Estratégia de Mensuração"),
  p("A escolha de KPIs partiu de uma reflexão sobre o que precisa ser verdade para o projeto ser considerado bem-sucedido em cada uma de suas dimensões: técnica, de usuário, de negócio e operacional."),
  p("Os 15 indicadores definidos foram organizados em seis categorias temáticas. Cada categoria responde a uma pergunta de negócio diferente:"),
  bullet("Adoção — Quantas pessoas estão chegando e completando o cadastro?"),
  bullet("Engajamento — Os usuários voltam? Conversam profundamente?"),
  bullet("Performance Técnica — O sistema responde rápido e fica estável?"),
  bullet("Qualidade de Resposta — A IA realmente ajuda?"),
  bullet("Negócio e Conversão — O projeto gera valor comercial?"),
  bullet("Operacional — Quanto custa operar? Está dentro do orçamento?"),

  h2("6.1. Frequência de mensuração"),
  bullet("Tempo real (em dashboard): performance técnica, custo do dia."),
  bullet("Diária: adoção, engajamento, qualidade."),
  bullet("Semanal: conversão comercial."),
  bullet("Mensal: análise consolidada com cruzamento entre categorias."),

  h2("6.2. Ferramentas adotadas"),
  bullet("Plausible Analytics — métricas de navegação e funil de cadastro (cookieless, LGPD-friendly)."),
  bullet("leads.jsonl — fonte de verdade para cadastros e consentimentos."),
  bullet("Logs estruturados do Flask — tempos de resposta e erros."),
  bullet("Dashboard do Anthropic Console — consumo da API Claude."),
  bullet("Metabase (a partir do M5) — dashboard unificado de KPIs."),
  quebraPagina(),

  // ──────── 7. KPIs ────────
  h1("7. Tabela Mestre de KPIs"),
  p("A tabela a seguir apresenta os 15 indicadores definidos, com sua meta quantificada e a forma de mensuração. Os números de meta foram calibrados considerando o porte do projeto (audiência da Ananda no Instagram) e benchmarks da indústria para produtos digitais em fase de lançamento."),

  // Categoria 1: Adoção
  h2("7.1. Categoria — Adoção"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 2200, 4426],
    rows: [
      cabecalhoTabela(["KPI", "Meta (6 meses)", "Forma de mensuração"], [2400, 2200, 4426], COR_CURTO),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Visitantes únicos / mês", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 3.000 a partir do M4", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Plausible Analytics — métrica nativa \"Unique visitors\".", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Taxa de conclusão do cadastro", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 35%", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "(Cadastros em leads.jsonl ÷ Visitantes únicos) × 100. Apurado semanalmente.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Cadastros totais acumulados", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 1.000 até o M6", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Contagem de linhas em leads.jsonl. Apurado mensalmente.", largura: 4426 }),
      ]),
    ],
  }),

  // Categoria 2: Engajamento
  h2("7.2. Categoria — Engajamento"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 2200, 4426],
    rows: [
      cabecalhoTabela(["KPI", "Meta (6 meses)", "Forma de mensuração"], [2400, 2200, 4426], COR_CURTO),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Mensagens por sessão", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 4 mensagens em média", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Logs do Flask. Agrupado por session_id. Apurado semanalmente.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Taxa de retorno (D7)", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 20%", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Proporção de usuários cadastrados que retornam ao site dentro de 7 dias. Apurado via Plausible com identificador anônimo.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Duração média da sessão", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 3 minutos", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Plausible Analytics — métrica nativa \"Visit duration\".", largura: 4426 }),
      ]),
    ],
  }),

  // Categoria 3: Performance Técnica
  h2("7.3. Categoria — Performance Técnica"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 2200, 4426],
    rows: [
      cabecalhoTabela(["KPI", "Meta", "Forma de mensuração"], [2400, 2200, 4426], COR_MEDIO),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Tempo médio de resposta", bold: true })], largura: 2400 }),
        celula({ texto: "≤ 4 segundos (p50)", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Tempo entre POST /chat e retorno do Flask. Logs estruturados com mediana e p95. Monitorado em tempo real.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Disponibilidade (uptime)", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 99,5% mensal", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "UptimeRobot com check a cada 5 minutos. Relatório mensal automático.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Taxa de erro (5xx)", bold: true })], largura: 2400 }),
        celula({ texto: "≤ 0,5%", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Logs do Flask filtrados por status >= 500, dividido pelo total de requests. Apurado diariamente.", largura: 4426 }),
      ]),
    ],
  }),

  // Categoria 4: Qualidade de Resposta
  h2("7.4. Categoria — Qualidade de Resposta"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 2200, 4426],
    rows: [
      cabecalhoTabela(["KPI", "Meta", "Forma de mensuração"], [2400, 2200, 4426], COR_MEDIO),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Taxa de respostas úteis", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 70%", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Feedback inline (botões 👍/👎 a serem adicionados no M2) ao final de cada resposta. (Total 👍 ÷ Total avaliações) × 100.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "NPS (Net Promoter Score)", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 50", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Formulário trimestral aos usuários cadastrados: \"De 0 a 10, quanto recomendaria a assistente da Ananda?\". % Promotores - % Detratores.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Taxa de fallback (\"não sei\")", bold: true })], largura: 2400 }),
        celula({ texto: "≤ 10%", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Detecção por palavras-chave nas respostas do bot (\"não tenho essa informação\", \"recomendo procurar\"). Apurado semanalmente — alta taxa indica falha do RAG.", largura: 4426 }),
      ]),
    ],
  }),

  // Categoria 5: Negócio e Conversão
  h2("7.5. Categoria — Negócio e Conversão"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 2200, 4426],
    rows: [
      cabecalhoTabela(["KPI", "Meta (12 meses)", "Forma de mensuração"], [2400, 2200, 4426], COR_LONGO),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Leads autorizados (compartilhamento com agências)", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 250 cumulativos", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Contagem de cadastros com consent_share_agencies = true em leads.jsonl.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Conversões em intercâmbio fechado", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 8 conversões", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Reporte mensal das agências parceiras sobre leads encaminhados que viraram contrato.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Receita de afiliação acumulada", bold: true })], largura: 2400 }),
        celula({ texto: "≥ R$ 20.000", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Soma das comissões repassadas pelas agências (registro contábil).", largura: 4426 }),
      ]),
    ],
  }),

  // Categoria 6: Operacional
  h2("7.6. Categoria — Operacional"),
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 2200, 4426],
    rows: [
      cabecalhoTabela(["KPI", "Meta", "Forma de mensuração"], [2400, 2200, 4426], COR_LONGO),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Custo médio por sessão", bold: true })], largura: 2400 }),
        celula({ texto: "≤ R$ 0,15", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "(Custo total da Claude API no mês ÷ número de sessões únicas no mês). Apurado mensalmente via dashboard da Anthropic.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "ROI operacional", bold: true })], largura: 2400 }),
        celula({ texto: "≥ 1,0 a partir do M9", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "(Receita de afiliação do mês ÷ Custo operacional total do mês). Apurado mensalmente.", largura: 4426 }),
      ]),
      linhaTabela([
        celula({ runs: [new TextRun({ text: "Conformidade LGPD", bold: true })], largura: 2400 }),
        celula({ texto: "100% (zero não-conformidades)", largura: 2200, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Auditoria trimestral: amostragem de 30 leads para verificar se possuem consent_version, timestamp e flags consistentes.", largura: 4426 }),
      ]),
    ],
  }),
  quebraPagina(),

  // ──────── 8. Painel de KPIs ────────
  h1("8. Painel de Controle (Resumo)"),
  p("A tabela abaixo consolida os 15 KPIs em um painel único, agrupados por categoria, com seu nível de prioridade. Esta visão permite uma leitura rápida do estado geral do projeto."),

  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2200, 3600, 1800, 1426],
    rows: [
      cabecalhoTabela(["Categoria", "Indicador", "Meta", "Prioridade"], [2200, 3600, 1800, 1426]),

      linhaTabela([
        celula({ fundo: "F8F4FF", largura: 2200, runs: [new TextRun({ text: "Adoção", bold: true, color: COR_CURTO })] }),
        celula({ texto: "Visitantes únicos / mês", largura: 3600 }),
        celula({ texto: "≥ 3.000 (M4+)", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "F8F4FF", largura: 2200, runs: [new TextRun({ text: "Adoção", bold: true, color: COR_CURTO })] }),
        celula({ texto: "Taxa de conclusão do cadastro", largura: 3600 }),
        celula({ texto: "≥ 35%", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "F8F4FF", largura: 2200, runs: [new TextRun({ text: "Adoção", bold: true, color: COR_CURTO })] }),
        celula({ texto: "Cadastros totais acumulados", largura: 3600 }),
        celula({ texto: "≥ 1.000 (M6)", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),

      linhaTabela([
        celula({ fundo: "F8F4FF", largura: 2200, runs: [new TextRun({ text: "Engajamento", bold: true, color: COR_CURTO })] }),
        celula({ texto: "Mensagens por sessão", largura: 3600 }),
        celula({ texto: "≥ 4 em média", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "F8F4FF", largura: 2200, runs: [new TextRun({ text: "Engajamento", bold: true, color: COR_CURTO })] }),
        celula({ texto: "Taxa de retorno (D7)", largura: 3600 }),
        celula({ texto: "≥ 20%", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Média", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "F8F4FF", largura: 2200, runs: [new TextRun({ text: "Engajamento", bold: true, color: COR_CURTO })] }),
        celula({ texto: "Duração média da sessão", largura: 3600 }),
        celula({ texto: "≥ 3 minutos", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Média", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),

      linhaTabela([
        celula({ fundo: "EBF3FB", largura: 2200, runs: [new TextRun({ text: "Performance", bold: true, color: COR_MEDIO })] }),
        celula({ texto: "Tempo médio de resposta", largura: 3600 }),
        celula({ texto: "≤ 4s (p50)", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EBF3FB", largura: 2200, runs: [new TextRun({ text: "Performance", bold: true, color: COR_MEDIO })] }),
        celula({ texto: "Disponibilidade (uptime)", largura: 3600 }),
        celula({ texto: "≥ 99,5% mensal", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EBF3FB", largura: 2200, runs: [new TextRun({ text: "Performance", bold: true, color: COR_MEDIO })] }),
        celula({ texto: "Taxa de erro (5xx)", largura: 3600 }),
        celula({ texto: "≤ 0,5%", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),

      linhaTabela([
        celula({ fundo: "EBF3FB", largura: 2200, runs: [new TextRun({ text: "Qualidade", bold: true, color: COR_MEDIO })] }),
        celula({ texto: "Taxa de respostas úteis (👍)", largura: 3600 }),
        celula({ texto: "≥ 70%", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EBF3FB", largura: 2200, runs: [new TextRun({ text: "Qualidade", bold: true, color: COR_MEDIO })] }),
        celula({ texto: "NPS (Net Promoter Score)", largura: 3600 }),
        celula({ texto: "≥ 50", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EBF3FB", largura: 2200, runs: [new TextRun({ text: "Qualidade", bold: true, color: COR_MEDIO })] }),
        celula({ texto: "Taxa de fallback (\"não sei\")", largura: 3600 }),
        celula({ texto: "≤ 10%", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Média", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),

      linhaTabela([
        celula({ fundo: "EAF7F0", largura: 2200, runs: [new TextRun({ text: "Negócio", bold: true, color: COR_LONGO })] }),
        celula({ texto: "Leads autorizados para agências", largura: 3600 }),
        celula({ texto: "≥ 250 (12 meses)", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EAF7F0", largura: 2200, runs: [new TextRun({ text: "Negócio", bold: true, color: COR_LONGO })] }),
        celula({ texto: "Conversões em intercâmbio fechado", largura: 3600 }),
        celula({ texto: "≥ 8 (12 meses)", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EAF7F0", largura: 2200, runs: [new TextRun({ text: "Negócio", bold: true, color: COR_LONGO })] }),
        celula({ texto: "Receita de afiliação acumulada", largura: 3600 }),
        celula({ texto: "≥ R$ 20.000", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Alta", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),

      linhaTabela([
        celula({ fundo: "EAF7F0", largura: 2200, runs: [new TextRun({ text: "Operacional", bold: true, color: COR_LONGO })] }),
        celula({ texto: "Custo médio por sessão", largura: 3600 }),
        celula({ texto: "≤ R$ 0,15", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EAF7F0", largura: 2200, runs: [new TextRun({ text: "Operacional", bold: true, color: COR_LONGO })] }),
        celula({ texto: "ROI operacional", largura: 3600 }),
        celula({ texto: "≥ 1,0 (M9+)", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
      linhaTabela([
        celula({ fundo: "EAF7F0", largura: 2200, runs: [new TextRun({ text: "Operacional", bold: true, color: COR_LONGO })] }),
        celula({ texto: "Conformidade LGPD", largura: 3600 }),
        celula({ texto: "100%", largura: 1800, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Crítica", largura: 1426, alinhamento: AlignmentType.CENTER }),
      ]),
    ],
  }),

  quebraPagina(),
];

// ──────── Encerramento ────────
const encerramento = [
  h1("Considerações Finais"),
  p("Este documento sistematiza o caminho de evolução planejado para a Assistente Virtual da Ananda nos próximos 12 meses, partindo de uma base já entregue e funcional. As decisões aqui descritas — desde a sequência das fases até a definição dos KPIs — foram tomadas considerando três princípios:"),
  bullet("Iterar antes de escalar: validar com poucos usuários antes de investir em volume."),
  bullet("Medir o que importa: KPIs cobrem tanto experiência do usuário quanto saúde do negócio."),
  bullet("Sustentabilidade financeira: cada fase tem caminho claro para gerar receita suficiente para custeá-la."),
  p("Os números absolutos definidos como meta são uma calibragem inicial e poderão ser revistos ao final de cada fase, com base em dados reais coletados."),

  h1("Anexos — Acessos do Projeto"),
  pMulti([
    new TextRun({ text: "Aplicação em produção:  ", bold: true }),
    link("https://viajandocomananda.com", "https://viajandocomananda.com"),
  ]),
  pMulti([
    new TextRun({ text: "Painel administrativo do Langflow:  ", bold: true }),
    link("https://langflow.viajandocomananda.com", "https://langflow.viajandocomananda.com"),
  ]),
  pMulti([
    new TextRun({ text: "Repositório do código-fonte:  ", bold: true }),
    link("https://github.com/gazz-w/langflow_chat_2026", "https://github.com/gazz-w/langflow_chat_2026"),
  ]),
];

// ──────── Documento ────────
const doc = new Document({
  creator: "Gabriel Shimabuko",
  title: "PI III - Sistematização 1",
  description: "Plano de Implantação e Definição de KPIs - Assistente da Ananda",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: COR_PRIMARIA },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: COR_SECUNDARIA },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: COR_SECUNDARIA },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },  // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COR_PRIMARIA, space: 4 } },
          children: [new TextRun({ text: "PI III — Sistematização 1", size: 18, color: COR_SECUNDARIA })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Página ", size: 18, color: COR_SECUNDARIA }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COR_SECUNDARIA }),
            new TextRun({ text: " de ", size: 18, color: COR_SECUNDARIA }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: COR_SECUNDARIA }),
          ],
        })],
      }),
    },
    children: [
      ...capa,
      ...sumarioExec,
      ...parteI,
      ...parteII,
      ...encerramento,
    ],
  }],
});

const outputPath = path.join(__dirname, "PI3_Sistematizacao_1.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Documento gerado:", outputPath);
});

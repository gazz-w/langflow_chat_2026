// Gera o documento de Entrega Parcial do PI III
// Uso: node gerar_documento.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageBreak,
  PageNumber, TabStopType, TabStopPosition, ImageRun
} = require('docx');

// ──────── Helpers ────────
const COR_PRIMARIA = "6A3DE8";    // Roxo da identidade visual
const COR_SECUNDARIA = "2A2A2D";
const COR_TEXTO = "1F1F1F";
const COR_BORDA = "D9D9D9";
const COR_DESTAQUE = "F0ECFD";

const borda = (cor = COR_BORDA) => ({ style: BorderStyle.SINGLE, size: 4, color: cor });
const bordasCompletas = (cor = COR_BORDA) => ({ top: borda(cor), bottom: borda(cor), left: borda(cor), right: borda(cor) });

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
  ...opts.extra,
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

// Célula de tabela padronizada
const celula = ({ texto, runs, bold = false, fundo, largura, alinhamento, padded = true }) => new TableCell({
  borders: bordasCompletas(),
  width: { size: largura, type: WidthType.DXA },
  shading: fundo ? { fill: fundo, type: ShadingType.CLEAR } : undefined,
  margins: padded ? { top: 100, bottom: 100, left: 140, right: 140 } : undefined,
  children: [new Paragraph({
    alignment: alinhamento,
    children: runs || [new TextRun({ text: texto || "", bold })],
  })],
});

// ──────── Conteúdo ────────

// Capa
const capa = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text: "CENTRO UNIVERSITÁRIO DE BRASÍLIA", bold: true, size: 24, color: COR_SECUNDARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: "PROJETO INTEGRADOR III", size: 22, color: COR_SECUNDARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Entrega Parcial", bold: true, size: 36, color: COR_PRIMARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [new TextRun({ text: "Protótipo Funcional em Produção", size: 28, color: COR_SECUNDARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Assistente Virtual da Ananda", bold: true, size: 32, color: COR_TEXTO })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 2400 },
    children: [new TextRun({ text: "Chatbot de Intercâmbio com Inteligência Artificial", italics: true, size: 24, color: COR_SECUNDARIA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: "Aluno: Gabriel Shimabuko", size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: "Professor: Ricardo Neiva", size: 24 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 },
    children: [new TextRun({ text: "Brasília — Maio de 2026", size: 24 })],
  }),
  quebraPagina(),
];

// Sumário executivo
const sumarioExecutivo = [
  h1("Sumário Executivo"),
  p("Este documento apresenta a entrega parcial do Projeto Integrador III — uma assistente virtual de inteligência artificial criada para a influenciadora digital Ananda, focada em responder dúvidas sobre intercâmbio internacional, vistos e vida fora do Brasil."),
  p("Diferentemente de protótipos estáticos ou navegáveis em ferramentas de design, o sistema entregue está em produção, com aplicação funcional acessível publicamente, domínio próprio e certificado HTTPS válido. Todos os fluxos descritos neste documento podem ser testados em tempo real."),
  new Paragraph({
    spacing: { before: 200, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: COR_DESTAQUE },
    border: { top: borda(COR_PRIMARIA), bottom: borda(COR_PRIMARIA), left: borda(COR_PRIMARIA), right: borda(COR_PRIMARIA) },
    children: [
      new TextRun({ text: "🌐 Acesso à aplicação:  ", bold: true }),
      link("https://viajandocomananda.com", "https://viajandocomananda.com"),
    ],
  }),
  pMulti([
    new TextRun({ text: "Repositório do código-fonte: ", bold: true }),
    link("github.com/gazz-w/langflow_chat_2026", "https://github.com/gazz-w/langflow_chat_2026"),
  ]),
  h2("Stack Tecnológica"),
  bullet("Backend: Python 3.11 com Flask e Gunicorn"),
  bullet("Motor de IA: Langflow + Claude Haiku 4.5 (Anthropic)"),
  bullet("Frontend: HTML5, CSS3 e JavaScript puro (sem framework)"),
  bullet("Infraestrutura: VPS Hetzner Cloud, Docker Compose, Caddy (proxy reverso com HTTPS automático via Let's Encrypt)"),
  bullet("DNS e domínio: Cloudflare Registrar"),
  bullet("Versionamento: Git e GitHub"),
  quebraPagina(),
];

// 1. Visão do Projeto
const visaoProjeto = [
  h1("1. Visão do Projeto"),
  h2("1.1. Problema Identificado"),
  p("Ananda é uma criadora de conteúdo que está prestes a iniciar um intercâmbio na Irlanda (Cork) com seu marido. Conforme compartilha essa jornada em suas redes sociais, recebe diariamente um grande volume de perguntas de seguidores interessados em fazer intercâmbio — dúvidas sobre vistos, custos, países, processos burocráticos e logística do dia a dia."),
  p("Responder individualmente cada mensagem é inviável. Ao mesmo tempo, deixar esses seguidores sem resposta significa perder potenciais clientes que poderiam ser convertidos em parcerias com agências de intercâmbio ou em uma comunidade engajada."),
  h2("1.2. Solução Proposta"),
  p("Uma assistente virtual conversacional, disponível 24 horas, que:"),
  bullet("Responde dúvidas frequentes sobre intercâmbio com a personalidade e o tom de voz da Ananda."),
  bullet("Captura leads qualificados (com consentimento LGPD) para futuras campanhas e parcerias comerciais."),
  bullet("Fornece utilitários complementares (cotação de moedas e conversor) para enriquecer a experiência do usuário."),
  bullet("Pode evoluir para incorporar a base real de conhecimento da Ananda via RAG (Retrieval-Augmented Generation)."),
  h2("1.3. Persona-Alvo"),
  p("Jovens brasileiros entre 18 e 35 anos, seguidores da Ananda em redes sociais, interessados em fazer intercâmbio de estudo, trabalho ou viver fora do Brasil. Possuem dúvidas iniciais sobre o processo e buscam orientação prática antes de procurar uma agência."),
  h2("1.4. Diferencial Competitivo"),
  p("Enquanto chatbots genéricos respondem com informação superficial extraída do treinamento do modelo, esta solução foi projetada para — em sua próxima fase — incorporar o conteúdo real produzido pela Ananda (vídeos, posts, transcrições) como base de conhecimento. Isso garante respostas com sua voz, suas experiências reais e suas recomendações pessoais — algo que nenhum chatbot genérico consegue oferecer."),
  quebraPagina(),
];

// 2. Arquitetura Técnica
const arquitetura = [
  h1("2. Arquitetura Técnica"),
  h2("2.1. Visão Geral"),
  p("A aplicação foi desenhada em três camadas independentes, comunicando-se via rede interna do Docker. Esta separação garante segurança (apenas o Caddy é exposto à internet), escalabilidade (cada serviço pode ser substituído individualmente) e portabilidade (todo o stack roda em qualquer servidor com Docker)."),
  h3("Diagrama de componentes"),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [new ImageRun({
      type: "png",
      data: fs.readFileSync(path.join(__dirname, "diagrama_arquitetura.png")),
      transformation: { width: 460, height: 540 },
      altText: {
        title: "Arquitetura de componentes",
        description: "Diagrama mostrando as três camadas: Caddy (borda), Flask (aplicação) e Langflow (inteligência)",
        name: "diagrama_arquitetura",
      },
    })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({
      text: "Figura 1 — Arquitetura de componentes em três camadas (borda, aplicação, inteligência).",
      italics: true, size: 18, color: "6B6B75",
    })],
  }),
  h2("2.2. Decisões Arquiteturais"),
  h3("Isolamento de memória por usuário"),
  p("O componente Memory do Langflow, por padrão, recupera todas as mensagens do banco — gerando vazamento de contexto entre usuários. A solução adotada foi enviar o session_id (gerado no navegador e persistido em localStorage) tanto no nível de gravação quanto via tweak da API, escopando a leitura apenas à sessão do usuário corrente."),
  h3("Persistência de leads em volume Docker"),
  p("Os cadastros são gravados em formato JSON Lines (leads.jsonl) dentro de um volume nomeado do Docker, garantindo que os dados sobrevivam a reinicializações e recriações do container Flask."),
  h3("HTTPS automático sem configuração manual"),
  p("O Caddy obtém e renova certificados Let's Encrypt automaticamente para todos os domínios configurados. Não é necessário rodar certbot, configurar cron ou gerenciar manualmente nenhuma chave criptográfica."),
  h2("2.3. Infraestrutura de Produção"),
  // Tabela de infra
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [3000, 6026],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celula({ texto: "Componente", bold: true, fundo: COR_DESTAQUE, largura: 3000 }),
          celula({ texto: "Especificação", bold: true, fundo: COR_DESTAQUE, largura: 6026 }),
        ],
      }),
      new TableRow({ children: [
        celula({ texto: "Servidor", largura: 3000 }),
        celula({ texto: "Hetzner Cloud CX23 — 2 vCPU, 4 GB RAM, 40 GB SSD (Nuremberg, Alemanha)", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Sistema operacional", largura: 3000 }),
        celula({ texto: "Ubuntu 26.04 LTS", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Orquestração", largura: 3000 }),
        celula({ texto: "Docker Engine 29.5 + Docker Compose v5.1", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Domínio", largura: 3000 }),
        celula({ texto: "viajandocomananda.com (Cloudflare Registrar)", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Certificado SSL", largura: 3000 }),
        celula({ texto: "Let's Encrypt (renovação automática a cada 60 dias)", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Firewall", largura: 3000 }),
        celula({ texto: "UFW configurado (somente portas 22, 80, 443)", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Backup", largura: 3000 }),
        celula({ texto: "Snapshots diários automáticos da Hetzner (retenção de 7 dias)", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Custo operacional", largura: 3000 }),
        celula({ texto: "~US$ 6,40/mês (servidor + backup + domínio amortizado)", largura: 6026 }),
      ]}),
    ],
  }),
  quebraPagina(),
];

// 3. Fluxos Principais
const fluxos = [
  h1("3. Fluxos Principais do Sistema"),
  p("Esta seção descreve os fluxos do usuário implementados e em pleno funcionamento. Cada um pode ser testado em tempo real na URL de produção."),

  h2("3.1. Fluxo 1 — Cadastro inicial com consentimento LGPD"),
  p("No primeiro acesso, o usuário é apresentado a um modal de cadastro obrigatório que coleta nome, telefone e e-mail. Esta porta de entrada serve a dois objetivos: capturar leads qualificados e estabelecer um vínculo formal com o usuário antes do uso da assistente."),
  h3("Etapas do fluxo"),
  bullet("Usuário acessa viajandocomananda.com pela primeira vez."),
  bullet("Modal aparece em sobreposição à interface, bloqueando o uso até a conclusão."),
  bullet("Usuário preenche nome, telefone e e-mail (todos obrigatórios)."),
  bullet("Dois checkboxes adicionais (não obrigatórios e desmarcados por padrão) oferecem consentimento separado para: (1) inclusão em comunidade de intercambistas e (2) compartilhamento de contato com agências parceiras."),
  bullet("Validação client-side e server-side: nome com 2+ caracteres, e-mail por regex, telefone com 10+ dígitos."),
  bullet("Após sucesso: lead salvo em leads.jsonl com timestamp UTC, versão do termo de consentimento, e flags booleanos para cada checkbox."),
  bullet("Status persistido em localStorage — o modal não reaparece em acessos subsequentes."),
  p("[ESPAÇO PARA SCREENSHOT — Tela do modal de cadastro]", { run: { italics: true, color: "888888" } }),

  h2("3.2. Fluxo 2 — Conversa com a assistente"),
  p("Após o cadastro, o usuário acessa a interface principal, inspirada em produtos como ChatGPT e Claude. A conversa é totalmente isolada por sessão — o histórico de um usuário nunca contamina o contexto de outro."),
  h3("Etapas do fluxo"),
  bullet("Tela inicial exibe avatar, saudação e 4 sugestões de perguntas frequentes (chips clicáveis)."),
  bullet("Usuário pode clicar em uma sugestão ou digitar sua própria pergunta."),
  bullet("Mensagem é enviada para o backend Flask via POST /chat com session_id."),
  bullet("Flask repassa para o Langflow (Agent Claude Haiku 4.5), preservando o session_id via tweak para escopar a leitura da memória."),
  bullet("Resposta da IA é renderizada com formatação Markdown (listas, negrito, links)."),
  bullet("Indicador de \"digitando\" (três pontos animados) durante o processamento."),
  bullet("Botão \"Nova conversa\" no topo gera novo session_id, descartando o contexto anterior."),
  p("[ESPAÇO PARA SCREENSHOT — Tela do chat com pergunta + resposta da Ananda]", { run: { italics: true, color: "888888" } }),

  h2("3.3. Fluxo 3 — Utilitários complementares"),
  p("No topo da interface, duas faixas oferecem informações úteis para quem está planejando intercâmbio. Ambas são alimentadas pela API gratuita Frankfurter."),
  h3("Cotação em tempo real"),
  bullet("Exibe USD/BRL e EUR/BRL atualizadas."),
  bullet("Cache de 10 minutos para evitar excesso de chamadas externas."),
  h3("Conversor de moedas"),
  bullet("Suporta BRL, USD, EUR e GBP em qualquer direção."),
  bullet("Cálculo automático conforme o usuário digita (debounce de 350ms)."),
  bullet("No mobile, o layout quebra de forma que cada moeda permanece ao lado de seu valor."),
  p("[ESPAÇO PARA SCREENSHOT — Faixa de cotação e conversor]", { run: { italics: true, color: "888888" } }),

  h2("3.4. Fluxo 4 — Painel administrativo de gestão do flow"),
  p("Acessível em um subdomínio protegido por autenticação básica (HTTP Basic Auth com hash bcrypt), o painel do Langflow permite editar o fluxo de IA em produção sem precisar reiniciar serviços ou alterar código. Esta separação garante que apenas o administrador possa modificar o comportamento da assistente."),
  h3("Etapas do fluxo"),
  bullet("Administrador acessa langflow.viajandocomananda.com."),
  bullet("Navegador exibe prompt de login (usuário admin, senha protegida)."),
  bullet("Após autenticação, acessa a UI completa do Langflow para editar prompts, adicionar tools, ajustar parâmetros do modelo etc."),
  bullet("Mudanças são salvas e refletem imediatamente na assistente em produção (sem deploy ou restart)."),
  p("[ESPAÇO PARA SCREENSHOT — Tela do Langflow com o flow da Ananda]", { run: { italics: true, color: "888888" } }),

  quebraPagina(),
];

// 4. Conformidade LGPD
const lgpd = [
  h1("4. Conformidade com a LGPD"),
  p("Por coletar dados pessoais (nome, telefone, e-mail), a aplicação foi desenhada desde o início para atender aos princípios da Lei Geral de Proteção de Dados (Lei 13.709/2018)."),
  h2("4.1. Princípios atendidos"),

  // Tabela LGPD
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [3000, 6026],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celula({ texto: "Princípio LGPD", bold: true, fundo: COR_DESTAQUE, largura: 3000 }),
          celula({ texto: "Como é atendido na aplicação", bold: true, fundo: COR_DESTAQUE, largura: 6026 }),
        ],
      }),
      new TableRow({ children: [
        celula({ texto: "Finalidade", largura: 3000 }),
        celula({ texto: "Aviso explícito antes do cadastro: \"Seus dados serão usados para contato sobre este projeto\".", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Necessidade", largura: 3000 }),
        celula({ texto: "Apenas três campos são obrigatórios (nome, telefone, e-mail). Demais coletas são opcionais.", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Consentimento específico", largura: 3000 }),
        celula({ texto: "Cada finalidade (comunidade, agências) tem seu próprio checkbox, desmarcado por padrão (opt-in).", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Não-discriminação", largura: 3000 }),
        celula({ texto: "O acesso à assistente NÃO depende de marcar os checkboxes opcionais.", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Direito de revogação", largura: 3000 }),
        celula({ texto: "E-mail de contato visível no termo para revogar consentimento a qualquer momento.", largura: 6026 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Accountability", largura: 3000 }),
        celula({ texto: "Cada lead armazena a versão do termo de consentimento aceita (consent_version), permitindo auditoria futura caso o texto seja alterado.", largura: 6026 }),
      ]}),
    ],
  }),

  h2("4.2. Estrutura do dado armazenado"),
  p("Cada lead é gravado como uma linha JSON contendo: timestamp UTC, nome, telefone, e-mail, session_id da conversa associada, dois flags booleanos para os consentimentos opcionais, e a versão do termo aceito."),
  quebraPagina(),
];

// 5. Atendimento ao Barema
const barema = [
  h1("5. Atendimento ao Barema de Avaliação"),
  p("Esta seção mapeia, para cada critério do barema da disciplina, como a entrega atual o atende."),

  // Tabela barema
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2400, 1000, 5626],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celula({ texto: "Critério", bold: true, fundo: COR_PRIMARIA, largura: 2400, runs: [new TextRun({ text: "Critério", bold: true, color: "FFFFFF" })] }),
          celula({ texto: "Peso", bold: true, fundo: COR_PRIMARIA, largura: 1000, alinhamento: AlignmentType.CENTER, runs: [new TextRun({ text: "Peso", bold: true, color: "FFFFFF" })] }),
          celula({ texto: "Como esta entrega atende", bold: true, fundo: COR_PRIMARIA, largura: 5626, runs: [new TextRun({ text: "Como esta entrega atende", bold: true, color: "FFFFFF" })] }),
        ],
      }),
      new TableRow({ children: [
        celula({ texto: "Funcionalidade e Navegabilidade", bold: true, largura: 2400 }),
        celula({ texto: "25%", largura: 1000, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Aplicação em produção, acessível em https://viajandocomananda.com. Todos os 4 fluxos principais (cadastro, conversa, utilitários, painel admin) estão funcionais e testáveis em tempo real, sem necessidade de simulação.", largura: 5626 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Aderência ao Projeto", bold: true, largura: 2400 }),
        celula({ texto: "25%", largura: 1000, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "A solução resolve diretamente o problema da Ananda — automatizar respostas sobre intercâmbio e capturar leads. O domínio (viajandocomananda.com), o nome \"Assistente da Ananda\", o avatar com sua inicial e as sugestões de perguntas iniciais reforçam essa aderência.", largura: 5626 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Clareza da Apresentação", bold: true, largura: 2400 }),
        celula({ texto: "25%", largura: 1000, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Documento estruturado em seções numeradas. Link público de acesso direto à aplicação. Repositório GitHub aberto com histórico de commits e README. Senha do painel admin pode ser disponibilizada sob demanda.", largura: 5626 }),
      ]}),
      new TableRow({ children: [
        celula({ texto: "Inovação e Criatividade", bold: true, largura: 2400 }),
        celula({ texto: "25%", largura: 1000, alinhamento: AlignmentType.CENTER }),
        celula({ texto: "Uso de tecnologias de ponta: agente IA com Claude Haiku 4.5, orquestração visual via Langflow, deploy containerizado com HTTPS automático e domínio próprio. Vai muito além de protótipos navegáveis estáticos — entrega um produto real, com infraestrutura de produção e conformidade legal (LGPD) já implementada.", largura: 5626 }),
      ]}),
    ],
  }),

  quebraPagina(),
];

// 6. Próximos passos
const proximosPassos = [
  h1("6. Próximos Passos"),
  p("A entrega atual representa o protótipo funcional V1. Para a entrega final, estão planejadas as seguintes evoluções, em ordem de prioridade:"),
  h2("6.1. Base de conhecimento da Ananda (RAG)"),
  p("Indexar vetorialmente o conteúdo real produzido pela Ananda (transcrições de vídeos, posts de blog, mensagens de FAQ) em um banco vetorial. O Agent passará a buscar nesse contexto antes de responder, garantindo que as respostas reflitam a experiência e a voz pessoal dela — não conhecimento genérico do modelo. Este é o maior diferencial competitivo planejado."),
  h2("6.2. Refinamento do system prompt"),
  p("Aprofundar a definição da persona (tom de voz, vocabulário, uso de emojis, estrutura de resposta padrão) e estabelecer limites claros (sempre orientar a verificar fontes oficiais para informações de visto, não dar conselhos jurídicos)."),
  h2("6.3. Ferramentas adicionais para o Agent"),
  p("Adicionar tool de web search (via API Tavily ou Serper) para que o assistente possa buscar informações atualizadas sobre vistos, prazos e regras de imigração — dados que mudam frequentemente e ficariam desatualizados se dependessem apenas do treinamento do modelo."),
  h2("6.4. Handoff para atendimento humano"),
  p("Quando o usuário expressar intenção de falar diretamente com a Ananda ou com uma agência parceira, capturar a intenção e marcar o lead no leads.jsonl como \"interessado em contato\" para priorizar follow-up comercial."),
  h2("6.5. Monitoramento e observabilidade"),
  p("Implementar UptimeRobot para alertas de indisponibilidade e analytics básico (Plausible) para acompanhar volume de conversas, perguntas mais frequentes e taxas de conversão de cadastro."),
  quebraPagina(),
];

// 7. Anexos
const anexos = [
  h1("Anexos"),
  h2("A. Acessos"),
  pMulti([
    new TextRun({ text: "• Aplicação principal:  ", bold: true }),
    link("https://viajandocomananda.com", "https://viajandocomananda.com"),
  ]),
  pMulti([
    new TextRun({ text: "• Painel administrativo do Langflow:  ", bold: true }),
    link("https://langflow.viajandocomananda.com", "https://langflow.viajandocomananda.com"),
  ]),
  pMulti([
    new TextRun({ text: "• Repositório do código-fonte:  ", bold: true }),
    link("https://github.com/gazz-w/langflow_chat_2026", "https://github.com/gazz-w/langflow_chat_2026"),
  ]),
  p("As credenciais do painel administrativo podem ser disponibilizadas ao professor mediante solicitação direta.", { run: { italics: true } }),

  h2("B. Estrutura do repositório"),
  new Paragraph({
    spacing: { before: 100, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
    children: [new TextRun({ text:
      "langflow_chat_2026/\n" +
      "├── app.py                  ← Backend Flask (rotas /, /chat, /register, /rates, /convert)\n" +
      "├── requirements.txt        ← Dependências Python\n" +
      "├── Dockerfile              ← Imagem do Flask + Gunicorn\n" +
      "├── docker-compose.yml      ← Orquestração dos 3 serviços\n" +
      "├── Caddyfile               ← Configuração do proxy reverso e HTTPS\n" +
      "├── .env.example            ← Template das variáveis de ambiente\n" +
      "├── .gitignore              ← Exclui .env e leads.jsonl do controle de versão\n" +
      "├── templates/\n" +
      "│   └── index.html          ← Interface principal e modal de cadastro\n" +
      "├── static/\n" +
      "│   ├── chat.js             ← Lógica de chat, sessão, conversor, tema\n" +
      "│   └── style.css           ← Estilos (tema claro/escuro com CSS variables)\n" +
      "└── docs/\n" +
      "    └── PI3_Entrega_Parcial.docx",
      font: "Consolas", size: 18,
    })],
  }),

  h2("C. Como testar a aplicação"),
  bullet("Acesse https://viajandocomananda.com em qualquer navegador moderno."),
  bullet("Preencha o modal de cadastro com dados de teste (pode usar nome fictício e e-mail descartável)."),
  bullet("Após o cadastro, experimente as 4 sugestões iniciais ou digite uma pergunta livre sobre intercâmbio."),
  bullet("Teste o conversor de moedas no topo da página."),
  bullet("Clique em \"Nova conversa\" para iniciar um novo contexto isolado."),
  bullet("Alterne entre tema claro e escuro pelo ícone no canto superior direito."),
];

// ──────── Montagem do documento ────────
const doc = new Document({
  creator: "Gabriel Shimabuko",
  title: "PI III - Entrega Parcial - Assistente da Ananda",
  description: "Documento de entrega parcial do Projeto Integrador III",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: COR_PRIMARIA },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: COR_SECUNDARIA },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: COR_SECUNDARIA },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
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
          children: [
            new TextRun({ text: "PI III — Assistente da Ananda", size: 18, color: COR_SECUNDARIA }),
          ],
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
      ...sumarioExecutivo,
      ...visaoProjeto,
      ...arquitetura,
      ...fluxos,
      ...lgpd,
      ...barema,
      ...proximosPassos,
      ...anexos,
    ],
  }],
});

const outputPath = path.join(__dirname, "PI3_Entrega_Parcial.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("✅ Documento gerado: " + outputPath);
});

# Blueprint do Media Kit — Viajando com Ananda

> Especificação funcional e técnica para implementação da página pública `/media-kit`.
> Este documento define o produto; não representa a implementação final.

## 1. Objetivo do produto

Criar uma página pública, moderna e responsiva que apresente Ananda a marcas e potenciais parceiros. Em até 20 segundos, o visitante deve compreender:

1. quem é Ananda;
2. qual é seu alcance;
3. por que sua audiência é relevante;
4. como iniciar uma parceria.

A página deve aprofundar essas respostas progressivamente, sem obrigar o visitante a navegar por várias páginas ou abrir um PDF.

### Proposta de valor

> Ananda transforma experiências reais em histórias que informam, emocionam e inspiram pessoas a viver novos capítulos.

### Promessa comercial

> A marca não interrompe a história. Ela passa a fazer parte dela.

### Atributos que o design e o texto devem transmitir

- autenticidade;
- lifestyle;
- diversão;
- proximidade;
- clareza;
- qualidade;
- inspiração;
- profissionalismo.

## 2. Escopo da primeira versão

### Incluído

- página pública em `/media-kit`;
- identidade visual totalmente independente das páginas atuais;
- conteúdo em página única com navegação por âncoras;
- métricas e dados de audiência vindos de Google Sheets;
- renderização no servidor para SEO e carregamento rápido;
- conteúdos em destaque, comentários e depoimentos curados;
- gráficos simples e acessíveis;
- animações leves;
- CTA principal por e-mail;
- versão responsiva para celular, tablet e desktop;
- fallback local se o Google Sheets estiver indisponível;
- metadados de SEO e compartilhamento.

### Fora do escopo inicial

- API da Meta/Instagram;
- login ou área restrita;
- edição do layout por CMS;
- tabela pública de preços;
- orçamento automático;
- formulário comercial com armazenamento de dados;
- geração automática de PDF;
- feed completo e automático do Instagram;
- painel administrativo novo;
- internacionalização.

## 3. Arquitetura recomendada

O projeto atual usa Flask, Jinja, CSS e JavaScript puro. A nova página deve respeitar essa arquitetura, mas permanecer isolada visual e estruturalmente.

```text
Navegador
   |
   v
Caddy / HTTPS
   |
   v
Flask: GET /media-kit
   |
   +--> MediaKitDataService
   |       |
   |       +--> cache em memória (10 minutos)
   |       +--> Google Sheets publicado como CSV
   |       +--> fallback JSON local
   |
   +--> Jinja: templates/media_kit.html
           |
           +--> static/media-kit.css
           +--> static/media-kit.js
           +--> static/media-kit/* (imagens e logos)
```

### Decisões arquiteturais

1. **Renderizar os dados no servidor.** Evita tela vazia, melhora SEO, reduz complexidade no navegador e permite validar dados antes da exibição.
2. **Ler o Sheets no backend.** A página não dependerá de CORS nem exibirá a URL da planilha no JavaScript.
3. **Usar CSV publicado em vez da API autenticada na V1.** O projeto já possui `requests` e a biblioteca padrão de CSV. Isso evita OAuth e dependências adicionais.
4. **A planilha conterá apenas informações públicas.** Nenhum dado pessoal, credencial, rascunho comercial ou contato privado pode estar nela.
5. **Usar cache com último valor válido.** Uma indisponibilidade do Google não pode quebrar o Media Kit.
6. **Manter texto institucional no template.** Sheets controla dados variáveis e itens curados, mas não toda a estrutura editorial.
7. **Não usar framework de frontend.** As interações necessárias são bem atendidas por CSS, `IntersectionObserver` e APIs nativas do navegador.

### Isolamento do código

Não adicionar estilos do Media Kit ao `static/style.css` atual. Não carregar `chat.js` nessa rota.

Estrutura sugerida:

```text
app.py
media_kit.py                     # Blueprint Flask e rota
services/
  __init__.py
  media_kit_data.py              # leitura, validação, cache e fallback
templates/
  media_kit.html
static/
  media-kit.css
  media-kit.js
  media-kit/
    hero-ananda.webp
    about-ananda.webp
    og-media-kit.jpg
    stories/
    partners/
data/
  media_kit_fallback.json
tests/
  test_media_kit_data.py
  test_media_kit_route.py
```

Usar um `Blueprint` Flask chamado `media_kit_bp`, registrado em `app.py`. Isso reduz o crescimento do arquivo monolítico atual e torna a feature removível/testável.

## 4. Integração com Google Sheets

### Estratégia da V1

- Criar uma planilha exclusiva para o Media Kit.
- Publicar somente as guias necessárias para leitura.
- Guardar no `.env` uma URL CSV por guia.
- Flask busca e transforma as linhas em estruturas de dados.
- Cache padrão: 600 segundos.
- Timeout de conexão: 3 segundos; timeout total: 8 segundos.
- Se uma guia falhar, usar o último valor válido em cache.
- Se não houver cache, usar `data/media_kit_fallback.json`.
- Nunca mostrar erro técnico ao visitante.

Variáveis sugeridas:

```text
MEDIA_KIT_METRICS_CSV_URL=
MEDIA_KIT_AUDIENCE_CSV_URL=
MEDIA_KIT_CONTENT_CSV_URL=
MEDIA_KIT_QUOTES_CSV_URL=
MEDIA_KIT_TESTIMONIALS_CSV_URL=
MEDIA_KIT_CACHE_SECONDS=600
MEDIA_KIT_CONTACT_EMAIL=
```

Adicionar as mesmas chaves, sem valores reais, em `.env.example`.

### Guia `metricas`

| key | value | display_value | label | period | updated_at | order | active |
|---|---:|---|---|---|---|---:|---|
| followers | 11400 | 11,4 mil | seguidores | atual | 2026-09-01 | 1 | TRUE |
| views_90d | 2700000 | 2,7 milhões | visualizações | últimos 90 dias | 2026-09-01 | 2 | TRUE |

- `value` é numérico e usado por animações/acessibilidade.
- `display_value` é a apresentação editorial aprovada.
- Não calcular alcance a partir de visualizações.
- Toda métrica deve possuir período e data de atualização.

### Guia `audiencia`

| dimension | label | value | display_value | order | active |
|---|---|---:|---|---:|---|
| gender | Feminino | 74 | 74% | 1 | TRUE |
| age | 25–34 | 46 | 46% | 1 | TRUE |
| country | Brasil | 82 | 82% | 1 | TRUE |

Dimensões aceitas inicialmente: `gender`, `age`, `country`. Cada dimensão deve totalizar aproximadamente 100%, aceitando arredondamento entre 99% e 101%.

### Guia `conteudos`

| slug | title | category | story | asset | post_url | views | likes | comments | shares | saves | order | active |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---|

- `category`: `conexao`, `alcance` ou `ambos`.
- `asset` deve referenciar um arquivo local dentro de `static/media-kit/stories/`.
- Não usar links do Google Drive como origem principal de imagens.
- Métricas ausentes ficam vazias; a interface não exibe zeros inventados.
- Limite inicial: até 8 conteúdos ativos; destacar 4 no primeiro carregamento.

### Guia `comentarios`

| quote | author_display | context | source_url | order | active |
|---|---|---|---|---:|---|

- Usar apenas comentários públicos e aprovados.
- Abreviar ou anonimizar o nome quando não houver autorização específica.
- Não carregar avatar pessoal do seguidor na V1.
- `context`: `identificacao`, `inspiracao`, `confianca` ou `decisao`.

### Guia `depoimentos`

| quote | author | role | company | logo_asset | case_url | order | active |
|---|---|---|---|---|---|---:|---|

- Exibir a seção somente quando houver ao menos um depoimento válido.
- O nome, cargo, empresa e logo devem ter autorização de uso.

### Validação e sanitização

- aceitar somente protocolos `https` em URLs externas;
- escapar todo texto via Jinja (não usar `|safe` em conteúdo do Sheets);
- limitar textos a tamanhos previsíveis;
- aceitar apenas nomes de assets sem `..`, `/` inicial ou caracteres de controle;
- converter métricas com tratamento de erro;
- interpretar `active` de forma explícita (`true`, `1`, `yes`, `sim`);
- ordenar somente depois de validar `order`;
- registrar falhas no log do servidor sem expor URLs ou detalhes na página.

## 5. Arquitetura da informação

A experiência será uma página única com leitura progressiva.

```text
Header compacto e fixo
  ├── Sobre
  ├── Impacto
  ├── Histórias
  ├── Parcerias
  └── Contato

1. Hero
2. Faixa de credibilidade / resumo
3. Manifesto e história da Ananda
4. Impacto em números
5. Perfil da audiência
6. Método de storytelling
7. Histórias que conectam
8. Conteúdos que ampliaram o alcance
9. Voz da comunidade
10. Possibilidades para marcas
11. Experiências e depoimentos comerciais
12. CTA final por e-mail
13. Footer
```

### Regra de leitura progressiva

- **20 segundos:** hero, 2 métricas e CTA.
- **1 minuto:** posicionamento, audiência e conteúdos de destaque.
- **3 minutos:** método, comentários, formatos e cases.

## 6. Layout e componentes

### 6.1 Header

- logo tipográfico “Ananda” ou “Viajando com Ananda”;
- navegação por âncoras no desktop;
- CTA “Vamos conversar” sempre visível;
- fundo inicialmente transparente e sólido após rolagem;
- no mobile, botão de menu com painel curto, foco controlado e fechamento por `Escape`;
- não reutilizar o cabeçalho do chatbot.

### 6.2 Hero

Objetivo: apresentar personalidade, proposta e escala antes da primeira rolagem.

Desktop:

- layout assimétrico em duas colunas;
- texto ocupando aproximadamente 45%;
- foto editorial ocupando aproximadamente 55%;
- métricas sobrepostas de forma legível, sem cobrir o rosto;
- CTA primário para e-mail e secundário para navegar até audiência.

Mobile:

- nome e frase antes da imagem;
- fotografia na proporção 4:5;
- métricas em duas colunas abaixo da foto;
- CTA em largura total;
- conteúdo principal visível sem animação obrigatória.

Conteúdo inicial:

- assinatura: “Histórias que conectam. Experiências que inspiram.”;
- apoio: storytelling autêntico sobre lifestyle, viagens, relações e vida fora do Brasil;
- 11,4 mil seguidores;
- 2,7 milhões de visualizações nos últimos 90 dias.

### 6.3 Manifesto / Sobre

- texto curto em blocos editoriais, não uma biografia longa;
- fotografia espontânea ou sequência de 2 imagens;
- destacar casamento, relacionamento, mudança de país e novo ciclo aos 30;
- uma frase em tamanho grande para criar ritmo visual.

### 6.4 Impacto em números

- números grandes e períodos explícitos;
- máximo de 4 cards na V1;
- contagem animada opcional por 600–900 ms;
- valor final deve existir no HTML antes da animação;
- “Atualizado em mês/ano” visível;
- não criar métricas derivadas que possam confundir marcas.

### 6.5 Audiência

- três blocos: gênero, idade e países;
- barras horizontais com valor textual ao lado;
- sem biblioteca externa de gráficos;
- os dados devem continuar compreensíveis sem CSS ou animação;
- no desktop, composição em grid; no mobile, blocos empilhados;
- incluir uma breve interpretação editorial, sem extrapolar os dados.

### 6.6 Método de storytelling

Apresentar a sequência:

```text
Vivência real → Emoção → História → Utilidade → Conexão
```

- desktop: linha horizontal ou composição editorial;
- mobile: timeline vertical;
- cada etapa com no máximo duas linhas explicativas;
- evitar aparência de fluxograma corporativo.

### 6.7 Histórias e conteúdos em destaque

- usar cards editoriais com imagem, título, contexto e métricas;
- desktop: grid de destaque seguido por carrossel;
- mobile: `scroll-snap` nativo com um card e parte do próximo visível;
- botões anterior/próximo no desktop e suporte a toque no mobile;
- abrir Instagram em nova aba com indicação acessível;
- permitir filtro simples: “Conexão” e “Alcance”, somente se houver pelo menos 3 itens em cada grupo;
- não incorporar o feed completo do Instagram.

### 6.8 Voz da comunidade

- mosaico de comentários curados;
- mostrar entre 3 e 6 por carregamento;
- variar tamanho visual conforme o conteúdo, não conforme uma pontuação inventada;
- evitar carrossel automático;
- comentários devem reforçar identificação, inspiração, confiança ou decisão.

### 6.9 Possibilidades para marcas

Organizar por integração narrativa antes de listar entregáveis:

1. solução dentro de uma experiência;
2. produto dentro da rotina;
3. marca como facilitadora de uma transformação.

Depois mostrar formatos possíveis:

- Reels;
- Stories;
- carrosséis;
- UGC;
- reviews;
- experiências e viagens;
- embaixadora;
- campanhas de longo prazo.

Categorias prioritárias:

- soluções para viagem e vida no exterior;
- seguros;
- beleza e autocuidado;
- produtos para viagem;
- tecnologia, organização e facilidades para a rotina.

### 6.10 Cases e depoimentos

- separar “histórias editoriais” de “cases comerciais”;
- não chamar experiências pessoais de parceria;
- seção condicional: ocultar quando não houver dados válidos;
- um case deve conter contexto, entrega e resultado verificável;
- depoimentos não devem rodar automaticamente.

### 6.11 CTA final

- headline: “Vamos criar o próximo capítulo?”;
- botão principal abre `mailto:`;
- assunto sugerido: `Proposta de parceria — [nome da marca]`;
- não tentar preencher o nome da marca sem formulário;
- mostrar o e-mail em texto copiável como alternativa;
- feedback visual ao copiar e-mail;
- Instagram como ação secundária.

## 7. Direção visual

### Conceito

**Editorial de viagem + creator contemporânea.** O resultado deve ser fotográfico, humano e energético, sem recorrer continuamente a ícones de avião, passaporte ou mapa.

### Sistema visual provisório

Usar tokens próprios sob um seletor raiz `.media-kit-page` para impedir vazamento de estilos.

Paleta inicial a validar com as fotografias:

```text
Ink         #211E1B  texto principal
Cream       #F7F1E8  fundo editorial
Paper       #FFFDFC  cartões claros
Coral       #FF6B4A  energia e CTAs
Cobalt      #3454D1  contraste e informação
Lime        #C9E66B  acento divertido em pequenas doses
Muted       #766F68  texto secundário
```

Regras:

- coral como ação principal, não como fundo dominante em todas as seções;
- cobalt para dados, links e contraste;
- lime apenas em detalhes;
- garantir contraste WCAG AA;
- não implementar dark mode na V1; a identidade é fixa e editorial.

Tipografia sugerida:

- display editorial: `Instrument Serif`;
- interface e corpo: `Manrope`;
- fallback completo com fontes de sistema;
- carregar apenas os pesos realmente usados;
- considerar arquivos de fonte locais na implementação final para privacidade e estabilidade.

### Fotografia

- prioridade para fotos espontâneas, expressivas e de contexto;
- combinar retrato forte com registros de cotidiano;
- preservar área de respiro para sobreposição de texto;
- entregar originais em alta resolução;
- gerar versões WebP/AVIF responsivas;
- informar dimensões para evitar mudança de layout durante o carregamento;
- nunca usar imagem como única forma de transmitir uma informação.

## 8. Movimento e interações

O site deve parecer vivo, sem sacrificar velocidade ou clareza.

### Permitido

- revelação suave de seções ao entrar na viewport;
- barras de audiência preenchendo uma vez;
- contadores curtos;
- deslocamento sutil de fotografia no desktop;
- header mudando de estado após rolagem;
- carrossel controlado pelo usuário;
- hover com movimento máximo de 2–4 px;
- feedback ao copiar e-mail.

### Evitar

- animação de entrada que bloqueie o conteúdo;
- rolagem hijacked;
- autoplay de vídeo com som;
- carrossel automático;
- cursor personalizado;
- parallax pesado em celular;
- texto animado letra por letra;
- bibliotecas de animação na V1.

### Movimento reduzido

Com `prefers-reduced-motion: reduce`:

- remover transições não essenciais;
- desabilitar contadores e parallax;
- mostrar imediatamente os valores e conteúdos finais;
- manter navegação e controles totalmente funcionais.

## 9. Responsividade

Projetar mobile-first.

Breakpoints de referência:

```text
0–479 px       celular compacto
480–767 px     celular grande
768–1023 px    tablet
1024–1439 px   desktop
1440 px+       desktop amplo com conteúdo limitado
```

Regras:

- largura máxima editorial entre 1200 e 1280 px;
- gutters: 20 px mobile, 32 px tablet, 48 px desktop;
- usar `clamp()` para títulos e espaçamento;
- nenhum texto corrido acima de 70 caracteres por linha;
- áreas clicáveis com mínimo de 44 x 44 px;
- não depender de hover;
- não permitir rolagem horizontal da página;
- cards em carrossel podem usar rolagem horizontal intencional;
- testar textos maiores e números com 7 ou mais dígitos;
- CTA principal deve continuar evidente em telas pequenas.

## 10. Acessibilidade

Meta mínima: WCAG 2.2 AA nos fluxos principais.

- HTML semântico (`header`, `nav`, `main`, `section`, `article`, `footer`);
- um único `h1` e hierarquia de títulos correta;
- link “Pular para o conteúdo”;
- navegação completa por teclado;
- foco visível e consistente;
- menu mobile com `aria-expanded` e foco controlado;
- botões reais para ações, links reais para navegação;
- alternativas textuais descritivas para imagens relevantes;
- imagens decorativas com `alt=""`;
- valores dos gráficos disponíveis como texto;
- não depender apenas de cor para categorias;
- contraste mínimo de 4.5:1 para texto normal;
- não esconder conteúdo importante atrás de hover;
- anúncios de feedback com `aria-live` quando o e-mail for copiado.

## 11. Performance

Metas da primeira versão em rede móvel intermediária:

- LCP abaixo de 2,5 s;
- CLS abaixo de 0,1;
- INP abaixo de 200 ms;
- JavaScript próprio abaixo de 30 KB comprimido;
- CSS próprio abaixo de 60 KB comprimido;
- hero responsivo abaixo de 250 KB na largura móvel;
- página inicial sem vídeos pesados;
- zero bibliotecas JS externas na V1.

Implementação:

- `picture` com AVIF/WebP e tamanhos responsivos;
- `loading="lazy"` abaixo da dobra;
- hero com prioridade alta e dimensões declaradas;
- `defer` no JavaScript;
- fontes locais com `font-display: swap`;
- cache de assets via Caddy/Flask;
- não carregar imagens de posts que ainda não estão próximas da viewport;
- evitar sombras e filtros excessivamente caros.

## 12. SEO e compartilhamento

- `title`: `Media Kit | Ananda — Lifestyle, viagens e vida fora do Brasil`;
- description comercial específica;
- URL canônica `/media-kit`;
- Open Graph com imagem 1200 x 630;
- Twitter Card;
- favicon coerente com a nova identidade;
- dados estruturados `Person` com perfis públicos e ocupação;
- títulos e conteúdo importantes devem vir no HTML, não ser injetados por JS;
- não aplicar `noindex`;
- links externos com `rel="noopener noreferrer"` quando abrirem nova aba.

## 13. Privacidade e segurança

- planilha pública contém apenas dados que já podem aparecer no site;
- URLs da planilha ficam no ambiente do servidor;
- não armazenar dados pessoais na V1;
- CTA por e-mail evita novo tratamento de dados no site;
- comentários devem ser anonimizados quando necessário;
- depoimentos e logos exigem autorização;
- não inserir HTML vindo do Sheets;
- validar URLs e nomes de arquivo;
- limitar tamanho de resposta baixada do Sheets;
- não registrar conteúdo completo da planilha em logs;
- manter a política de privacidade acessível no footer.

## 14. Estados da interface

### Dados completos

Exibir todas as seções e a data de atualização.

### Dados parciais

- ocultar uma categoria de audiência sem dados;
- reorganizar automaticamente o grid;
- ocultar métricas vazias;
- nunca mostrar `0`, `undefined`, `NaN` ou card vazio.

### Sheets indisponível

- usar cache ou fallback local;
- não exibir alerta técnico;
- registrar warning no servidor;
- manter CTA e conteúdo institucional funcionando.

### Sem depoimentos comerciais

Ocultar a seção inteira e manter “Histórias que conectam”.

### JavaScript indisponível

- conteúdo e links continuam visíveis;
- gráficos continuam legíveis;
- lista de conteúdos substitui comportamento de carrossel;
- e-mail continua sendo um link normal.

## 15. Medição futura

Não bloquear a V1 por analytics. Preparar atributos `data-event` nos links para futura instrumentação:

```text
media_kit_email_click
media_kit_instagram_click
media_kit_post_click
media_kit_nav_click
```

Em uma fase posterior, adotar analytics compatível com consentimento e privacidade. Não registrar e-mail, IP, conteúdo de mensagem ou outros identificadores apenas para medir cliques.

## 16. Plano de implementação para o próximo agente

### Fase 0 — Preservação e inventário

1. Ler completamente `app.py`, `Caddyfile`, `Dockerfile`, `requirements.txt`, `templates/index.html` e `static/style.css`.
2. Rodar `git status` e preservar alterações existentes do usuário.
3. Confirmar que não existe `.openai/hosting.json`; o deploy atual deve continuar em Docker/Caddy.
4. Inventariar fotos, logos, links e dados efetivamente fornecidos.
5. Não inventar métricas demográficas ou resultados de parceria.

### Fase 1 — Fundação de dados

1. Criar `services/media_kit_data.py`.
2. Implementar leitura das cinco guias CSV.
3. Implementar timeout, cache, último valor válido e fallback.
4. Criar validadores e estruturas normalizadas.
5. Criar `data/media_kit_fallback.json` com apenas os dados confirmados: 11,4 mil seguidores e 2,7 milhões de visualizações em 90 dias.
6. Adicionar configuração ao `.env.example`.
7. Criar testes unitários para CSV válido, valor inválido, guia vazia e indisponibilidade.

### Fase 2 — Rota e template semântico

1. Criar `media_kit.py` com `media_kit_bp`.
2. Registrar o blueprint em `app.py`.
3. Criar `templates/media_kit.html` com todas as seções sem depender de JS.
4. Aplicar renderização condicional para audiência, conteúdos, comentários e depoimentos.
5. Criar metadados, canonical, Open Graph e JSON-LD.
6. Verificar que `/`, `/admin` e APIs existentes continuam inalteradas.

### Fase 3 — Identidade e layout responsivo

1. Criar `static/media-kit.css` isolado.
2. Implementar tokens de cor, tipo, espaço, raio e grid.
3. Construir mobile-first.
4. Implementar header, hero, métricas, audiência, histórias, comunidade, formatos, CTA e footer.
5. Usar assets temporários claramente identificados somente se o usuário ainda não tiver fornecido fotos; não apresentar placeholders como resultado final.
6. Validar o layout a 360, 390, 768, 1024 e 1440 px.

### Fase 4 — Interações progressivas

1. Criar `static/media-kit.js` com JavaScript modular e sem dependências.
2. Implementar menu mobile acessível.
3. Implementar `IntersectionObserver` para revelações e barras.
4. Implementar carrossel com scroll-snap e controles.
5. Implementar copiar e-mail com fallback.
6. Respeitar `prefers-reduced-motion`.
7. Confirmar funcionamento sem JavaScript.

### Fase 5 — Qualidade

1. Testar rota e serviço de dados.
2. Validar teclado, foco, headings, labels, alt text e contraste.
3. Verificar ausência de overflow horizontal.
4. Validar tratamento de dados parciais e fallback.
5. Executar Lighthouse em mobile e desktop.
6. Conferir console do navegador e logs do Flask.
7. Otimizar imagens e fontes.
8. Revisar texto, números, períodos e datas.

### Fase 6 — Entrega

1. Documentar como publicar e atualizar cada guia do Sheets.
2. Documentar como adicionar imagem de conteúdo e logo de parceiro.
3. Entregar lista de campos ainda não preenchidos.
4. Exibir a página localmente para revisão visual antes de deploy.
5. Não fazer deploy sem solicitação explícita.

## 17. Critérios de aceite

### Produto

- [ ] Em até 20 segundos é possível identificar Ananda, nicho, seguidores, visualizações e contato.
- [ ] A narrativa de storytelling aparece antes da lista de formatos comerciais.
- [ ] Métricas possuem período e data de atualização.
- [ ] Visualizações não são rotuladas como alcance.
- [ ] Experiências pessoais não são apresentadas como parcerias comerciais.
- [ ] CTA de e-mail aparece no hero e no final.

### Técnica

- [ ] `/media-kit` responde com status 200 sem afetar `/`.
- [ ] A página não carrega `style.css` nem `chat.js` existentes.
- [ ] Falha do Sheets usa fallback e mantém status 200.
- [ ] Conteúdo variável é escapado e validado.
- [ ] Não há dependência de API da Meta.
- [ ] Não há biblioteca JS externa.
- [ ] O site funciona sem JavaScript.

### UX e responsividade

- [ ] Sem rolagem horizontal em 360 px.
- [ ] Navegação e carrossel funcionam por teclado e toque.
- [ ] Foco é visível.
- [ ] Movimento reduzido é respeitado.
- [ ] Gráficos possuem equivalentes textuais.
- [ ] CTAs têm área mínima de 44 x 44 px.
- [ ] Layout foi validado em 360, 390, 768, 1024 e 1440 px.

### Performance

- [ ] LCP alvo abaixo de 2,5 s.
- [ ] CLS alvo abaixo de 0,1.
- [ ] Hero possui dimensões e fontes não bloqueiam indefinidamente.
- [ ] Imagens abaixo da dobra usam lazy loading.

## 18. Dependências de conteúdo antes do acabamento final

O agente pode implementar a estrutura sem estes itens, mas não deve considerar o Media Kit finalizado até receber:

- 1 foto principal vertical em alta resolução;
- 3 a 8 fotografias secundárias;
- e-mail comercial definitivo;
- URL correta do Instagram;
- dados de gênero, idade e países;
- data de referência dos 11,4 mil seguidores;
- capas e links dos conteúdos selecionados;
- métricas individuais dos conteúdos selecionados;
- comentários aprovados e anonimizados;
- depoimentos e logos com autorização, se existirem;
- política de privacidade ou URL correspondente;
- decisão final sobre assinatura (“Histórias que conectam...” ou alternativa).

## 19. Princípio de decisão

Quando houver conflito entre efeito visual e compreensão, priorizar compreensão. Quando houver conflito entre animação e desempenho, priorizar desempenho. Quando houver ausência de dados, ocultar o componente em vez de inventar conteúdo.

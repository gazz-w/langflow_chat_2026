# Atualização do Media Kit pelo Google Sheets

O Media Kit funciona sem planilha usando os números confirmados em
`data/media_kit_fallback.json`. Para atualizar conteúdo sem alterar código,
crie uma planilha exclusiva e siga a estrutura abaixo.

## 1. Crie as guias

Use exatamente estes nomes:

- `metricas`
- `audiencia`
- `conteudos`
- `comentarios`
- `depoimentos`

Não coloque nessa planilha informações privadas, contatos de seguidores,
rascunhos, preços ou dados que não possam aparecer publicamente.

## 2. Cabeçalhos

### metricas

```csv
key,value,display_value,label,period,updated_at,order,active
followers,11400,"11,4 mil",seguidores,audiência atual,2026-09-01,1,TRUE
views_90d,2700000,"2,7 milhões",visualizações,nos últimos 90 dias,2026-09-01,2,TRUE
```

### audiencia

```csv
dimension,label,value,display_value,order,active
gender,Feminino,74,74%,1,TRUE
gender,Masculino,26,26%,2,TRUE
age,25–34,46,46%,1,TRUE
country,Brasil,82,82%,1,TRUE
```

Valores aceitos em `dimension`: `gender`, `age` e `country`.

### conteudos

```csv
slug,title,category,story,asset,post_url,views,likes,comments,shares,saves,order,active
```

Valores aceitos em `category`: `conexao`, `alcance` e `ambos`.

O campo `asset` deve conter apenas o caminho do arquivo dentro de
`static/media-kit/`, por exemplo `stories/casamento.webp`. As imagens não são
armazenadas no Sheets.

### comentarios

```csv
quote,author_display,context,source_url,order,active
```

Valores aceitos em `context`: `identificacao`, `inspiracao`, `confianca` e
`decisao`. Anonimize o autor quando não houver autorização de uso do nome.

### depoimentos

```csv
quote,author,role,company,logo_asset,case_url,order,active
```

Use somente depoimentos e logos autorizados.

## 3. Publique cada guia

No Google Sheets:

1. acesse **Arquivo → Compartilhar → Publicar na Web**;
2. selecione uma guia por vez;
3. selecione o formato CSV;
4. publique e copie o link gerado;
5. repita para as cinco guias.

## 4. Configure o projeto

Adicione os links no `.env` do servidor:

```text
MEDIA_KIT_METRICS_CSV_URL=https://...
MEDIA_KIT_AUDIENCE_CSV_URL=https://...
MEDIA_KIT_CONTENT_CSV_URL=https://...
MEDIA_KIT_QUOTES_CSV_URL=https://...
MEDIA_KIT_TESTIMONIALS_CSV_URL=https://...
MEDIA_KIT_CACHE_SECONDS=600
MEDIA_KIT_CONTACT_EMAIL=email-comercial@exemplo.com
MEDIA_KIT_INSTAGRAM_URL=https://www.instagram.com/perfil/
```

Reinicie o container Flask após alterar o `.env`. Depois disso, mudanças nas
células entram no site automaticamente após o cache, normalmente em até 10
minutos.

## 5. Regras editoriais

- use `active=TRUE` para exibir e `active=FALSE` para ocultar;
- use `order` para controlar a ordem dos itens;
- deixe uma métrica vazia em vez de preencher com zero quando ela não existir;
- informe sempre o período de cada indicador;
- não chame visualizações de alcance;
- mantenha a data `updated_at` no formato `AAAA-MM-DD`;
- revise a página depois de publicar números ou textos muito longos.

## 6. Comportamento em caso de falha

Se o Google Sheets estiver indisponível, o site usa o último conteúdo em cache.
Se o servidor tiver acabado de iniciar e ainda não houver cache, usa
`data/media_kit_fallback.json`. A página permanece disponível em ambos os casos.

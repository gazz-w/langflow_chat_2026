const form = document.getElementById("chat-form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const scroll = document.getElementById("scroll");
const thread = document.getElementById("thread");
const welcome = document.getElementById("welcome");
const newChatBtn = document.getElementById("new-chat");

function newSessionId() {
  return "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let sessionId = localStorage.getItem("ananda_session") || newSessionId();
localStorage.setItem("ananda_session", sessionId);

// user_id: identidade permanente da pessoa — NÃO muda em "Nova conversa".
// É o que vincula todas as sessões de um mesmo usuário ao seu cadastro.
let userId = localStorage.getItem("ananda_user_id");
if (!userId) {
  userId = "usr-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem("ananda_user_id", userId);
}

// Histórico de mensagens — persistido no navegador para sobreviver ao reload.
let history = [];
try {
  history = JSON.parse(localStorage.getItem("ananda_history") || "[]");
} catch (e) {
  history = [];
}

function persistHistory() {
  if (history.length > 200) history = history.slice(-200);
  try {
    localStorage.setItem("ananda_history", JSON.stringify(history));
  } catch (e) {
    /* localStorage cheio — ignora silenciosamente */
  }
}

function autosize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 200) + "px";
}
input.addEventListener("input", autosize);

function scrollToBottom() {
  scroll.scrollTop = scroll.scrollHeight;
}

function addMessage(text, who) {
  welcome.style.display = "none";

  const msg = document.createElement("div");
  msg.className = "msg " + who;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = who === "user" ? "V" : "A";

  const body = document.createElement("div");
  body.className = "msg-body";

  const role = document.createElement("div");
  role.className = "msg-role";
  role.textContent = who === "user" ? "Você" : "Assistente da Ananda";

  const content = document.createElement("div");
  content.className = "msg-content";
  if (who === "bot") {
    content.innerHTML = marked.parse(text);
  } else {
    content.textContent = text;
  }

  body.appendChild(role);
  body.appendChild(content);
  msg.appendChild(avatar);
  msg.appendChild(body);
  thread.appendChild(msg);
  scrollToBottom();
  return content;
}

function addTyping() {
  welcome.style.display = "none";
  const msg = document.createElement("div");
  msg.className = "msg bot";
  msg.innerHTML =
    '<div class="msg-avatar">A</div>' +
    '<div class="msg-body"><div class="msg-role">Assistente da Ananda</div>' +
    '<div class="typing-dots"><span></span><span></span><span></span></div></div>';
  thread.appendChild(msg);
  scrollToBottom();
  return msg;
}

function newMsgId() {
  return "m-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Avaliações já dadas (msgId -> "up"|"down"), para mostrar o estado após reload.
let rated = {};
try {
  rated = JSON.parse(localStorage.getItem("ananda_rated") || "{}");
} catch (e) {
  rated = {};
}
function persistRated() {
  try {
    localStorage.setItem("ananda_rated", JSON.stringify(rated));
  } catch (e) {
    /* localStorage cheio — ignora */
  }
}

function sendFeedback(payload) {
  // Fire-and-forget: o feedback nunca deve travar a conversa.
  fetch("/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      Object.assign({ session_id: sessionId, user_id: userId }, payload)
    ),
  }).catch(() => {});
}

// Anexa a barra de feedback (👍/👎) ao corpo da mensagem do bot. É colocada
// FORA do .msg-content (que é re-renderizado no streaming), como irmã dele.
function attachFeedback(contentEl, msgId, question, answer) {
  const body = contentEl.parentNode;

  const bar = document.createElement("div");
  bar.className = "feedback";
  const label = document.createElement("span");
  label.className = "feedback-q";
  label.textContent = "Foi útil?";

  const up = document.createElement("button");
  up.type = "button";
  up.className = "fb-btn";
  up.textContent = "👍";
  up.title = "Resposta útil";
  const down = document.createElement("button");
  down.type = "button";
  down.className = "fb-btn";
  down.textContent = "👎";
  down.title = "Resposta não útil";

  const reasons = document.createElement("div");
  reasons.className = "fb-reasons";
  reasons.hidden = true;
  ["Incorreta", "Incompleta", "Fora do tema"].forEach((r) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "fb-reason";
    chip.textContent = r;
    chip.addEventListener("click", () => {
      sendFeedback({ msg_id: msgId, rating: "down", reason: r, question, answer });
      label.textContent = "Obrigado pelo retorno 🙏";
      reasons.hidden = true;
    });
    reasons.appendChild(chip);
  });

  const setSelected = (rating) => {
    up.classList.toggle("selected", rating === "up");
    down.classList.toggle("selected", rating === "down");
  };

  up.addEventListener("click", () => {
    rated[msgId] = "up";
    persistRated();
    setSelected("up");
    reasons.hidden = true;
    label.textContent = "Obrigado! 🙏";
    sendFeedback({ msg_id: msgId, rating: "up", question, answer });
  });
  down.addEventListener("click", () => {
    rated[msgId] = "down";
    persistRated();
    setSelected("down");
    label.textContent = "O que faltou?";
    reasons.hidden = false;
    sendFeedback({ msg_id: msgId, rating: "down", question, answer });
  });

  bar.appendChild(label);
  bar.appendChild(up);
  bar.appendChild(down);
  body.appendChild(bar);
  body.appendChild(reasons);

  if (rated[msgId]) setSelected(rated[msgId]);
}

// Redesenha as mensagens salvas ao abrir/recarregar a página.
function restoreHistory() {
  history.forEach((m, idx) => {
    const el = addMessage(m.text, m.who);
    if (m.who === "bot") {
      const q = idx > 0 && history[idx - 1].who === "user" ? history[idx - 1].text : "";
      attachFeedback(el, m.id || newMsgId(), q, m.text);
    }
  });
}
restoreHistory();

// Divide texto em clusters de grafema (Unicode-aware) para nunca cortar um
// emoji multi-code-unit (ex: 🇮🇪, 👍🏽) ao meio durante a revelação.
const segmenter =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter("pt-BR", { granularity: "grapheme" })
    : null;
function splitGraphemes(text) {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

// Lê o SSE do backend e revela o texto progressivamente (efeito "digitando").
// O Markdown é re-parseado a cada quadro (não só no final) para não mostrar
// a sintaxe crua (**negrito**, listas) antes de "estalar" para o formato
// final. O renderizador é incremental: quando o backend enviar tokens
// reais, o mesmo código exibe cada um conforme chega, sem alteração.
async function readStream(res, typing, question) {
  let received = ""; // texto já recebido do servidor
  let segments = []; // clusters de grafema de `received`
  let shown = 0; // clusters já revelados na tela
  let content = null;
  let errorText = null;
  let doneReading = false;
  let revealPromise = null;

  // rAF não dispara com a aba oculta (troca de aba/app no meio da resposta):
  // nesse caso cai para setTimeout e mostra tudo de uma vez, sem animação.
  const schedule = (fn) =>
    document.hidden ? setTimeout(fn, 200) : requestAnimationFrame(fn);

  const reveal = () =>
    new Promise((resolve) => {
      const step = () => {
        if (document.hidden) {
          // Aba oculta: sem animação — exibe tudo o que já chegou.
          shown = segments.length;
          content.innerHTML = marked.parse(received);
        } else if (shown < segments.length) {
          // Passo adaptativo: acompanha o ritmo do que chega sem travar.
          const pending = segments.length - shown;
          shown = Math.min(shown + Math.max(2, Math.ceil(pending / 40)), segments.length);
          content.innerHTML = marked.parse(segments.slice(0, shown).join(""));
          scrollToBottom();
        }
        if (shown >= segments.length && doneReading) return resolve();
        schedule(step);
      };
      schedule(step);
    });

  const handleEvent = (evt) => {
    if (evt.type === "token" && evt.text) {
      if (!content) {
        typing.remove();
        content = addMessage("", "bot");
      }
      received += evt.text;
      segments = splitGraphemes(received);
      if (!revealPromise) revealPromise = reveal();
    } else if (evt.type === "done") {
      if (evt.usage) renderUsage(evt.usage);
    } else if (evt.type === "error") {
      errorText = evt.error || "Ocorreu um erro inesperado.";
      if (evt.usage) renderUsage(evt.usage);
    }
  };

  const handleBlock = (block) => {
    const line = block.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return;
    let evt;
    try {
      evt = JSON.parse(line.slice(5));
    } catch (e) {
      return;
    }
    handleEvent(evt);
  };

  if (res.body && res.body.getReader) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        handleBlock(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
  } else {
    // WebViews sem suporte a leitura de stream (ex: navegador embutido do
    // Instagram em aparelhos antigos): lê a resposta inteira e processa os
    // mesmos blocos SSE de uma vez — a resposta aparece igual.
    (await res.text()).split("\n\n").forEach(handleBlock);
  }
  doneReading = true;
  if (revealPromise) await revealPromise;

  if (content && received) {
    // Parse final: garantia de que o texto completo está renderizado
    // (a revelação progressiva já deve ter chegado aqui sozinha).
    content.innerHTML = marked.parse(received);
    scrollToBottom();
    const msgId = newMsgId();
    history.push({ who: "bot", text: received, id: msgId });
    persistHistory();
    attachFeedback(content, msgId, question, received);
  }
  if (errorText) {
    if (!content) typing.remove();
    addMessage(errorText, "bot");
  } else if (!content) {
    typing.remove();
    addMessage("Ocorreu um erro inesperado.", "bot");
  }
}

async function send(text) {
  addMessage(text, "user");
  history.push({ who: "user", text: text });
  persistHistory();
  input.value = "";
  autosize();
  input.disabled = true;
  sendBtn.disabled = true;

  const typing = addTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        session_id: sessionId,
        user_id: userId,
        stream: true,
      }),
    });

    const ctype = res.headers.get("Content-Type") || "";
    if (!ctype.includes("text/event-stream")) {
      // Resposta não-stream: erros de validação, limite (429) ou fallback.
      const data = await res.json();
      typing.remove();
      if (data.usage) renderUsage(data.usage);
      if (data.reply) {
        const c = addMessage(data.reply, "bot");
        const mid = newMsgId();
        history.push({ who: "bot", text: data.reply, id: mid });
        persistHistory();
        attachFeedback(c, mid, text, data.reply);
      } else {
        addMessage(data.error || "Ocorreu um erro inesperado.", "bot");
      }
      return;
    }

    await readStream(res, typing, text);
  } catch (err) {
    typing.remove();
    addMessage("Não consegui me conectar ao servidor. Tente novamente.", "bot");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) send(text);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => send(chip.textContent.trim()));
});

newChatBtn.addEventListener("click", () => {
  sessionId = newSessionId();
  localStorage.setItem("ananda_session", sessionId);
  history = [];
  localStorage.removeItem("ananda_history");
  thread.innerHTML = "";
  welcome.style.display = "";
  input.focus();
});

// Tema (escuro como padrão)
const themeToggle = document.getElementById("theme-toggle");
const savedTheme = localStorage.getItem("ananda_theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
themeToggle.addEventListener("click", () => {
  const next =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("ananda_theme", next);
});

// Cotação USD/EUR
async function loadRates() {
  try {
    const res = await fetch("/rates");
    const data = await res.json();
    if (data.usd_brl && data.eur_brl) {
      document.getElementById("usd").textContent =
        "R$ " + data.usd_brl.toFixed(2).replace(".", ",");
      document.getElementById("eur").textContent =
        "R$ " + data.eur_brl.toFixed(2).replace(".", ",");
    }
  } catch (e) {
    /* mantém o traço se falhar */
  }
}
loadRates();
setInterval(loadRates, 600000);

// Contador de requisições (limite de uso por IP)
const usageMeter = document.getElementById("usage-meter");
const usageHour = document.getElementById("usage-hour");
const usageDay = document.getElementById("usage-day");

function renderUsage(usage) {
  if (!usage || !usage.hour || !usage.day) return;
  const h = usage.hour.remaining;
  const d = usage.day.remaining;
  usageHour.textContent = h;
  usageDay.textContent = d;
  const empty = h <= 0 || d <= 0;
  const low = !empty && (h <= 5 || d <= 10);
  usageMeter.classList.toggle("usage-empty", empty);
  usageMeter.classList.toggle("usage-low", low);
}

async function loadUsage() {
  try {
    const res = await fetch("/usage");
    renderUsage(await res.json());
  } catch (e) {
    /* mantém o traço se falhar */
  }
}
loadUsage();

// Conversor de moedas
const convAmount = document.getElementById("conv-amount");
const convFrom = document.getElementById("conv-from");
const convTo = document.getElementById("conv-to");
const convResult = document.getElementById("conv-result");
let convTimer;

function fmt(n) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function convert() {
  const amount = (convAmount.value || "").replace(",", ".");
  if (amount === "" || isNaN(Number(amount))) {
    convResult.textContent = "—";
    return;
  }
  convResult.textContent = "…";
  try {
    const url =
      "/convert?from=" +
      convFrom.value +
      "&to=" +
      convTo.value +
      "&amount=" +
      encodeURIComponent(amount);
    const res = await fetch(url);
    const data = await res.json();
    convResult.textContent =
      typeof data.result === "number" ? fmt(data.result) : "—";
  } catch (e) {
    convResult.textContent = "—";
  }
}

convAmount.addEventListener("input", () => {
  clearTimeout(convTimer);
  convTimer = setTimeout(convert, 350);
});
convFrom.addEventListener("change", convert);
convTo.addEventListener("change", convert);
convert();

// Cadastro (porta de entrada)
const gate = document.getElementById("gate");
const gateForm = document.getElementById("gate-form");
const gateError = document.getElementById("gate-error");
const gateSubmit = document.getElementById("gate-submit");

if (localStorage.getItem("ananda_registered") === "1") {
  gate.classList.add("hidden");
  input.focus();
} else {
  document.getElementById("reg-name").focus();
}

gateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const email = document.getElementById("reg-email").value.trim();

  gateError.hidden = true;
  if (name.length < 2 || !phone || !email) {
    gateError.textContent = "Preencha nome, telefone e e-mail.";
    gateError.hidden = false;
    return;
  }

  gateSubmit.disabled = true;
  gateSubmit.textContent = "Enviando...";
  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        session_id: sessionId,
        user_id: userId,
        consent_community: document.getElementById("reg-community").checked,
        consent_share_agencies: document.getElementById("reg-share").checked,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem("ananda_registered", "1");
      gate.classList.add("hidden");
      input.focus();
    } else {
      gateError.textContent = data.error || "Não foi possível concluir o cadastro.";
      gateError.hidden = false;
    }
  } catch (err) {
    gateError.textContent = "Falha de conexão. Tente novamente.";
    gateError.hidden = false;
  } finally {
    gateSubmit.disabled = false;
    gateSubmit.textContent = "Acessar a assistente";
  }
});

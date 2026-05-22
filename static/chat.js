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

// Redesenha as mensagens salvas ao abrir/recarregar a página.
function restoreHistory() {
  history.forEach((m) => addMessage(m.text, m.who));
}
restoreHistory();

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
      }),
    });
    const data = await res.json();
    typing.remove();
    if (data.usage) renderUsage(data.usage);
    if (data.reply) {
      addMessage(data.reply, "bot");
      history.push({ who: "bot", text: data.reply });
      persistHistory();
    } else {
      addMessage(data.error || "Ocorreu um erro inesperado.", "bot");
    }
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

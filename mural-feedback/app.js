const MAX_WORDS = 3;
const MAX_LENGTH = 24;
const LOCAL_KEY = "mural-liderazgo-responses-v1";
const selectedWords = [];
let responses = [];
let dataSource = null;

const $ = (selector) => document.querySelector(selector);
const formView = $("#form-view");
const muralView = $("#mural-view");
const thankYou = $("#thank-you");
const input = $("#word-input");
const error = $("#form-error");

document.querySelectorAll("[data-optional-image]").forEach((image) => {
  image.addEventListener("error", () => {
    image.hidden = true;
    if (image.classList.contains("flower-logo")) $(".flower-fallback").hidden = false;
  });
  image.addEventListener("load", () => {
    if (image.classList.contains("flower-logo")) $(".flower-fallback").hidden = true;
  });
});

function cleanWord(value) {
  return value.trim().replace(/\s+/g, " ").replace(/^[.,;:!?¡¿]+|[.,;:!?¡¿]+$/g, "");
}

function keyFor(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function addWord(raw) {
  error.textContent = "";
  const word = cleanWord(raw);
  if (!word) return;
  if (word.includes(" ")) {
    error.textContent = "Escribe una sola palabra cada vez.";
    return;
  }
  if (word.length > MAX_LENGTH) {
    error.textContent = `La palabra no puede superar ${MAX_LENGTH} caracteres.`;
    return;
  }
  if (selectedWords.length >= MAX_WORDS) {
    error.textContent = "Ya has elegido tres palabras.";
    return;
  }
  if (selectedWords.some((item) => keyFor(item) === keyFor(word))) {
    error.textContent = "Esa palabra ya está en tu selección.";
    return;
  }
  selectedWords.push(word);
  input.value = "";
  renderSelectedWords();
  input.focus();
}

function renderSelectedWords() {
  const holder = $("#selected-words");
  holder.replaceChildren();
  selectedWords.forEach((word, index) => {
    const chip = document.createElement("span");
    chip.className = "word-chip";
    chip.append(document.createTextNode(word));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Eliminar ${word}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      selectedWords.splice(index, 1);
      renderSelectedWords();
    });
    chip.append(remove);
    holder.append(chip);
  });
  $("#word-counter").textContent = `${selectedWords.length} de ${MAX_WORDS} palabras`;
  $("#send-words").disabled = selectedWords.length === 0;
  input.disabled = selectedWords.length >= MAX_WORDS;
  $("#add-word").disabled = selectedWords.length >= MAX_WORDS;
}

function showView(name, updateUrl = true) {
  formView.hidden = name !== "form";
  muralView.hidden = name !== "mural";
  thankYou.hidden = name !== "thanks";
  $("#view-toggle").innerHTML = name === "mural" ? "Participar <span aria-hidden=\"true\">↙</span>" : "Ver mural <span aria-hidden=\"true\">↗</span>";
  if (updateUrl) {
    const url = new URL(location.href);
    name === "mural" ? url.searchParams.set("view", "mural") : url.searchParams.delete("view");
    history.replaceState({}, "", url);
  }
  if (name === "mural") renderMural();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function aggregateWords(items) {
  const groups = new Map();
  items.flatMap((item) => item.words || []).forEach((word) => {
    const key = keyFor(word);
    if (!groups.has(key)) groups.set(key, { label: cleanWord(word), count: 0, key });
    groups.get(key).count += 1;
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
}

function iconFor(word) {
  const semantic = [
    [/confian|segur|valent|coraje/, "◆"],
    [/equipo|junt|union|apoyo|red/, "◉"],
    [/lider|guia|rumbo|direccion/, "➜"],
    [/energia|fuerza|poder|accion/, "✦"],
    [/calma|paz|equilibr/, "◌"],
    [/inspir|creativ|idea|vision/, "✺"],
    [/escuch|empat|conex|amor/, "♥"],
    [/aprend|clar|conoc/, "◇"]
  ];
  return semantic.find(([pattern]) => pattern.test(keyFor(word)))?.[1] || "✦";
}

function seededNumber(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967295;
}

function positionFor(item, index, total) {
  const mobile = matchMedia("(max-width: 820px)").matches;
  const seed = seededNumber(item.key);
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2 + (seed - 0.5) * 0.46;
  const ring = index < 8 ? 0 : index < 18 ? 1 : 2;
  const radiusX = mobile ? 29 + ring * 6 : 24 + ring * 10;
  const radiusY = mobile ? 25 + ring * 9 : 22 + ring * 9;
  return {
    x: 50 + Math.cos(angle) * radiusX,
    y: (mobile ? 41 : 39) + Math.sin(angle) * radiusY
  };
}

function renderMural() {
  const words = aggregateWords(responses);
  const cloud = $("#word-cloud");
  cloud.replaceChildren();
  $("#empty-state").hidden = words.length > 0;
  $("#response-count").textContent = responses.length;
  const max = Math.max(...words.map((word) => word.count), 1);

  words.slice(0, 30).forEach((item, index) => {
    const node = document.createElement("span");
    const pos = positionFor(item, index, Math.min(words.length, 30));
    const scale = item.count / max;
    node.className = "word-bloom";
    node.dataset.rank = index === 0 ? "1" : "0";
    node.style.left = `${pos.x}%`;
    node.style.top = `${pos.y}%`;
    node.style.fontSize = `${0.82 + scale * 1.28}rem`;
    node.style.animationDelay = `${Math.min(index * 35, 500)}ms`;
    node.title = `${item.count} ${item.count === 1 ? "mención" : "menciones"}`;
    node.innerHTML = `<span class="icon" aria-hidden="true">${iconFor(item.label)}</span><span></span>`;
    node.lastElementChild.textContent = item.label;
    cloud.append(node);
  });

  const list = $("#accessible-word-list");
  list.replaceChildren(...words.map((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.label}: ${item.count} ${item.count === 1 ? "mención" : "menciones"}`;
    return li;
  }));
}

function setupLocalData() {
  dataSource = "local";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("mural-liderazgo") : null;
  const read = () => {
    try { responses = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
    catch { responses = []; }
    renderMural();
  };
  read();
  channel?.addEventListener("message", read);
  window.addEventListener("storage", read);
  return {
    async submit(words) {
      const record = { id: crypto.randomUUID(), words, createdAt: new Date().toISOString() };
      responses.push(record);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(responses));
      channel?.postMessage("updated");
      renderMural();
    }
  };
}

async function setupFirebase() {
  const config = window.FIREBASE_CONFIG || {};
  if (!config.apiKey || !config.projectId) return null;

  const appSdk = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js");
  const authSdk = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js");
  const storeSdk = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
  const app = appSdk.initializeApp(config);
  const auth = authSdk.getAuth(app);
  const db = storeSdk.getFirestore(app);
  const credential = await authSdk.signInAnonymously(auth);
  const sessionId = window.MURAL_SESSION_ID || "liderazgo-empoderamiento";
  const collectionRef = storeSdk.collection(db, "sessions", sessionId, "responses");
  dataSource = "firebase";

  storeSdk.onSnapshot(collectionRef, (snapshot) => {
    responses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderMural();
  }, () => {
    $("#connection-notice").hidden = false;
    $("#connection-notice").textContent = "No se ha podido actualizar el mural. Comprueba la conexión.";
  });

  return {
    async submit(words) {
      await storeSdk.setDoc(storeSdk.doc(collectionRef, credential.user.uid), {
        words,
        createdAt: storeSdk.serverTimestamp()
      });
    }
  };
}

async function initialize() {
  let remote = null;
  try { remote = await setupFirebase(); } catch (firebaseError) { console.warn(firebaseError); }
  dataSource = remote || setupLocalData();
  if (!remote) {
    $("#connection-notice").hidden = false;
    $("#connection-notice").textContent = "Vista de demostración: las respuestas solo se comparten entre pestañas de este dispositivo hasta conectar Firebase.";
  }
  showView(new URLSearchParams(location.search).get("view") === "mural" ? "mural" : "form", false);
}

$("#word-form").addEventListener("submit", (event) => { event.preventDefault(); addWord(input.value); });
$("#send-words").addEventListener("click", async () => {
  if (!selectedWords.length) return;
  const button = $("#send-words");
  button.disabled = true;
  const label = button.innerHTML;
  button.textContent = "Compartiendo…";
  error.textContent = "";
  try {
    await dataSource.submit([...selectedWords]);
    showView("thanks");
    selectedWords.splice(0);
    renderSelectedWords();
  } catch (submitError) {
    console.error(submitError);
    error.textContent = "No hemos podido guardar tus palabras. Inténtalo de nuevo.";
  } finally {
    button.innerHTML = label;
    button.disabled = selectedWords.length === 0;
  }
});

$("#view-toggle").addEventListener("click", () => showView(muralView.hidden ? "mural" : "form"));
$("#back-to-form").addEventListener("click", () => showView("form"));
$("#see-mural").addEventListener("click", () => showView("mural"));
$("#copy-link").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.searchParams.set("view", "mural");
  await navigator.clipboard.writeText(url.href);
  const button = $("#copy-link");
  const old = button.textContent;
  button.textContent = "Enlace copiado ✓";
  setTimeout(() => { button.textContent = old; }, 1800);
});

window.addEventListener("resize", () => { if (!muralView.hidden) renderMural(); });
initialize();

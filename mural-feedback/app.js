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

function rectanglesOverlap(a, b, padding = 7) {
  return !(
    a.right + padding <= b.left ||
    a.left >= b.right + padding ||
    a.bottom + padding <= b.top ||
    a.top >= b.bottom + padding
  );
}

function layoutWordCloud(cloud, nodes) {
  const width = cloud.clientWidth;
  const height = cloud.clientHeight;
  if (!width || !height) return;

  const placed = [];
  const centerX = width / 2;
  const centerY = height / 2;

  nodes.forEach((node, index) => {
    const nodeWidth = node.offsetWidth;
    const nodeHeight = node.offsetHeight;
    const seed = seededNumber(node.dataset.key || String(index));
    let position = null;

    for (let step = 0; step < 2600; step += 1) {
      const radius = index === 0 ? 0 : 4.25 * Math.sqrt(step);
      const angle = step * 0.49 + seed * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius * 1.22;
      const y = centerY + Math.sin(angle) * radius * 0.78;
      const candidate = {
        left: x - nodeWidth / 2,
        right: x + nodeWidth / 2,
        top: y - nodeHeight / 2,
        bottom: y + nodeHeight / 2
      };

      const inside = candidate.left >= 5
        && candidate.right <= width - 5
        && candidate.top >= 5
        && candidate.bottom <= height - 5;

      if (inside && !placed.some((item) => rectanglesOverlap(candidate, item))) {
        position = { x, y, ...candidate };
        break;
      }
    }

    if (!position) {
      const stepX = Math.max(82, nodeWidth + 12);
      const stepY = Math.max(42, nodeHeight + 12);
      outer:
      for (let y = stepY / 2 + 5; y < height - stepY / 2; y += stepY) {
        for (let x = stepX / 2 + 5; x < width - stepX / 2; x += stepX) {
          const candidate = {
            left: x - nodeWidth / 2,
            right: x + nodeWidth / 2,
            top: y - nodeHeight / 2,
            bottom: y + nodeHeight / 2
          };
          if (!placed.some((item) => rectanglesOverlap(candidate, item, 5))) {
            position = { x, y, ...candidate };
            break outer;
          }
        }
      }
    }

    if (position) {
      node.style.left = `${position.x}px`;
      node.style.top = `${position.y}px`;
      placed.push(position);
    }
    node.style.visibility = "visible";
  });
}

function renderMural() {
  const words = aggregateWords(responses);
  const cloud = $("#word-cloud");
  const stage = $("#flower-stage");
  cloud.replaceChildren();
  $("#empty-state").hidden = words.length > 0;
  $("#response-count").textContent = responses.length;
  const totalWords = responses.reduce((total, response) => total + (response.words?.length || 0), 0);
  $("#word-total")?.replaceChildren(document.createTextNode(String(totalWords)));
  $("#unique-count")?.replaceChildren(document.createTextNode(String(words.length)));
  const max = Math.max(...words.map((word) => word.count), 1);
  const min = Math.min(...words.map((word) => word.count), max);
  const mobile = matchMedia("(max-width: 820px)").matches;
  const extraWords = Math.max(0, words.length - (mobile ? 14 : 24));
  const stageHeight = (mobile ? 820 : 620) + extraWords * (mobile ? 34 : 19);
  stage.style.height = `${stageHeight}px`;
  cloud.dataset.density = words.length > 45 ? "high" : words.length > 28 ? "medium" : "normal";

  const nodes = words.map((item, index) => {
    const node = document.createElement("span");
    const range = Math.max(max - min, 1);
    const frequency = (item.count - min) / range;
    const emphasis = max === min ? 0.35 : Math.sqrt(frequency);
    const minimumSize = mobile ? 16 : 18;
    const maximumSize = mobile ? 43 : 58;

    node.className = "word-bloom";
    node.dataset.rank = index === 0 ? "1" : "0";
    node.dataset.tone = String(index % 5);
    node.dataset.key = item.key;
    node.style.fontSize = `${minimumSize + emphasis * (maximumSize - minimumSize)}px`;
    node.style.animationDelay = `${Math.min(index * 22, 420)}ms`;
    node.title = `${item.count} ${item.count === 1 ? "mención" : "menciones"}`;
    node.innerHTML = `<span class="icon" aria-hidden="true">${iconFor(item.label)}</span><span></span>`;
    node.lastElementChild.textContent = item.label;
    cloud.append(node);
    return node;
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
      await storeSdk.addDoc(collectionRef, {
        words,
        authorId: credential.user.uid,
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


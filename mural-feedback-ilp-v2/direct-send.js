await import("../mural-feedback/app.js?v=5");

const visibleInputs = [...document.querySelectorAll(".visible-word")];
const legacyInput = document.querySelector("#word-input");
const legacyAdd = document.querySelector("#add-word");
const legacySend = document.querySelector("#send-words");
const directSend = document.querySelector("#direct-send");
const formError = document.querySelector("#form-error");

function normalize(value) {
  return value.trim().replace(/\s+/g, " ").replace(/^[.,;:!?¡¿]+|[.,;:!?¡¿]+$/g, "");
}

async function sendAllWords() {
  formError.textContent = "";
  const words = visibleInputs.map((input) => normalize(input.value)).filter(Boolean);

  if (!words.length) {
    formError.textContent = "Escribe al menos una palabra.";
    visibleInputs[0].focus();
    return;
  }

  if (words.some((word) => word.includes(" "))) {
    formError.textContent = "Escribe una sola palabra en cada campo.";
    return;
  }

  const normalized = words.map((word) => word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    formError.textContent = "No repitas la misma palabra en tu respuesta.";
    return;
  }

  directSend.disabled = true;
  directSend.innerHTML = "Enviando…";

  words.forEach((word) => {
    legacyInput.disabled = false;
    legacyAdd.disabled = false;
    legacyInput.value = word;
    document.querySelector("#word-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

  if (legacySend.disabled) {
    directSend.disabled = false;
    directSend.innerHTML = "Enviar <span aria-hidden=\"true\">→</span>";
    return;
  }

  legacySend.click();
  visibleInputs.forEach((input) => { input.value = ""; });
  directSend.disabled = false;
  directSend.innerHTML = "Enviar <span aria-hidden=\"true\">→</span>";
}

directSend.addEventListener("click", sendAllWords);
visibleInputs.forEach((input, index) => {
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (index < visibleInputs.length - 1 && input.value.trim()) visibleInputs[index + 1].focus();
    else sendAllWords();
  });
});

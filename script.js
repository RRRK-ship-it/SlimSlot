// --- CONFIG ---
console.log("Script geladen"); // debug log
const CONFIG = {
  AUTH_TOKEN: "b8udPRgwzHSE8hubkPcfOqro0zu1pjdK", // bv. "bLynK-abc123..."
  PIN: "V0", // virtuele pin of fysieke pin die jouw SlimSlot bestuurt
  BLYNK_BASE: "https://blynk.cloud/external/api"
};

// --- UI references ---
console.log("DOM elements ophalen...");
const slotEl = document.getElementById("slot");
const doorEl = document.querySelector(".door");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleBtn");
const lastUpdatedEl = document.getElementById("lastUpdated");

if(!slotEl || !doorEl || !statusEl || !toggleBtn || !lastUpdatedEl){
  console.error("Een of meerdere DOM elementen ontbreken!");
} else {
  console.log("Alle DOM elementen gevonden");
}

// state: true = open, false = closed, null = unknown
let currentState = null;
let busy = false;
let pollInterval = null;

/* ---------- helper functions ---------- */

function setUIState(state) {
  console.log("setUIState aangeroepen met state:", state);
  currentState = state;
  slotEl.classList.toggle("open", state === true);
  toggleBtn.disabled = false;
  toggleBtn.setAttribute("aria-pressed", state === true ? "true" : "false");

  if (state === true) {
    statusEl.textContent = "Status: open";
    statusEl.className = "status open";
    toggleBtn.textContent = "Sluit SlimSlot";
  } else if (state === false) {
    statusEl.textContent = "Status: dicht";
    statusEl.className = "status closed";
    toggleBtn.textContent = "Open SlimSlot";
  } else {
    statusEl.textContent = "Status: onbekend";
    statusEl.className = "status unknown";
    toggleBtn.textContent = "Probeer opnieuw";
  }

  lastUpdatedEl.textContent = `Laatste check: ${new Date().toLocaleTimeString()}`;
}

function setBusy(on = true) {
  console.log("setBusy:", on);
  busy = on;
  toggleBtn.disabled = on;
  toggleBtn.textContent = on ? "Laden..." : (currentState ? "Sluit SlimSlot" : "Open SlimSlot");
}

/* ---------- Blynk API calls ---------- */

async function blynkGetPin() {
  console.log("blynkGetPin aangeroepen");
  const url = `${CONFIG.BLYNK_BASE}/get?token=${encodeURIComponent(CONFIG.AUTH_TOKEN)}&${encodeURIComponent(CONFIG.PIN)}`;
  console.log("GET URL:", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arr = await res.json(); // Blynk returns an array of values
  console.log("Blynk GET response:", arr);
  return arr[0];
}

async function blynkSetPin(value) {
  console.log("blynkSetPin aangeroepen met value:", value);
  const url = `${CONFIG.BLYNK_BASE}/update?token=${encodeURIComponent(CONFIG.AUTH_TOKEN)}&${encodeURIComponent(CONFIG.PIN)}=${encodeURIComponent(value)}`;
  console.log("UPDATE URL:", url);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  console.log("Blynk UPDATE response:", text);
  return text;
}

/* ---------- actions ---------- */

async function refreshState() {
  console.log("refreshState aangeroepen");
  try {
    setBusy(true);
    const val = await blynkGetPin(); // verwacht meestal "0" of "1"
    const numeric = parseInt(val);
    if (isNaN(numeric)) {
      console.warn("Waarde van Blynk is geen nummer:", val);
      setUIState(null);
    } else {
      setUIState(numeric === 1);
    }
  } catch (err) {
    console.error("Fout bij ophalen status:", err);
    setUIState(null);
  } finally {
    setBusy(false);
  }
}

async function toggleSlot() {
  console.log("toggleSlot aangeroepen, huidige state:", currentState);
  if (busy) return;
  setBusy(true);
  try {
    const newState = !(currentState === true); // if unknown -> attempt to open
    await blynkSetPin(newState ? 1 : 0);
    setUIState(newState);
    setTimeout(refreshState, 800);
  } catch (err) {
    console.error("Fout bij togglen:", err);
    alert("Fout bij communiceren met Blynk. Controleer token en internetverbinding.");
    setBusy(false);
    setUIState(null);
  }
}

/* ---------- init ---------- */

function init() {
  console.log("init aangeroepen");
  toggleBtn.addEventListener("click", toggleSlot);

  if (!CONFIG.AUTH_TOKEN || CONFIG.AUTH_TOKEN.includes("REPLACE_WITH")) {
    setUIState(null);
    toggleBtn.textContent = "Vul Blynk token in script.js";
    toggleBtn.disabled = true;
    console.warn("Blynk token is niet ingevuld in script.js — vul CONFIG.AUTH_TOKEN in om te gebruiken.");
    return;
  }

  refreshState();
  pollInterval = setInterval(refreshState, 6000);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");
  init();
});

// --- CONFIG ---
// Vervang de waarden hieronder door jouw Blynk gegevens.
// **WAARSCHUWING**: als je deze file met echte token naar een openbare GitHub repo pusht,
// is je token zichtbaar voor iedereen. Gebruik dit alleen voor testen of lokaal.
// Voor productie: maak een veilige proxy / serverless functie om token te beschermen.

const CONFIG = {
  AUTH_TOKEN: "b8udPRgwzHSE8hubkPcfOqro0zu1pjdK", // bv. "bLynK-abc123..."
  PIN: "3", // virtuele pin of fysieke pin die jouw SlimSlot bestuurt
  BLYNK_BASE: "https://blynk.cloud/external/api"
};

// --- UI references ---
const slotEl = document.getElementById("slot");
const doorEl = document.querySelector(".door");
const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggleBtn");
const lastUpdatedEl = document.getElementById("lastUpdated");

// state: true = open, false = closed, null = unknown
let currentState = null;
let busy = false;
let pollInterval = null;

/* ---------- helper functions ---------- */

function setUIState(state) {
  // state: true=open, false=closed, null=unknown
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
  busy = on;
  toggleBtn.disabled = on;
  toggleBtn.textContent = on ? "Laden..." : (currentState ? "Sluit SlimSlot" : "Open SlimSlot");
}

/* ---------- Blynk API calls ---------- */

async function blynkGetPin() {
  // GET current value: /get?token=...&V1
  const url = `${CONFIG.BLYNK_BASE}/get?token=${encodeURIComponent(CONFIG.AUTH_TOKEN)}&${encodeURIComponent(CONFIG.PIN)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arr = await res.json(); // Blynk returns an array of values
  return arr[0];
}

async function blynkSetPin(value) {
  // Update pin: /update?token=...&V1=1  (or value)
  const url = `${CONFIG.BLYNK_BASE}/update?token=${encodeURIComponent(CONFIG.AUTH_TOKEN)}&${encodeURIComponent(CONFIG.PIN)}=${encodeURIComponent(value)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text;
}

/* ---------- actions ---------- */

async function refreshState() {
  try {
    setBusy(true);
    const val = await blynkGetPin(); // verwacht meestal "0" of "1"
    const numeric = parseInt(val);
    if (isNaN(numeric)) {
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
  if (busy) return;
  setBusy(true);
  try {
    const newState = !(currentState === true); // if unknown -> attempt to open
    // send 1 for open, 0 for closed
    await blynkSetPin(newState ? 1 : 0);
    // optimistisch update UI (maar we will re-fetch)
    setUIState(newState);
    // small delay then poll to confirm
    setTimeout(refreshState, 800);
  } catch (err) {
    console.error("Fout bij togglen:", err);
    alert("Fout bij communiceren met Blynk. Controleer token en internetverbinding.");
    setBusy(false);
    // show unknown
    setUIState(null);
  }
}

/* ---------- init ---------- */

function init() {
  // bind
  toggleBtn.addEventListener("click", toggleSlot);

  // basic validation for config
  if (!CONFIG.AUTH_TOKEN || CONFIG.AUTH_TOKEN.includes("REPLACE_WITH")) {
    // Warn but still initialize UI for testing
    setUIState(null);
    toggleBtn.textContent = "Vul Blynk token in script.js";
    toggleBtn.disabled = true;
    console.warn("Blynk token is niet ingevuld in script.js — vul CONFIG.AUTH_TOKEN in om te gebruiken.");
    return;
  }

  // initial fetch
  refreshState();

  // poll every 6 seconden to keep UI in sync (aanpasbaar)
  pollInterval = setInterval(refreshState, 6000);
}

// start
document.addEventListener("DOMContentLoaded", init);

// popup.js — ZoneIn Extension Popup (Simplified)

document.addEventListener("DOMContentLoaded", () => {
 
  // ─── DOM References ─────────────────────────────────────────────────────────
  const authScreen = document.getElementById("authScreen");
  const appScreen  = document.getElementById("appScreen");
  const toggle          = document.getElementById("focusToggle");
  const blockedCountEl  = document.getElementById("blockedCount");
  const watchTimeEl     = document.getElementById("watchTime");
  const dashboardBtn    = document.getElementById("dashboardBtn");
  const focusWarning    = document.getElementById("focusWarning");
  const logoutBtn       = document.getElementById("logoutBtn");
  const webLoginBtn     = document.getElementById("webLoginBtn");

  const DASHBOARD_URL = "http://localhost:5173";

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function formatWatchTime(seconds) {
    if (!seconds) return "0m";
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  function showAuth() {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }

  function showApp() {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
  }

  // ─── Boot: Check if logged in ────────────────────────────────────────────────

  getToken().then((token) => {
    if (token) {
      showApp();
      loadLocalStats();
      getActiveRoadmap().catch(() => {});
    } else {
      showAuth();
    }
  });

  // ─── Actions ─────────────────────────────────────────────────────────────────

  webLoginBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: `${DASHBOARD_URL}/login` });
    window.close(); // Close popup after action
  });

  logoutBtn.addEventListener("click", async () => {
    await logout();
    window.close(); // Close popup after logout
  });

  dashboardBtn.addEventListener("click", async () => {
    const token = await getToken();
    chrome.tabs.create({ 
      url: `${DASHBOARD_URL}?token=${token || ""}` 
    });
  });

  // ─── Local Stats ─────────────────────────────────────────────────────────────

  function loadLocalStats() {
    chrome.storage.local.get(["isFocusMode", "blockedCount", "todayWatchTime"], (result) => {
      const isFocus = result.isFocusMode !== false;
      toggle.checked = isFocus;
      
      if (isFocus) {
        focusWarning.classList.add("hidden");
      } else {
        focusWarning.classList.remove("hidden");
      }

      blockedCountEl.textContent = result.blockedCount || 0;
      watchTimeEl.textContent = formatWatchTime(result.todayWatchTime);
    });
  }

  // ─── Focus Mode Toggle ───────────────────────────────────────────────────────

  toggle.addEventListener("change", (e) => {
    const isFocusMode = e.target.checked;
    
    if (isFocusMode) {
      focusWarning.classList.add("hidden");
    } else {
      focusWarning.classList.remove("hidden");
    }

    chrome.storage.local.set({ isFocusMode }, () => {
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(
            tab.id,
            { type: "TOGGLE_FOCUS_MODE", isFocusMode },
            (response) => { if (chrome.runtime.lastError) {} }
          );
        });
      });
    });
  });

  // ─── Real-time Local Stats Listener ──────────────────────────────────────────

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.token) {
      if (changes.token.newValue) {
        showApp();
        loadLocalStats();
      } else {
        showAuth();
      }
    }
    if (changes.blockedCount) {
      blockedCountEl.textContent = changes.blockedCount.newValue || 0;
    }
    if (changes.todayWatchTime) {
      watchTimeEl.textContent = formatWatchTime(changes.todayWatchTime.newValue);
    }
    if (changes.isFocusMode) {
      toggle.checked = changes.isFocusMode.newValue;
      if (changes.isFocusMode.newValue) {
        focusWarning.classList.add("hidden");
      } else {
        focusWarning.classList.remove("hidden");
      }
    }
  });

});
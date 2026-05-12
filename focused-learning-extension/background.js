// Background service worker for ZoneIn Extension
const API_BASE = "https://zonein-3.onrender.com/api";

// ─── Shared Logic (formerly in api.js) ───────────────────────────────────────

const getToken = async () => {
  const result = await chrome.storage.local.get(["token"]);
  return result.token || null;
};

const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = await getToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? options.body : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status !== 401) {
        console.error(`API Error [${endpoint}]:`, data.message || "API error");
      }
      throw new Error(data.message || "API error");
    }
    return data;
  } catch (error) {
    throw error;
  }
};

const startBackendSession = async (roadmapId, goal, videoTitle = "", videoUrl = "") => {
  const session = await apiFetch("/session/start", {
    method: "POST",
    body: JSON.stringify({ roadmapId, goal, videoTitle, videoUrl }),
  });
  if (session && session._id) {
    await chrome.storage.local.set({ activeSessionId: session._id });
  }
  return session;
};

const updateBackendSession = async (distractionsBlocked, watchTimeSeconds) => {
  const { activeSessionId } = await chrome.storage.local.get(["activeSessionId"]);
  if (!activeSessionId) return null;

  return apiFetch(`/session/${activeSessionId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ distractionsBlocked, watchTimeSeconds }),
  });
};

const logout = async () => {
  await chrome.storage.local.remove(["token", "authUser", "activeSessionId", "cachedRoadmap", "blockedCount", "todayWatchTime", "currentSession"]);
  chrome.action.setBadgeText({ text: "" });
};

// ─── Main State ──────────────────────────────────────────────────────────────

let activeYoutubeTabId = null;
let currentSession = null;
let sessionIdleTimeout = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

async function rehydrateState() {
  const result = await chrome.storage.local.get(["currentSession"]);
  if (result.currentSession) currentSession = result.currentSession;
}

chrome.runtime.onInstalled.addListener(() => {
  initializeStorage();
  chrome.alarms.create("midnightCheck", { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
  rehydrateState();
  checkAndResetDailyStats();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "midnightCheck") {
    checkAndResetDailyStats();
  }
});

rehydrateState();
checkAndResetDailyStats();

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function initializeStorage() {
  chrome.storage.local.get(null, (result) => {
    const today = getTodayString();
    const isFocus = result.isFocusMode === true;
    const needsReset = result.lastResetDate && result.lastResetDate !== today;
    
    chrome.storage.local.set({
      isFocusMode: isFocus,
      blockedCount: needsReset ? 0 : (result.blockedCount || 0),
      watchTime: result.watchTime || 0,
      todayWatchTime: needsReset ? 0 : (result.todayWatchTime || 0),
      lastResetDate: today,
      sessions: result.sessions || [],
      heartbeatCount: result.heartbeatCount || 0
    });
    updateToolbar(isFocus);
  });
}

function checkAndResetDailyStats() {
  chrome.storage.local.get(["lastResetDate"], (result) => {
    const today = getTodayString();
    if (result.lastResetDate && result.lastResetDate !== today) {
      chrome.storage.local.set({
        todayWatchTime: 0,
        blockedCount: 0,
        lastResetDate: today
      });
    }
  });
}

async function updateToolbar(isFocus) {
  const token = await getToken();
  if (!token) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
  const text = isFocus ? "ON" : "OFF";
  const color = isFocus ? "#4facfe" : "#666666";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// ─── Session Management ───────────────────────────────────────────────────────

async function startSession(videoTitle = "", videoUrl = "") {
  // If same video is already active, ignore
  if (currentSession && currentSession.active && currentSession.videoUrl === videoUrl) return;
  
  // If a different video is active, finalize it first
  if (currentSession && currentSession.active) {
    await endCurrentSession();
  }

  const { blockedCount } = await chrome.storage.local.get(["blockedCount"]);
  
  // Emergency reset for runaway count (if > 1000)
  if ((blockedCount || 0) > 1000) {
    await chrome.storage.local.set({ blockedCount: 10 });
  }

  currentSession = {
    active: true,
    startTime: new Date().toISOString(),
    watchTimeSeconds: 0,
    startBlockedCount: (blockedCount > 1000 ? 10 : (blockedCount || 0)),
    videoTitle: videoTitle,
    videoUrl: videoUrl
  };
  
  await chrome.storage.local.set({ currentSession });

  try {
    const token = await getToken();
    if (!token) return;

    const { cachedRoadmap } = await chrome.storage.local.get(["cachedRoadmap"]);
    const session = await startBackendSession(cachedRoadmap?._id, cachedRoadmap?.goal || videoTitle, videoTitle, videoUrl);
    if (session && session._id) {
      currentSession.backendId = session._id;
      await chrome.storage.local.set({ currentSession, activeSessionId: session._id });
    }
  } catch (e) {
    if (e.message !== "Not authorized, no token") {
      console.error("Session Start Failed:", e);
    }
  }
}
async function endCurrentSession() {
  if (!currentSession || !currentSession.active) return;
  try {
    const { blockedCount } = await chrome.storage.local.get("blockedCount");
    const sessionDistractions = Math.max(0, (blockedCount || 0) - (currentSession.startBlockedCount || 0));
    await updateBackendSession(sessionDistractions, currentSession.watchTimeSeconds);
  } catch (e) {
    console.error("End Session Failed:", e);
  } finally {
    currentSession = null;
    await chrome.storage.local.remove(["currentSession", "activeSessionId"]);
  }
}

// ─── Heartbeat & Sync ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VIDEO_PLAYING") {
    startSession(message.videoTitle, message.videoUrl);
    if (sender.tab) activeYoutubeTabId = sender.tab.id;
  } else if (message.type === "PAGE_LOADED") {
    startSession("Browsing YouTube", message.url);
  } else if (message.type === "HEARTBEAT") {
    processHeartbeat(message.seconds || 5, sender.tab?.id);
  } else if (message.type === "TOGGLE_FOCUS_MODE") {
    chrome.storage.local.set({ isFocusMode: message.isFocusMode });
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FOCUS_MODE", isFocusMode: message.isFocusMode });
      });
    });
  } else if (message.type === "LOGOUT") {
    logout();
  } else if (message.type === "FORCE_SYNC_STATS") {
    syncTodayStatsWithBackend(message.blockedCount, message.watchTimeSeconds);
  }
  sendResponse({ status: "ok" });
  return true;
});

// Track active YouTube tab more accurately
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes("youtube.com")) {
      activeYoutubeTabId = tab.id;
    }
  } catch (e) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("youtube.com")) {
    activeYoutubeTabId = tabId;
  }
});

async function processHeartbeat(seconds, tabId) {
  checkAndResetDailyStats(); 
  
  const storage = await chrome.storage.local.get(["blockedCount", "currentSession", "todayWatchTime"]);
  
  // Emergency cleanup for runaway counts in storage
  if ((storage.blockedCount || 0) > 1000) {
    await chrome.storage.local.set({ blockedCount: 0 });
  }

  // If we don't have an active tab yet, or it's been a while, set the current one
  if (tabId && (!activeYoutubeTabId || activeYoutubeTabId === null)) {
    activeYoutubeTabId = tabId;
  }
  
  // Only process heartbeat for the active tab to prevent overcounting.
  // We relax this if only one tab is sending heartbeats.
  if (tabId && activeYoutubeTabId && tabId !== activeYoutubeTabId) {
    // If the "active" tab hasn't sent a heartbeat in 10s, switch to this one
    const now = Date.now();
    if (!globalThis.lastHeartbeatTime || (now - globalThis.lastHeartbeatTime > 10000)) {
      activeYoutubeTabId = tabId;
    } else {
      return;
    }
  }
  globalThis.lastHeartbeatTime = Date.now();

  const result = await chrome.storage.local.get(["watchTime", "todayWatchTime", "isFocusMode", "heartbeatCount", "currentSession"]);
  
  if (result.isFocusMode === false) return;

  const updates = {
    watchTime: (result.watchTime || 0) + seconds,
    todayWatchTime: (result.todayWatchTime || 0) + seconds,
    heartbeatCount: (result.heartbeatCount || 0) + 1
  };

  if (result.currentSession) {
    result.currentSession.watchTimeSeconds += seconds;
    updates.currentSession = result.currentSession;
    
    if (updates.heartbeatCount >= 6) {
      updates.heartbeatCount = 0;
      const { blockedCount } = await chrome.storage.local.get("blockedCount");
      const sessionDistractions = Math.max(0, (blockedCount || 0) - (result.currentSession.startBlockedCount || 0));
      updateBackendSession(sessionDistractions, result.currentSession.watchTimeSeconds);
    }
  }

  await chrome.storage.local.set(updates);

  // Sync with backend every 30 seconds
  if (updates.heartbeatCount === 0) {
    const { blockedCount } = await chrome.storage.local.get("blockedCount");
    syncTodayStatsWithBackend(blockedCount, updates.todayWatchTime);
  }

  // Real-time broadcast to open web dashboard tabs
  const { blockedCount } = await chrome.storage.local.get("blockedCount");
  broadcastStatsToWebTabs(blockedCount, updates.todayWatchTime);
}

async function syncTodayStatsWithBackend(blockedCount, watchTimeSeconds) {
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${API_BASE}/analytics/sync-today-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ blockedCount, watchTimeSeconds })
    });
  } catch (e) {
    console.error("Stats Sync Failed:", e);
  }
}

function broadcastStatsToWebTabs(blockedCount, watchTimeSeconds) {
  chrome.tabs.query({ url: "http://localhost:5173/*" }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: "ZONEIN_STATS_UPDATE",
        blockedCount,
        watchTimeSeconds
      }).catch(() => {}); 
    });
  });
}

// ─── Global State Listeners ──────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isFocusMode) {
    updateToolbar(changes.isFocusMode.newValue);
  }
  if (changes.token) {
    chrome.storage.local.get(["isFocusMode"], (res) => {
      updateToolbar(res.isFocusMode !== false);
    });
  }
});

// SSO Sync from Web
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "SYNC_SESSION" && message.token) {
    chrome.storage.local.set({ 
      token: message.token, 
      authUser: message.user,
      customToken: message.customToken 
    });
    sendResponse({ success: true });
  }
});
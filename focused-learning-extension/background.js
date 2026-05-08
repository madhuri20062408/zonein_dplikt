// Background service worker for ZoneIn Extension
importScripts('api.js');

let activeYoutubeTabId = null;
let currentSession = null;
let sessionIdleTimeout = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Initialize ──────────────────────────────────────────────────────────────

async function rehydrateState() {
  const result = await chrome.storage.local.get(["currentSession"]);
  if (result.currentSession) currentSession = result.currentSession;
}

chrome.runtime.onInstalled.addListener(() => {
  initializeStorage();
  chrome.alarms.create("midnightCheck", { periodInMinutes: 60 });
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

function updateToolbar(isFocus) {
  const text = isFocus ? "ON" : "OFF";
  const color = isFocus ? "#4facfe" : "#666666";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// ─── Session Management ───────────────────────────────────────────────────────

async function startSession(videoTitle = "", videoUrl = "") {
  if (currentSession && currentSession.active) return;

  currentSession = {
    active: true,
    startTime: new Date().toISOString(),
    watchTimeSeconds: 0,
    videoTitle: videoTitle,
    videoUrl: videoUrl
  };
  
  await chrome.storage.local.set({ currentSession });

  try {
    const token = await getToken();
    if (!token) {
      console.log("Not logged in, skipping backend session start.");
      return;
    }

    const { cachedRoadmap } = await chrome.storage.local.get(["cachedRoadmap"]);
    const session = await startBackendSession(cachedRoadmap?._id, cachedRoadmap?.goal || videoTitle, videoTitle, videoUrl);
    if (session && session._id) {
      currentSession.backendId = session._id;
      await chrome.storage.local.set({ currentSession });
    }
  } catch (e) {
    // Only log if it's not a 401
    if (e.message !== "Not authorized, no token") {
      console.error("Session Start Failed:", e);
    }
  }
}

// ─── Heartbeat & Sync ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "VIDEO_PLAYING") {
    // If we're already in a session but the video changed, start a new one
    if (currentSession && currentSession.active && currentSession.videoTitle !== message.videoTitle) {
      // Logic to start new session for the new video
      currentSession = null; 
      startSession(message.videoTitle, message.videoUrl);
    } else {
      startSession(message.videoTitle, message.videoUrl);
    }
    if (sender.tab) activeYoutubeTabId = sender.tab.id;
  } else if (message.type === "HEARTBEAT") {
    processHeartbeat(message.seconds || 5);
  } else if (message.type === "TOGGLE_FOCUS_MODE") {
    chrome.storage.local.set({ isFocusMode: message.isFocusMode });
    // Broadcast to all YouTube tabs
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FOCUS_MODE", isFocusMode: message.isFocusMode });
      });
    });
  } else if (message.type === "LOGOUT") {
    console.log("Remote logout triggered");
    logout(); // This is the clearAuth() wrapper in api.js
  }
  sendResponse({ status: "ok" });
  return true;
});

async function processHeartbeat(seconds) {
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
    
    // Sync every 30 seconds (6 heartbeats of 5s)
    if (updates.heartbeatCount >= 6) {
      updates.heartbeatCount = 0;
      const blocked = await chrome.storage.local.get("blockedCount");
      updateBackendSession(blocked.blockedCount || 0, result.currentSession.watchTimeSeconds);
    }
  }

  await chrome.storage.local.set(updates);
}

// ─── Global State Listeners ──────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isFocusMode) {
    updateToolbar(changes.isFocusMode.newValue);
  }
});
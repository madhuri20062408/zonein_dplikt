// api.js — ZoneIn Extension Backend API Helper
// Shared by background.js, popup.js

const API_BASE = "http://127.0.0.1:5000/api"; // Change to your deployed URL

// ─── Token helpers (chrome.storage.local) ─────────────────────────────────────

const getToken = async () => {
  const result = await chrome.storage.local.get(["token"]);
  return result.token || null;
};

const setToken = (token) => chrome.storage.local.set({ token });

const clearAuth = () =>
  chrome.storage.local.remove(["token", "authUser", "activeSessionId", "cachedRoadmap", "blockedCount", "todayWatchTime", "currentSession"]);

// ─── Base fetch ────────────────────────────────────────────────────────────────

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
      // Don't log 401 errors as they are expected when logged out
      if (response.status !== 401) {
        console.error(`API Error [${endpoint}]:`, data.message || "API error");
      }
      throw new Error(data.message || "API error");
    }
    return data;
  } catch (error) {
    // Silently handle certain errors
    throw error;
  }
};

// ─── Auth ──────────────────────────────────────────────────────────────────────

const login = async (email, password) => {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.token);
  await new Promise((resolve) =>
    chrome.storage.local.set({ authUser: data }, resolve)
  );
  return data;
};

const register = async (name, email, password) => {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  await setToken(data.token);
  await new Promise((resolve) =>
    chrome.storage.local.set({ authUser: data }, resolve)
  );
  return data;
};

const logout = async () => {
  await clearAuth();
  if (chrome.action) {
    chrome.action.setBadgeText({ text: "" });
  }
};

// ─── Roadmap ───────────────────────────────────────────────────────────────────

const getActiveRoadmap = async () => {
  try {
    const roadmap = await apiFetch("/roadmap/active");
    if (roadmap) {
      await new Promise((resolve) => chrome.storage.local.set({ cachedRoadmap: roadmap }, resolve));
    }
    return roadmap;
  } catch (e) {
    // Suppress error if no roadmap found or not authorized
    return null;
  }
};

// ─── Sessions ──────────────────────────────────────────────────────────────────

const startBackendSession = async (roadmapId, goal, videoTitle = "", videoUrl = "") => {
  const session = await apiFetch("/session/start", {
    method: "POST",
    body: JSON.stringify({ roadmapId, goal, videoTitle, videoUrl }),
  });
  if (session && session._id) {
    await new Promise((resolve) =>
      chrome.storage.local.set({ activeSessionId: session._id }, resolve)
    );
  }
  return session;
};

const endBackendSession = async (distractionsBlocked, videosWatched) => {
  const { activeSessionId } = await new Promise((resolve) =>
    chrome.storage.local.get(["activeSessionId"], resolve)
  );
  if (!activeSessionId) return null;

  const result = await apiFetch(`/session/${activeSessionId}/end`, {
    method: "PATCH",
    body: JSON.stringify({ distractionsBlocked, videosWatched }),
  });
  
  await new Promise((resolve) =>
    chrome.storage.local.remove(["activeSessionId"], resolve)
  );
  return result;
};

const updateBackendSession = async (distractionsBlocked, watchTimeSeconds) => {
  const { activeSessionId } = await new Promise((resolve) =>
    chrome.storage.local.get(["activeSessionId"], resolve)
  );
  if (!activeSessionId) return null;

  return apiFetch(`/session/${activeSessionId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ distractionsBlocked, watchTimeSeconds }),
  });
};

// ─── Analytics ─────────────────────────────────────────────────────────────────

const getDashboard = () => apiFetch("/analytics/dashboard");
const getWeeklyData = () => apiFetch("/analytics/weekly");

// ─── Progress ──────────────────────────────────────────────────────────────────

const toggleTopic = (roadmapId, topicId) =>
  apiFetch(`/progress/${roadmapId}/topic/${topicId}`, { method: "PATCH" });

const getProgress = (roadmapId) => apiFetch(`/progress/${roadmapId}`);
console.log("ZONEIN CONTENT SCRIPT LOADED");

let isFocusMode = false;
let hasLoadedFilters = false;
let focusMessageEl = null;
let activeGoalKeywords = []; 
const hiddenElements = new Set();

let heartbeatInterval = null;

function fetchActiveGoal() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_ROADMAP" }, (response) => {
      if (chrome.runtime.lastError || !response || response.error) {
        chrome.storage.local.get(["cachedRoadmap"], (result) => {
          if (result.cachedRoadmap) processRoadmap(result.cachedRoadmap);
          resolve();
        });
        return;
      }
      if (response.roadmap) processRoadmap(response.roadmap);
      resolve();
    });
  });
}

function processRoadmap(roadmap) {
  const goalWords = (roadmap.goal || "").toLowerCase().split(" ");
  const topicWords = (roadmap.topics || [])
    .slice(0, 5)
    .map((t) => t.title.toLowerCase().split(" "))
    .flat();
  const stopWords = ["a", "an", "the", "and", "or", "how", "to", "in", "of", "for", "is", "learn", "video", "youtube"];
  const allWords = [...new Set([...goalWords, ...topicWords])];
  activeGoalKeywords = allWords.filter((w) => w.length > 2 && !stopWords.includes(w));
}

chrome.storage.local.get(["isFocusMode"], async (result) => {
  if (result.isFocusMode !== undefined) isFocusMode = result.isFocusMode;
  await fetchActiveGoal();
  hasLoadedFilters = true;
  if (isFocusMode) applyFilters();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_FOCUS_MODE") {
    isFocusMode = message.isFocusMode;
    if (isFocusMode) {
      fetchActiveGoal().then(() => applyFilters());
    } else {
      removeFilters();
    }
    sendResponse({ success: true });
  } else if (message.type === "CHECK_PLAY_STATE") {
    const video = document.querySelector("video");
    sendResponse({ isPlaying: video ? !video.paused && !video.ended : false });
  } else if (message.type === "ROADMAP_UPDATED") {
    fetchActiveGoal().then(() => { if (isFocusMode) applyFilters(); });
    sendResponse({ success: true });
  }
  return true;
});

// Listen for messages from the web dashboard
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data && event.data.type === "ZONEIN_TOGGLE_FOCUS") {
    const isFocus = event.data.isFocusMode;
    chrome.runtime.sendMessage({ type: "TOGGLE_FOCUS_MODE", isFocusMode: isFocus });
    
    // Also update locally if on YouTube
    if (window.location.host.includes("youtube.com")) {
      isFocusMode = isFocus;
      if (isFocusMode) applyFilters();
      else removeFilters();
    }
  } else if (event.data && event.data.type === "ZONEIN_LOGOUT") {
    console.log("Logout message received from web app");
    chrome.runtime.sendMessage({ type: "LOGOUT" });
  }
});

// Sync token from extension to web app (if on ZoneIn site)
if (window.location.host.includes("localhost:5173") || window.location.host.includes("127.0.0.1:5173")) {
  chrome.storage.local.get(["token"], (result) => {
    if (result.token) {
      if (localStorage.getItem("token") !== result.token) {
        console.log("Syncing token from extension to web app...");
        localStorage.setItem("token", result.token);
        // We don't reload here to avoid loops, the App.jsx interval will catch it
      }
    } else {
      if (localStorage.getItem("token")) {
        console.log("Extension logged out, clearing web app token...");
        localStorage.removeItem("token");
      }
    }
  });

  // Listen for storage changes in the extension
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.token) {
      if (changes.token.newValue) {
        localStorage.setItem("token", changes.token.newValue);
      } else {
        localStorage.removeItem("token");
      }
    }
  });

  // NEW: Sync FROM Web App TO Extension
  const syncToExtension = () => {
    const webToken = localStorage.getItem("token");
    const webUser = localStorage.getItem("authUser");
    
    chrome.storage.local.get(["token", "authUser"], (result) => {
      const updates = {};
      if (webToken && webToken !== result.token && webToken !== "null" && webToken !== "undefined") {
        console.log("Syncing token FROM web app TO extension...");
        updates.token = webToken;
      }
      if (webUser && webUser !== JSON.stringify(result.authUser) && webUser !== "null" && webUser !== "undefined") {
        console.log("Syncing user FROM web app TO extension...");
        try {
          updates.authUser = JSON.parse(webUser);
        } catch (e) {}
      }
      
      if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates);
      }
    });
  };

  // Run on load and every few seconds
  syncToExtension();
  setInterval(syncToExtension, 3000);
}

let debounceTimer;
const observer = new MutationObserver(() => {
  if (!hasLoadedFilters) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    attachVideoListeners();
    if (isFocusMode) applyFilters();
  }, 150);
});
observer.observe(document.documentElement, { childList: true, subtree: true });

function startHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    try {
      if (!chrome.runtime?.id) {
        stopHeartbeat();
        return;
      }
      chrome.runtime.sendMessage({ type: "HEARTBEAT", seconds: 5 }, (response) => {
        if (chrome.runtime.lastError) stopHeartbeat();
      });
    } catch (e) {
      stopHeartbeat();
    }
  }, 5000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function attachVideoListeners() {
  document.querySelectorAll("video").forEach((video) => {
    if (!video.dataset.zoneinTracked) {
      video.dataset.zoneinTracked = "true";
      video.addEventListener("play", () => {
        let videoTitle = "Unknown Video";
        const getTitle = () => {
          const titleEl = document.querySelector("h1.ytd-video-primary-info-renderer, ytd-video-view-count-renderer + h1, .ytp-title-link, #title h1 yt-formatted-string");
          if (titleEl && titleEl.textContent.trim() && titleEl.textContent.trim().toLowerCase() !== "youtube") {
            return titleEl.textContent.trim();
          }
          const docTitle = document.title.replace(/^[(\d+)]\s/, "").replace(" - YouTube", "");
          return (docTitle && docTitle.toLowerCase() !== "youtube") ? docTitle : null;
        };

        videoTitle = getTitle() || "YouTube";

        // If title is generic, try one more time after a short delay
        if (videoTitle === "YouTube") {
          setTimeout(() => {
            try {
              if (!chrome.runtime?.id) return;
              const retryTitle = getTitle();
              if (retryTitle && retryTitle !== "YouTube") {
                const videoUrl = window.location.href;
                chrome.runtime.sendMessage({ type: "VIDEO_PLAYING", videoTitle: retryTitle, videoUrl });
              }
            } catch (e) {}
          }, 2000);
        }
        
        const videoUrl = window.location.href;
        try {
          if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({ type: "VIDEO_PLAYING", videoTitle, videoUrl });
            startHeartbeat();
          }
        } catch (e) {}
      });
      video.addEventListener("pause", () => {
        try {
          if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({ type: "VIDEO_PAUSED" });
          }
        } catch (e) {}
        stopHeartbeat();
      });
      video.addEventListener("ended", () => {
        try {
          if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({ type: "VIDEO_PAUSED" });
          }
        } catch (e) {}
        stopHeartbeat();
      });
      if (!video.paused && !video.ended) startHeartbeat();
    }
  });
}

function incrementBlockedCount(count) {
  if (count <= 0) return;
  chrome.storage.local.get(["blockedCount"], (result) => {
    if (chrome.runtime.lastError) return;
    chrome.storage.local.set({ blockedCount: (result.blockedCount || 0) + count });
  });
}

function applyFilters() {
  let newlyBlocked = 0;
  const currentUrl = window.location.href;
  
  // Inject layout stabilization CSS
  if (!document.getElementById('zonein-styles')) {
    const style = document.createElement('style');
    style.id = 'zonein-styles';
    style.textContent = `
      ytd-video-renderer[data-zonein-blocked="true"], 
      ytd-rich-item-renderer[data-zonein-blocked="true"],
      ytd-ad-slot-renderer,
      ytd-promoted-video-renderer,
      ytd-in-feed-ad-layout-renderer {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  const adSelectors = ["ytd-display-ad-renderer", "ytd-promoted-video-renderer", "ytd-ad-slot-renderer", "ytd-in-feed-ad-layout-renderer"];
  adSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.zoneinBlocked) return;
      el.style.display = "none";
      el.dataset.zoneinBlocked = "true";
      hiddenElements.add(el);
      newlyBlocked++;
    });
  });

  const sidebarSelectors = ["#related", "ytd-watch-next-secondary-results-renderer", ".html5-endscreen", "ytd-reel-shelf-renderer", 'ytd-rich-shelf-renderer[is-shorts]', 'a[title="Shorts"]', 'ytd-mini-guide-entry-renderer[aria-label="Shorts"]'];
  sidebarSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.zoneinBlocked) return;
      el.style.display = "none";
      el.dataset.zoneinBlocked = "true";
      hiddenElements.add(el);
      newlyBlocked++;
    });
  });

  const isHomePage = currentUrl === "https://www.youtube.com/" || currentUrl.startsWith("https://www.youtube.com/?");
  if (isHomePage) {
    ["ytd-rich-grid-renderer", 'ytd-browse[page-subtype="home"]'].forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (el.dataset.zoneinBlocked) return;
        el.style.display = "none";
        el.dataset.zoneinBlocked = "true";
        hiddenElements.add(el);
        newlyBlocked++;
      });
    });
    renderFocusOverlay();
  } else {
    hideFocusOverlay();
  }
  
  let checkKeywords = [...activeGoalKeywords];
  if (currentUrl.includes("/results?search_query=")) {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("search_query");
    if (query && !checkKeywords.includes(query.toLowerCase())) {
      checkKeywords.push(query.toLowerCase());
    }
  }

  const trustedChannels = [
    "freecodecamp", "traversy media", "the net ninja", "fireship", 
    "programming with mosh", "edureka", "simplilearn", "web dev simplified",
    "sentdex", "corey schafer", "mit opencourseware", "harvard university",
    "stanford", "academind", "clever programmer", "apna college",
    "code with harry", "telusko", "krish naik"
  ];

  document.querySelectorAll("ytd-video-renderer, ytd-rich-item-renderer").forEach((video) => {
    const titleEl = video.querySelector("#video-title, #video-title-link");
    const channelEl = video.querySelector("#channel-name, #text.ytd-channel-name");
    
    if (titleEl) {
      const titleText = titleEl.textContent.trim().toLowerCase();
      const channelText = channelEl ? channelEl.textContent.trim().toLowerCase() : "";
      
      const isTrustedChannel = trustedChannels.some((ch) => channelText.includes(ch));
      
      const isRelevantTitle = checkKeywords.some((keyword) => {
        if (keyword.length <= 3) {
          const regex = new RegExp(`\\b${keyword}\\b`, 'i');
          return regex.test(titleText);
        }
        return titleText.includes(keyword);
      });

      const isRelevant = isTrustedChannel || isRelevantTitle;
      
      if (!isRelevant && !video.dataset.zoneinBlocked) {
        video.style.display = "none";
        video.dataset.zoneinBlocked = "true";
        hiddenElements.add(video);
        newlyBlocked++;
      }
      else if (isRelevant && video.dataset.zoneinBlocked) {
        video.style.display = "";
        video.dataset.zoneinBlocked = "";
        hiddenElements.delete(video);
      }
    }
  });

  incrementBlockedCount(newlyBlocked);
}

function renderFocusOverlay() {
  try {
    if (focusMessageEl) { focusMessageEl.style.display = "block"; return; }
    const parent = document.body || document.documentElement;
    if (!parent) { setTimeout(renderFocusOverlay, 100); return; }
    const el = document.createElement("div");
    el.id = "zonein-focus-message";
    const title = document.createElement("h2");
    title.textContent = "Focus Mode is ON";
    title.style.cssText = "margin:0 0 10px;font-size:32px;";
    const sub = document.createElement("p");
    sub.textContent = "Search for a topic to start learning.";
    sub.style.cssText = "margin:0;font-size:20px;color:#cccccc;";
    el.appendChild(title);
    el.appendChild(sub);
    el.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ffffff;z-index:9999;background:#181818;padding:40px 60px;border-radius:16px;border:2px solid #4facfe;box-shadow:0 10px 30px rgba(0,0,0,0.8);text-align:center;font-family:sans-serif;pointer-events:none;display:block;";
    parent.appendChild(el);
    focusMessageEl = el;
  } catch (e) {}
}

function hideFocusOverlay() { if (focusMessageEl) focusMessageEl.style.display = "none"; }

function removeFilters() {
  hiddenElements.forEach((el) => {
    if (el && el.style) {
      el.style.display = "";
      el.dataset.zoneinBlocked = "";
    }
  });
  hiddenElements.clear();
  document.querySelectorAll("ytd-video-renderer, ytd-rich-item-renderer").forEach((el) => {
    el.style.display = "";
    el.dataset.zoneinBlocked = "";
  });
  hideFocusOverlay();
}
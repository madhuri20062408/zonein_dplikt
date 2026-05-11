const Session = require("../models/Session");
const User = require("../models/User");
const Roadmap = require("../models/Roadmap");
const { calculateFocusScore } = require("../services/focusScoreService");
const { calculateStreak } = require("../services/streakService");
const RecentActivity = require("../models/RecentActivity");

// @desc    Start a new study session (called by extension when user opens YouTube)
// @route   POST /api/session/start
// @access  Private
const startSession = async (req, res, next) => {
  try {
    const { roadmapId, goal, videoTitle, videoUrl } = req.body;

    // End any existing active session before starting a new one
    const activeSessions = await Session.find({ user: req.user._id, isActive: true });
    for (const activeSession of activeSessions) {
      activeSession.isActive = false;
      activeSession.endTime = new Date();
      // Ensure focus score is finalized
      const durationSeconds = activeSession.durationMinutes * 60;
      activeSession.focusScore = calculateFocusScore(activeSession.distractionsBlocked, durationSeconds);
      await activeSession.save();
    }

    // Validate roadmapId
    const mongoose = require("mongoose");
    const validRoadmapId = mongoose.Types.ObjectId.isValid(roadmapId) ? roadmapId : null;

    const session = await Session.create({
      user: req.user._id,
      roadmap: validRoadmapId,
      goal: goal || "",
      isActive: true,
      sessionSource: "extension"
    });

    // Sanitize video title for better activity logs
    let activityTitle = videoTitle || "Started Study Session";
    if (activityTitle.toLowerCase() === "youtube") {
      activityTitle = goal ? `Focused on ${goal}` : "Focused Learning Session";
    } else if (videoTitle) {
      activityTitle = `Watched: ${videoTitle}`;
    }

    // Add to recent activity only if watch tracking is enabled
    const userSettings = await User.findById(req.user._id);
    if (userSettings && userSettings.privacySettings && userSettings.privacySettings.watchHistoryTracking !== false) {
      const RecentActivity = require("../models/RecentActivity");
      await RecentActivity.create({
        user: req.user._id,
        activityType: "watched",
        title: activityTitle,
        description: `Topic: ${goal || "General Focus"}`,
        videoUrl: videoUrl || "",
        occurredAt: new Date()
      });
      console.log(`SUCCESS: Activity logged for ${videoTitle || "New Session"}`);
    }

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

// @desc    End an active session & save stats from the extension
// @route   PATCH /api/session/:id/end
// @access  Private
  const endSession = async (req, res, next) => {
  try {
    const { duration_seconds, distractionsBlocked, videosWatched } = req.body;

    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const endTime = new Date();
    
    let durationMinutes = 0;
    if (duration_seconds !== undefined) {
      durationMinutes = Math.round(duration_seconds / 60);
    } else {
      durationMinutes = Math.round(
        (endTime - session.startTime) / 1000 / 60
      );
    }

    session.endTime = endTime;
    session.durationMinutes = durationMinutes;
    session.distractionsBlocked = distractionsBlocked || 0;
    session.videosWatched = videosWatched || 0;
    
    // Focus score logic: duration_seconds is used if provided, otherwise computed seconds
    const focusSeconds = duration_seconds !== undefined ? duration_seconds : (durationMinutes * 60);
    session.focusScore = calculateFocusScore(session.distractionsBlocked, focusSeconds);
    session.isActive = false;

    await session.save();

    // Auto-create RecentActivity
    await RecentActivity.create({
      user: req.user._id,
      activityType: "session_completed",
      title: "Completed Study Session",
      description: `Topic: ${session.goal || "General"}. Focus Score: ${session.focusScore}`,
      occurredAt: new Date()
    });

    // Update user's total study time
    const user = await User.findById(req.user._id);
    user.totalStudyMinutes += durationMinutes;
    user.lastStudyDate = new Date();
    await user.save();

    // Recalculate streak using the service
    const { currentStreak } = await calculateStreak(req.user._id);
    user.focusStreak = currentStreak; // This is redundant as calculateStreak saves it, but for safety in the response:
    
    res.json({
      session,
      userStats: {
        totalStudyMinutes: user.totalStudyMinutes,
        focusStreak: currentStreak,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get the current active session (extension polls this)
// @route   GET /api/session/active
// @access  Private
const getActiveSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      user: req.user._id,
      isActive: true,
    }).populate("roadmap", "goal isActive");

    if (!session) {
      return res.status(404).json({ message: "No active session" });
    }

    res.json(session);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all past sessions for the user
// @route   GET /api/session
// @access  Private
const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      user: req.user._id,
      isActive: false,
      sessionSource: "extension"
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

// @desc    Update progress for an active session (heartbeat from extension)
// @route   PATCH /api/session/:id/progress
// @access  Private
const updateSessionProgress = async (req, res, next) => {
  try {
    const { distractionsBlocked, watchTimeSeconds } = req.body;
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    if (distractionsBlocked !== undefined) {
      session.distractionsBlocked = Math.min(1000, distractionsBlocked);
    }
    
    if (watchTimeSeconds !== undefined) {
      const oldMinutes = session.durationMinutes || 0;
      const newMinutes = Math.round(watchTimeSeconds / 60);
      const delta = newMinutes - oldMinutes;
      
      if (delta > 0) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { totalStudyMinutes: delta } });
      }
      
      session.durationMinutes = newMinutes;
      session.watchTimeSeconds = watchTimeSeconds;
      // Calculate live focus score
      session.focusScore = calculateFocusScore(session.distractionsBlocked, watchTimeSeconds);
    }

    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

module.exports = { startSession, endSession, updateSessionProgress, getActiveSession, getSessions };
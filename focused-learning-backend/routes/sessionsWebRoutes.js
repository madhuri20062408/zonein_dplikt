const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const SubtopicProgress = require("../models/SubtopicProgress");
const User = require("../models/User");
const RecentActivity = require("../models/RecentActivity");
const { calculateFocusScore } = require("../services/focusScoreService");
const { calculateStreak } = require("../services/streakService");
const protect = require("../middleware/auth").protect;

// GET /api/sessions/summary
router.get("/summary", protect, async (req, res, next) => {
  try {
    const sessions = await Session.find({ user: req.user._id, isActive: false, sessionSource: "web" });
    
    let totalMinutes = 0;
    let maxDuration = 0;

    sessions.forEach(s => {
      const mins = s.durationMinutes || 0;
      totalMinutes += mins;
      if (mins > maxDuration) {
        maxDuration = mins;
      }
    });

    const avgMinutes = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;

    res.json({
      totalSessions: sessions.length,
      totalTime: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      avgSessionTime: `${avgMinutes}m`,
      longestSession: `${Math.floor(maxDuration / 60)}h ${maxDuration % 60}m`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sessions/history?page=1&limit=20
router.get("/history", protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const query = { user: req.user._id, isActive: false, sessionSource: "web" };

    const sessions = await Session.find(query)
      .sort({ startTime: -1 }) // Sorted by startTime as requested
      .skip(skip)
      .limit(limit);
      
    const total = await Session.countDocuments(query);

    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sessions/active
router.get("/active", protect, async (req, res, next) => {
  try {
    const session = await Session.findOne({ user: req.user._id, isActive: true, sessionSource: "web" });
    if (!session) {
      return res.status(404).json({ message: "No active session" });
    }
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// POST /api/sessions/start
router.post("/start", protect, async (req, res, next) => {
  try {
    const { goal, subtopics, targetDuration } = req.body;
    
    // End any existing active sessions
    await Session.updateMany(
      { user: req.user._id, isActive: true },
      { isActive: false, endTime: new Date() }
    );

    const session = await Session.create({
      user: req.user._id,
      goal,
      subtopics: subtopics || [],
      targetDuration: targetDuration || null,
      isActive: true,
      sessionSource: "web"
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/sessions/:id/pause
router.patch("/:id/pause", protect, async (req, res, next) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isActive: true },
      { isPaused: true },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/sessions/:id/resume
router.patch("/:id/resume", protect, async (req, res, next) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isActive: true },
      { isPaused: false },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// POST /api/sessions/:id/end
router.post("/:id/end", protect, async (req, res, next) => {
  try {
    // Web sends duration in seconds, convert to minutes for schema
    const { durationSeconds, distractionsBlocked } = req.body;
    
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
      isActive: true
    });

    if (!session) return res.status(404).json({ message: "Session not found or already ended" });

    const endTime = new Date();
    const durationMins = Math.round((durationSeconds || 0) / 60);

    session.endTime = endTime;
    session.durationMinutes = durationMins;
    session.distractionsBlocked = distractionsBlocked || 0;
    session.focusScore = calculateFocusScore(distractionsBlocked || 0, durationSeconds || 0);
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

    // Update user stats
    const user = await User.findById(req.user._id);
    user.totalStudyMinutes += durationMins;
    user.lastStudyDate = new Date();
    await user.save();
    
    // Update streak
    await calculateStreak(req.user._id);

    res.json(session);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/sessions/:id/subtopic
router.patch("/:id/subtopic", protect, async (req, res, next) => {
  try {
    const { index, isCompleted } = req.body;
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    if (session.subtopics && session.subtopics[index]) {
      session.subtopics[index].isCompleted = isCompleted;
      session.markModified("subtopics");
      await session.save();
      
      // Save subtopic progress explicitly if needed
      if (isCompleted) {
        await SubtopicProgress.create({
          session: session._id,
          subtopicName: session.subtopics[index].name,
          isCompleted: true,
          completedAt: new Date()
        });
        
        await RecentActivity.create({
          user: req.user._id,
          activityType: "note_added",
          title: "Completed Subtopic",
          description: `Subtopic: ${session.subtopics[index].name}`,
          occurredAt: new Date()
        });
      }
    }
    
    res.json(session);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sessions/:id
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const session = await Session.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json({ success: true, message: "Session deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

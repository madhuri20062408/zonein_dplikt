const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const SubtopicProgress = require("../models/SubtopicProgress");
const User = require("../models/User");
const Roadmap = require("../models/Roadmap");
const TopicEngagement = require("../models/TopicEngagement");
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
      .sort({ startTime: 1 }) // Sorted by startTime (Ascending) as requested
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
    const { elapsedSeconds } = req.body;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isActive: true },
      { isPaused: true, elapsedSeconds: elapsedSeconds || 0 },
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
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id, isActive: true });
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Reset startTime to (Now - elapsedSeconds) so the total elapsed is preserved
    session.isPaused = false;
    session.startTime = new Date(Date.now() - (session.elapsedSeconds * 1000));
    await session.save();
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
    
    // Check privacy settings before saving history
    const user = await User.findById(req.user._id);
    if (user && user.privacySettings && user.privacySettings.activeTracking === false) {
      // SILENT SKIP: End the session by deleting it or just returning success without saving stats
      await Session.findByIdAndDelete(req.params.id);
      return res.json({ message: "Session ended. Data not saved due to privacy settings.", trackingDisabled: true });
    }

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
    user.totalStudyMinutes += durationMins;
    user.lastStudyDate = new Date();
    await user.save();
    
    // Update streak
    await calculateStreak(req.user._id);

    // NEW: Sync with Roadmap Progress
    // If the session goal matches a topic in an active roadmap, update that topic's progress
    try {
      const activeRoadmap = await Roadmap.findOne({ user: req.user._id, isActive: true });
      if (activeRoadmap) {
        const topic = activeRoadmap.topics.find(t => t.title.toLowerCase() === (session.goal || "").toLowerCase());
        if (topic) {
          // Calculate progress from subtopics
          const totalSubtopics = session.subtopics ? session.subtopics.length : 0;
          const completedSubtopics = session.subtopics ? session.subtopics.filter(s => s.isCompleted).length : 0;
          const sessionProgress = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 100;

          // Find or create engagement
          let engagement = await TopicEngagement.findOne({
            user: req.user._id,
            roadmap: activeRoadmap._id,
            topicId: topic._id.toString()
          });

          if (!engagement) {
            engagement = new TopicEngagement({
              user: req.user._id,
              roadmap: activeRoadmap._id,
              topicId: topic._id.toString(),
              topicTitle: topic.title
            });
          }

          // Update engagement score and completion
          // If subtopics exist, use their completion percentage to influence the engagement score
          if (totalSubtopics > 0) {
            engagement.activeTimePercent = Math.max(engagement.activeTimePercent || 0, sessionProgress);
          } else {
            // If no subtopics, assume completing the session means the topic is well-engaged
            engagement.activeTimePercent = 100;
          }

          engagement.engagementScore = Math.min(100, Math.round(
            (engagement.watchPercentage || 0) * 0.4 + (engagement.activeTimePercent || 0) * 0.3 + (engagement.quizScore || 0) * 0.3
          ));

          // If session progress is 100%, consider marking topic as completed if engagement score is high enough
          if (sessionProgress === 100 && engagement.engagementScore >= 80) {
            engagement.isCompleted = true;
            engagement.completedAt = engagement.completedAt || new Date();
            topic.isCompleted = true;
            topic.completedAt = topic.completedAt || engagement.completedAt;
            await activeRoadmap.save();
          }

          await engagement.save();
          console.log(`Synced session "${session.goal}" with roadmap topic "${topic.title}"`);
        }
      }
    } catch (syncErr) {
      console.error("Failed to sync session with roadmap:", syncErr);
    }

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

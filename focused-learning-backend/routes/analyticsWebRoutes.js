const express = require("express");
const router = express.Router();
const Session = require("../models/Session");
const Roadmap = require("../models/Roadmap");
const RecentActivity = require("../models/RecentActivity");
const User = require("../models/User");
const { calculateStreak } = require("../services/streakService");
const protect = require("../middleware/auth").protect;

// GET /api/analytics/summary
router.get("/summary", protect, async (req, res, next) => {
  try {
    // Record daily visit if not already recorded
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingActivity = await RecentActivity.findOne({
      user: req.user._id,
      activityType: "dashboard_visit",
      occurredAt: { $gte: today }
    });

    if (!existingActivity) {
      await RecentActivity.create({
        user: req.user._id,
        activityType: "dashboard_visit",
        title: "Daily Visit",
        description: "Opened the learning dashboard",
        occurredAt: new Date()
      });
    }

    const sessions = await Session.find({ user: req.user._id });
    
    // Calculate overall stats
    let totalStudyMinutes = 0;
    let distractionsBlocked = 0;
    let totalScore = 0;

    sessions.forEach(s => {
      totalStudyMinutes += (s.durationMinutes || 0);
      distractionsBlocked += (s.distractionsBlocked || 0);
      totalScore += (s.focusScore || 0);
    });

    const avgFocusScore = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0;
    
    // Calculate weekly change
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    let thisWeekMinutes = 0;
    let lastWeekMinutes = 0;
    let thisWeekScoreSum = 0;
    let lastWeekScoreSum = 0;
    let thisWeekSessionsCount = 0;
    let lastWeekSessionsCount = 0;
    let thisWeekDistractions = 0;
    
    sessions.forEach(s => {
      const d = new Date(s.startTime);
      if (d >= oneWeekAgo && d <= now) {
        thisWeekMinutes += (s.durationMinutes || 0);
        thisWeekScoreSum += (s.focusScore || 0);
        thisWeekDistractions += (s.distractionsBlocked || 0);
        thisWeekSessionsCount++;
      } else if (d >= twoWeeksAgo && d < oneWeekAgo) {
        lastWeekMinutes += (s.durationMinutes || 0);
        lastWeekScoreSum += (s.focusScore || 0);
        lastWeekSessionsCount++;
      }
    });

    const thisWeekAvgScore = thisWeekSessionsCount > 0 ? Math.round(thisWeekScoreSum / thisWeekSessionsCount) : 0;
    const lastWeekAvgScore = lastWeekSessionsCount > 0 ? Math.round(lastWeekScoreSum / lastWeekSessionsCount) : 0;
    
    const weeklyStudyHoursChange = ((thisWeekMinutes - lastWeekMinutes) / 60).toFixed(1);
    const weeklyFocusScoreChange = thisWeekAvgScore - lastWeekAvgScore;

    // Get roadmap topics completed count
    const roadmaps = await Roadmap.find({ user: req.user._id });
    let topicsCompleted = 0;
    let totalTopics = 0;
    roadmaps.forEach(r => {
      topicsCompleted += (r.completedTopics || 0);
      totalTopics += (r.totalTopics || 0);
    });

    res.json({
      totalStudyHours: `${Math.floor(totalStudyMinutes / 60)}h ${totalStudyMinutes % 60}m`,
      focusScore: avgFocusScore,
      distractionsBlocked,
      topicsCompleted,
      totalTopics: totalTopics || 1, // avoid division by zero
      weeklyStudyHoursChange: parseFloat(weeklyStudyHoursChange),
      weeklyFocusScoreChange,
      weeklyDistractionsChange: thisWeekDistractions
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/weekly-hours
router.get("/weekly-hours", protect, async (req, res, next) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const sessions = await Session.find({
      user: req.user._id,
      startTime: { $gte: startOfWeek, $lte: endOfWeek }
    });

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dailyMinutes = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    sessions.forEach(s => {
      let d = new Date(s.startTime).getDay();
      let dayName = d === 0 ? "Sun" : days[d - 1]; // map JS getDay (0=Sun) to our array
      dailyMinutes[dayName] += (s.durationMinutes || 0);
    });

    const data = days.map(day => ({
      day: day,
      hours: parseFloat((dailyMinutes[day] / 60).toFixed(1))
    }));

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/monthly-hours?month=4&year=2026 (month is 0-indexed)
router.get("/monthly-hours", protect, async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month !== undefined ? parseInt(req.query.month) : now.getMonth();
    const year = req.query.year !== undefined ? parseInt(req.query.year) : now.getFullYear();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const sessions = await Session.find({
      user: req.user._id,
      startTime: { $gte: startOfMonth, $lte: endOfMonth }
    });

    // Group by actual calendar week of the month (Week 1, Week 2, etc.)
    // Week starts on Monday to align with the weekly chart
    const getWeekOfMonth = (date) => {
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      let dayOfWeekOfFirst = firstDayOfMonth.getDay(); // 0 is Sunday
      const offset = (dayOfWeekOfFirst === 0 ? 6 : dayOfWeekOfFirst - 1);
      return Math.ceil((date.getDate() + offset) / 7);
    };

    const weeklyMinutes = {};
    
    sessions.forEach(s => {
      const date = new Date(s.startTime);
      const weekNumber = getWeekOfMonth(date);
      const key = `Week ${weekNumber}`;
      if (!weeklyMinutes[key]) weeklyMinutes[key] = 0;
      weeklyMinutes[key] += (s.durationMinutes || 0);
    });

    // Generate all weeks for the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const maxWeeks = getWeekOfMonth(lastDayOfMonth);
    
    const data = [];
    for (let i = 1; i <= maxWeeks; i++) {
      const key = `Week ${i}`;
      data.push({
        week: key,
        hours: parseFloat(((weeklyMinutes[key] || 0) / 60).toFixed(1)),
        goal: 10 // Arbitrary target line
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/current-roadmap (Renamed/Updated to return all roadmaps with current topic info)
router.get("/current-roadmap", protect, async (req, res, next) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user._id }).sort({ updatedAt: -1 });
    
    if (!roadmaps || roadmaps.length === 0) {
      return res.json([]);
    }

    const roadmapData = roadmaps.map(roadmap => {
      // Find the first uncompleted topic
      const currentTopic = roadmap.topics.find(t => !t.isCompleted) || roadmap.topics[roadmap.topics.length - 1];
      const currentStep = roadmap.topics.findIndex(t => t._id === currentTopic._id) + 1;

      return {
        roadmapId: roadmap._id,
        roadmapTitle: roadmap.goal,
        currentTopicId: currentTopic._id,
        currentTopicTitle: currentTopic.title,
        currentStep: currentStep,
        completedCount: roadmap.completedTopics,
        totalSteps: roadmap.totalTopics
      };
    });

    res.json(roadmapData);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/dashboard/stats (Used by extension)
router.get("/dashboard/stats", protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    // Record daily visit if not already recorded
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingActivity = await RecentActivity.findOne({
      user: userId,
      activityType: "dashboard_visit",
      occurredAt: { $gte: today }
    });

    if (!existingActivity) {
      await RecentActivity.create({
        user: userId,
        activityType: "dashboard_visit",
        title: "Daily Visit",
        description: "Opened the learning dashboard (Extension)",
        occurredAt: new Date()
      });
    }

    const sessions = await Session.find({ user: userId });
    const { currentStreak, dailyActivity } = await calculateStreak(userId);

    let totalDistractions = 0;
    sessions.forEach(s => {
      totalDistractions += (s.distractionsBlocked || 0);
    });

    res.json({
      streak: currentStreak,
      totalBlocked: totalDistractions,
      totalWatchTime: (user.totalStudyMinutes || 0) * 60, // Extension expects seconds
      dailyActivity: dailyActivity
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/recent-activity
router.get("/recent-activity", protect, async (req, res, next) => {
  try {
    const activities = await RecentActivity.find({ user: req.user._id })
      .sort({ occurredAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const User = require("../models/User");
const RecentActivity = require("../models/RecentActivity");
const RoadmapProgress = require("../models/RoadmapProgress");
const FocusStreak = require("../models/FocusStreak");
const Session = require("../models/Session");
const Roadmap = require("../models/Roadmap");
const TopicEngagement = require("../models/TopicEngagement");
const { calculateStreak } = require("../services/streakService");

// @desc    Get user profile
// @route   GET /api/profile/me
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

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
        description: "Logged in/Opened Profile",
        occurredAt: new Date()
      });
      // Trigger streak update
      await calculateStreak(req.user._id);
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { 
      firstName, lastName, preferredName, 
      phone, state, country, 
      bio, dailyGoal, learningGoals 
    } = req.body;

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.preferredName = preferredName || user.preferredName;
    user.phone = phone || user.phone;
    user.state = state || user.state;
    user.country = country || user.country;
    user.bio = bio || user.bio;
    user.dailyGoal = dailyGoal || user.dailyGoal;
    if (learningGoals) user.learningGoals = learningGoals;

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get study activity (Heatmap data)
// @route   GET /api/profile/activity
// @access  Private
const getStudyActivity = async (req, res) => {
  try {
    // Return sessions for the last year for heatmap
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const activities = await Session.find({
      user: req.user._id,
      startTime: { $gte: oneYearAgo }
    }).select("startTime watchTimeSeconds durationMinutes");

    // Format for heatmap: { date: '2024-05-18', count: 5 }
    const heatmapData = {};
    activities.forEach(session => {
      const d = new Date(session.startTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      const minutes = session.watchTimeSeconds 
        ? Math.floor(session.watchTimeSeconds / 60) 
        : (session.durationMinutes || 0);
      heatmapData[date] = (heatmapData[date] || 0) + minutes;
    });

    const formattedData = Object.keys(heatmapData).map(date => ({
      date,
      count: heatmapData[date]
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get roadmap progress
// @route   GET /api/profile/roadmap/progress
// @access  Private
const getRoadmapProgress = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user._id });
    const engagements = await TopicEngagement.find({ user: req.user._id });

    let completedRoadmaps = 0;
    let inProgressRoadmaps = 0;
    let pendingRoadmaps = 0;
    let totalTopicsCompleted = 0;
    let totalTopicsCount = 0;

    roadmaps.forEach(r => {
      totalTopicsCount += r.totalTopics;
      totalTopicsCompleted += r.completedTopics;

      const roadmapEngagements = engagements.filter(e => e.roadmap.toString() === r._id.toString());
      const hasEngagement = roadmapEngagements.some(e => e.engagementScore > 0 || e.isCompleted);

      if (r.completedTopics === r.totalTopics && r.totalTopics > 0) {
        completedRoadmaps++;
      } else if (r.completedTopics > 0 || hasEngagement) {
        inProgressRoadmaps++;
      } else {
        pendingRoadmaps++;
      }
    });

    const percentage = totalTopicsCount > 0 ? Math.round((totalTopicsCompleted / totalTopicsCount) * 100) : 0;

    res.json({
      completedTopics: completedRoadmaps,
      inProgressTopics: inProgressRoadmaps,
      notStartedTopics: pendingRoadmaps,
      overallPercentage: percentage
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get streak data
// @route   GET /api/profile/streak
// @access  Private
const getStreakData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const recentActivity = await RecentActivity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const { currentStreak, dailyActivity } = await calculateStreak(req.user._id);

    res.json({
      currentStreak,
      recentActivity,
      dailyActivity
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getStudyActivity,
  getRoadmapProgress,
  getStreakData
};

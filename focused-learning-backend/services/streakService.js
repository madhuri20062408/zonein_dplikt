const User = require("../models/User");
const Session = require("../models/Session");
const RecentActivity = require("../models/RecentActivity");

/**
 * Calculates the current study streak for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{currentStreak: number, weeklyActivity: boolean[]}>}
 */
const calculateStreak = async (userId) => {
  const user = await User.findById(userId);
  const allSessions = await Session.find({ user: userId }).sort({ startTime: -1 });
  
  let calculatedStreak = 0;
  
  // Calculate Current Streak
  const sessionDates = allSessions.map(s => new Date(s.startTime).toDateString());
  const activityDates = (await RecentActivity.find({ user: userId })).map(a => new Date(a.occurredAt || a.createdAt).toDateString());
  const dates = [...new Set([...sessionDates, ...activityDates])];

  if (dates.length > 0) {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    let checkDate = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : null);
    
    if (checkDate) {
      let current = new Date(checkDate);
      while (dates.includes(current.toDateString())) {
        calculatedStreak++;
        current.setDate(current.getDate() - 1);
      }
    }
  }

  // Calculate Daily Activity (Last 14 days)
  const dailyActivity = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    const dateStr = d.toDateString();
    dailyActivity.push({
      date: dateStr,
      dayName: ['S','M','T','W','T','F','S'][d.getDay()],
      isActive: dates.includes(dateStr)
    });
  }

  // Update user model if the calculated streak is different
  if (user && user.focusStreak !== calculatedStreak) {
    user.focusStreak = calculatedStreak;
    await user.save();
  }

  return {
    currentStreak: calculatedStreak,
    dailyActivity
  };
};

module.exports = {
  calculateStreak
};

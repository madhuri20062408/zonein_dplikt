const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { 
  getProfile, 
  updateProfile, 
  getStudyActivity, 
  getRoadmapProgress, 
  getStreakData 
} = require("../controllers/profileController");

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);
router.get("/activity", protect, getStudyActivity);
router.get("/roadmap/progress", protect, getRoadmapProgress);
router.get("/streak", protect, getStreakData);

module.exports = router;

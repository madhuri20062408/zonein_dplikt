const mongoose = require("mongoose");

const videoWatchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Roadmap",
    required: true,
  },
  topicId: {
    type: String,
    required: true,
  },
  videoId: {
    type: String,
    required: true,
  },
  videoTitle: String,
  watchSeconds: {
    type: Number,
    default: 0,
  },
  totalSeconds: {
    type: Number,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("VideoWatch", videoWatchSchema);

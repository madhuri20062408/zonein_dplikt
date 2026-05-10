const mongoose = require("mongoose");

const topicEngagementSchema = new mongoose.Schema(
  {
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
    topicTitle: {
      type: String,
      required: true,
    },
    videos: [
      {
        videoId: { type: String, required: true },
        title: String,
        watchSeconds: { type: Number, default: 0 },
        lastWatched: Date,
      },
    ],
    notes: {
      type: String,
      default: "",
    },
    notesSource: {
      type: String,
      enum: ["transcript", "ai_generated", "manual", ""],
      default: "",
    },
    quizQuestions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctIndex: { type: Number, required: true },
      },
    ],
    quizAttempts: [
      {
        answers: [Number],
        score: { type: Number, required: true },
        attemptedAt: { type: Date, default: Date.now },
      },
    ],
    watchPercentage: { type: Number, default: 0 },
    activeTimePercent: { type: Number, default: 0 },
    quizScore: { type: Number, default: 0 },
    engagementScore: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("TopicEngagement", topicEngagementSchema);

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Roadmap = require("../models/Roadmap");
const TopicEngagement = require("../models/TopicEngagement");
const VideoWatch = require("../models/VideoWatch");
const RecentActivity = require("../models/RecentActivity");
const RoadmapProgress = require("../models/RoadmapProgress");
const Note = require("../models/Note");

const axios = require("axios");
const { YoutubeTranscript } = require("youtube-transcript");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Helper for Groq Generations
const generateWithGroq = async (prompt, isJson = false) => {
  try {
    const response = await axios.post(GROQ_URL, {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: isJson ? { type: "json_object" } : undefined
    }, {
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API Error:", error.response?.data || error.message);
    throw new Error("AI Generation failed");
  }
};

// 1. GET /api/roadmap-web/all
router.get("/all", protect, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user._id }).sort({ updatedAt: -1 });
    const formatted = roadmaps.map(r => ({
      _id: r._id,
      goal: r.goal,
      topics: r.topics.map(t => ({ id: t._id, title: t.title, isCompleted: t.isCompleted })),
      totalTopics: r.totalTopics,
      completedTopics: r.completedTopics,
      progressPercent: r.totalTopics > 0 ? Math.round((r.completedTopics / r.totalTopics) * 100) : 0,
      createdAt: r.createdAt,
      lastAccessedAt: r.updatedAt
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET /api/roadmap-web/overall-progress
router.get("/overall-progress", protect, async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user._id });
    const totalTopics = roadmaps.reduce((acc, r) => acc + r.totalTopics, 0);
    
    const engagements = await TopicEngagement.find({ user: req.user._id });
    const completedTopics = engagements.filter(e => e.isCompleted).length;
    const inProgressTopics = engagements.filter(e => e.engagementScore > 0 && !e.isCompleted).length;
    const notStartedTopics = totalTopics - completedTopics - inProgressTopics;
    const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    
    res.json({ completedTopics, inProgressTopics, notStartedTopics, totalTopics, overallPercent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. GET /api/roadmap-web/recent-activity
router.get("/recent-activity", protect, async (req, res) => {
  try {
    const engagements = await TopicEngagement.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(10);
    const regularActivity = await RecentActivity.find({ user: req.user._id }).sort({ occurredAt: -1 }).limit(10);
    
    const mappedEngagements = engagements.map(e => {
      let type = "watched";
      let time = e.updatedAt;
      let videoId = (e.videos && e.videos.length > 0) ? e.videos[e.videos.length - 1].videoId : null;
      
      if (e.isCompleted && e.completedAt) {
        type = "completed";
        time = e.completedAt;
      } else if (e.quizAttempts && e.quizAttempts.length > 0) {
        type = "quiz";
        time = e.quizAttempts[e.quizAttempts.length - 1].attemptedAt;
      }
      return { title: e.topicTitle, type, occurredAt: time, videoId };
    });
    
    const mappedRegular = regularActivity.map(a => ({
      title: a.title,
      type: a.activityType || "activity",
      occurredAt: a.occurredAt,
      videoUrl: a.videoUrl
    }));
    
    const combined = [...mappedEngagements, ...mappedRegular]
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
      .slice(0, 10);
      
    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. POST /api/roadmap-web/generate
router.post("/generate", protect, async (req, res) => {
  const { goal } = req.body;
  if (!goal) return res.status(400).json({ message: "Goal is required" });

  try {
    // Deactivate other roadmaps first
    await Roadmap.updateMany({ user: req.user._id }, { isActive: false });

    const prompt = `You are an expert learning curriculum designer with deep knowledge across all fields including technology, arts, sciences, languages, music, business, and more.
    A student wants to learn: '${goal}'
    Your job is to create a practical, specific 10-topic learning roadmap tailored exactly to this subject.
    STRICT RULES:
    1. Every topic name must be SPECIFIC to '${goal}' — name actual concepts, techniques, tools, or skills from that field
    2. NEVER use generic names like: Introduction, Getting Started, Fundamentals, Basics, Intermediate, Advanced, Overview, Core Concepts, Setting Up, Next Steps
    3. Order topics from beginner to expert logically
    4. Each description must say what the student will actually DO or BE ABLE TO DO after that topic
    5. Think like a professional in that field designing a curriculum for a real student
    Return ONLY a valid JSON object with NO markdown, NO code blocks, NO explanation text before or after.
    Exactly this structure with exactly 10 topics:
    {
      "goal": "${goal}",
      "topics": [
        {
          "id": "1",
          "title": "specific topic name",
          "order": 1,
          "description": "one sentence: what the student will learn and be able to do after this topic"
        }
      ]
    }`;

    const responseText = await generateWithGroq(prompt, true);
    const data = JSON.parse(responseText);

    const roadmap = new Roadmap({
      user: req.user._id,
      goal: data.goal,
      topics: data.topics.map(t => ({
        title: t.title,
        description: t.description,
        order: t.order,
        isCompleted: false
      })),
      totalTopics: data.topics.length,
      isActive: true
    });

    await roadmap.save();
    res.status(201).json(roadmap);
  } catch (error) {
    console.error("Groq Generation Error:", error);
    res.status(500).json({ message: "Failed to generate roadmap: " + error.message });
  }
});

// 5. GET /api/roadmap-web/:roadmapId
router.get("/:roadmapId", protect, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.roadmapId, user: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const engagements = await TopicEngagement.find({ roadmap: roadmap._id, user: req.user._id });
    
    const enrichedTopics = roadmap.topics.map(topic => {
      const engagement = engagements.find(e => e.topicId === topic._id.toString());
      return {
        ...topic.toObject(),
        isCompleted: engagement ? engagement.isCompleted : topic.isCompleted,
        engagementScore: engagement ? engagement.engagementScore : 0
      };
    });

    const roadmapObj = roadmap.toObject();
    roadmapObj.topics = enrichedTopics;
    roadmapObj.progressPercent = roadmap.totalTopics > 0 ? Math.round((roadmap.completedTopics / roadmap.totalTopics) * 100) : 0;
    
    res.json(roadmapObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 6. PATCH /api/roadmap-web/:roadmapId/topic/:topicId/complete
router.patch("/:roadmapId/topic/:topicId/complete", protect, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.roadmapId, user: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const topic = roadmap.topics.id(req.params.topicId);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    let engagement = await TopicEngagement.findOne({
      user: req.user._id,
      roadmap: roadmap._id,
      topicId: topic._id.toString()
    });

    if (!engagement) {
      engagement = new TopicEngagement({
        user: req.user._id,
        roadmap: roadmap._id,
        topicId: topic._id.toString(),
        topicTitle: topic.title
      });
    }

    engagement.isCompleted = !engagement.isCompleted;
    engagement.completedAt = engagement.isCompleted ? new Date() : null;
    await engagement.save();

    topic.isCompleted = engagement.isCompleted;
    topic.completedAt = engagement.completedAt;
    await roadmap.save();

    const activityData = {
      title: topic.title,
      type: engagement.isCompleted ? "completed" : "watched",
      occurredAt: engagement.completedAt || new Date()
    };
    if (req.io) req.io.to(req.user._id.toString()).emit("activity", activityData);

    res.json(engagement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 7. GET /api/roadmap-web/:roadmapId/topic/:topicId
router.get("/:roadmapId/topic/:topicId", protect, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.roadmapId, user: req.user._id });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const topic = roadmap.topics.id(req.params.topicId);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    let engagement = await TopicEngagement.findOne({
      user: req.user._id,
      roadmap: roadmap._id,
      topicId: topic._id.toString()
    });

    if (!engagement) {
      engagement = await TopicEngagement.create({
        user: req.user._id,
        roadmap: roadmap._id,
        topicId: topic._id.toString(),
        topicTitle: topic.title
      });
    }

    const videoWatches = await VideoWatch.find({
      user: req.user._id,
      topicId: topic._id.toString()
    }).sort({ watchSeconds: -1 });

    const primaryVideo = videoWatches[0] || null;

    res.json({
      topicTitle: topic.title,
      description: topic.description,
      engagement,
      primaryVideo,
      watchPercentage: engagement.watchPercentage,
      activeTimePercent: engagement.activeTimePercent,
      quizScore: engagement.quizScore,
      engagementScore: engagement.engagementScore,
      isCompleted: engagement.isCompleted,
      notes: engagement.notes,
      notesSource: engagement.notesSource,
      quizQuestions: engagement.quizQuestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 8. PATCH /api/roadmap-web/:roadmapId/topic/:topicId (Save Notes)
router.patch("/:roadmapId/topic/:topicId", protect, async (req, res) => {
  const { notes } = req.body;
  try {
    const engagement = await TopicEngagement.findOneAndUpdate(
      { user: req.user._id, roadmap: req.params.roadmapId, topicId: req.params.topicId },
      { $set: { notes, notesSource: "manual" } },
      { new: true }
    );
    res.json(engagement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 9. POST /api/roadmap-web/:roadmapId/topic/:topicId/video-watch
router.post("/:roadmapId/topic/:topicId/video-watch", protect, async (req, res) => {
  const { videoId, videoTitle, watchSeconds, totalSeconds } = req.body;
  if (!videoId || !totalSeconds) return res.status(400).json({ message: "Missing videoId or totalSeconds" });

  try {
    const videoWatch = await VideoWatch.findOneAndUpdate(
      { user: req.user._id, topicId: req.params.topicId, videoId },
      { 
        $inc: { watchSeconds: watchSeconds },
        $set: { videoTitle, totalSeconds, lastUpdated: new Date(), roadmap: req.params.roadmapId }
      },
      { upsert: true, new: true }
    );

    const allWatches = await VideoWatch.find({ user: req.user._id, topicId: req.params.topicId });
    const maxWatchVideo = allWatches.sort((a, b) => b.watchSeconds - a.watchSeconds)[0];
    const watchPercentage = Math.min(100, Math.round((maxWatchVideo.watchSeconds / maxWatchVideo.totalSeconds) * 100));

    const engagement = await TopicEngagement.findOne({ user: req.user._id, topicId: req.params.topicId });
    if (engagement) {
      engagement.watchPercentage = watchPercentage;
      engagement.engagementScore = Math.min(100, Math.round(
        watchPercentage * 0.4 + engagement.activeTimePercent * 0.3 + engagement.quizScore * 0.3
      ));
      await engagement.save();
    }

    if (req.io) {
      req.io.to(req.user._id.toString()).emit("activity", {
        title: videoTitle,
        type: "watched",
        videoId: videoId,
        occurredAt: new Date()
      });
    }

    res.json({ videoWatch, engagementScore: engagement?.engagementScore || 0, watchPercentage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 10. POST /api/roadmap-web/:roadmapId/topic/:topicId/generate-notes
router.post("/:roadmapId/topic/:topicId/generate-notes", protect, async (req, res) => {
  try {
    const engagement = await TopicEngagement.findOne({ user: req.user._id, topicId: req.params.topicId });
    if (!engagement) return res.status(404).json({ message: "Engagement not found" });

    const videoWatches = await VideoWatch.find({ user: req.user._id, topicId: req.params.topicId }).sort({ watchSeconds: -1 });
    const primaryVideo = videoWatches[0];

    const notesFormat = `Structure the notes as follows:
    1. # [Topic Title] - clear bold title
    2. ## Quick Overview - 2-3 sentence summary
    3. ## Key Concepts - bullet points with bold terms
    4. ## Detailed Breakdown - sub-sections with ### headings
    5. ## Important Formulas/Definitions - critical rules
    6. ## Final Takeaway - pro-tip or summary
    Keep tone professional and encouraging. Use Markdown.`;

    let notes = "";
    let notesSource = "";

    if (primaryVideo) {
      try {
        const transcriptArr = await YoutubeTranscript.fetchTranscript(primaryVideo.videoId);
        const fullTranscript = transcriptArr.map(t => t.text).join(" ");
        
        if (GROQ_API_KEY) {
          const prompt = `Convert the following transcript into comprehensive study notes for the topic "${engagement.topicTitle}".
          Transcript: ${fullTranscript.substring(0, 8000)}
          ${notesFormat}`;
          notes = await generateWithGroq(prompt);
          notesSource = "ai_generated";
        } else {
          notes = fullTranscript.substring(0, 3000);
          notesSource = "transcript";
        }
      } catch (e) {
        console.error("Transcript fetch failed, falling back to pure AI", e);
      }
    }

    if (!notes) {
      const prompt = `Generate comprehensive study notes for the topic "${engagement.topicTitle}".
      ${notesFormat}`;
      notes = await generateWithGroq(prompt);
      notesSource = "ai_generated";
    }

    engagement.notes = notes;
    engagement.notesSource = notesSource;
    await engagement.save();

    res.json({ notes, notesSource });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 11. POST /api/roadmap-web/:roadmapId/topic/:topicId/generate-quiz
router.post("/:roadmapId/topic/:topicId/generate-quiz", protect, async (req, res) => {
  try {
    const engagement = await TopicEngagement.findOne({ user: req.user._id, topicId: req.params.topicId });
    if (!engagement) return res.status(404).json({ message: "Engagement not found" });
    if (!engagement.notes) return res.status(400).json({ message: "Generate notes first" });

    const prompt = `Based on these notes: ${engagement.notes.substring(0, 4000)}
    Generate exactly 5 multiple choice questions for the topic "${engagement.topicTitle}".
    Return ONLY a JSON array, nothing else. Do not include markdown code blocks.
    Structure:
    [
      {
        "question": "string",
        "options": ["string","string","string","string"],
        "correctIndex": 0
      }
    ]`;

    const responseText = await generateWithGroq(prompt, true);
    let quizQuestions = JSON.parse(responseText);
    
    if (!Array.isArray(quizQuestions) && quizQuestions.questions) {
      quizQuestions = quizQuestions.questions;
    }

    engagement.quizQuestions = quizQuestions;
    await engagement.save();

    res.json({ quizQuestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 12. POST /api/roadmap-web/:roadmapId/topic/:topicId/submit-quiz
router.post("/:roadmapId/topic/:topicId/submit-quiz", protect, async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ message: "Answers must be an array" });

  try {
    const engagement = await TopicEngagement.findOne({ user: req.user._id, topicId: req.params.topicId });
    if (!engagement || !engagement.quizQuestions.length) return res.status(400).json({ message: "No quiz questions found" });

    let correct = 0;
    engagement.quizQuestions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });

    const score = Math.round((correct / engagement.quizQuestions.length) * 100);
    engagement.quizAttempts.push({ answers, score });
    engagement.quizScore = score;
    engagement.engagementScore = Math.min(100, Math.round(
      engagement.watchPercentage * 0.4 + engagement.activeTimePercent * 0.3 + score * 0.3
    ));
    await engagement.save();

    if (req.io) {
      req.io.to(req.user._id.toString()).emit("activity", {
        title: engagement.topicTitle,
        type: "quiz",
        occurredAt: new Date()
      });
    }

    res.json({ score, correctAnswers: correct, totalQuestions: engagement.quizQuestions.length, engagementScore: engagement.engagementScore });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 13. DELETE /api/roadmap-web/:roadmapId
router.delete("/:roadmapId", protect, async (req, res) => {
  console.log("Backend: Deleting roadmap:", req.params.roadmapId, "for user:", req.user._id);
  try {
    const roadmap = await Roadmap.findOneAndDelete({ _id: req.params.roadmapId, user: req.user._id });
    if (!roadmap) {
      console.log("Backend: Roadmap not found or unauthorized");
      return res.status(404).json({ message: "Roadmap not found" });
    }

    console.log("Backend: Deleting linked data for roadmap:", roadmap._id);
    await TopicEngagement.deleteMany({ roadmap: roadmap._id, user: req.user._id });
    await VideoWatch.deleteMany({ roadmap: roadmap._id, user: req.user._id });
    await RoadmapProgress.deleteMany({ roadmap: roadmap._id, user: req.user._id });
    await Note.deleteMany({ roadmap: roadmap._id, user: req.user._id });

    console.log("Backend: Roadmap and linked data deleted successfully");
    res.json({ 
      success: true, 
      message: `Roadmap "${roadmap.goal}" and all its linked progress and notes have been deleted.`,
      deletedId: roadmap._id 
    });
  } catch (error) {
    console.error("Backend: Delete error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

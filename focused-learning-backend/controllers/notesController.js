const Note = require("../models/Note");
const { generateVideoSummary } = require("../services/aiService");

// @desc    Save a manual note or trigger AI summary
// @route   POST /api/notes
// @access  Private
const createNote = async (req, res, next) => {
  try {
    const { roadmapId, topicId, videoId, videoTitle, type, content, videoDescription } = req.body;

    let finalContent = content;

    // If type is ai_summary and no content provided, generate it
    if (type === "ai_summary" && !content && videoTitle) {
      finalContent = await generateVideoSummary(
        videoTitle,
        videoDescription || videoTitle
      );
    }

    if (!finalContent) {
      return res.status(400).json({ message: "Note content is required" });
    }

    const noteData = {
      user: req.user._id,
      roadmap: roadmapId || null,
      topicId: topicId || null,
      videoId: videoId || null,
      videoTitle: videoTitle || "",
      type: type || "manual_note",
      content: finalContent,
    };

    let note;
    if (topicId) {
      // Sync/Update if it's a topic note
      note = await Note.findOneAndUpdate(
        { user: req.user._id, topicId },
        noteData,
        { new: true, upsert: true }
      );
    } else {
      note = await Note.create(noteData);
    }

    res.status(201).json({ success: true, note });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notes for a roadmap (or all notes if no roadmapId)
// @route   GET /api/notes/:roadmapId
// @access  Private
const getNotes = async (req, res, next) => {
  try {
    const query = { user: req.user._id };

    if (req.params.roadmapId && req.params.roadmapId !== "all") {
      query.roadmap = req.params.roadmapId;
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.json({ success: true, notes });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createNote, getNotes, deleteNote };
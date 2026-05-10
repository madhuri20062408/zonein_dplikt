require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const admin = require("firebase-admin");

// Initialize Firebase Admin
require("./firebaseAdmin");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

connectDB();

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend running",
  });
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/roadmap", require("./routes/roadmapRoutes"));
app.use("/api/roadmap-web", require("./routes/roadmapWebRoutes"));
app.use("/api/session", require("./routes/sessionRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/analytics", require("./routes/analyticsWebRoutes"));
app.use("/api/sessions", require("./routes/sessionsWebRoutes"));
app.use("/api/sessions-web", require("./routes/sessionsWebRoutes"));
app.use("/api/notes", require("./routes/notesRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));

// Socket.io for study session timer sync
const studySessionNamespace = io.of("/study-session");
studySessionNamespace.on("connection", (socket) => {
  socket.on("session:tick", (data) => {
    // broadcast or process if needed
    // The prompt says "Socket.io syncs timer: emit session:tick every second"
  });
  socket.on("session:ended", () => {
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
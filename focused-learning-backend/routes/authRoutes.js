const express = require("express");
const router = express.Router();
const { register, login, getMe, sync } = require("../controllers/authController");
const protect = require("../middleware/auth").protect;

// Define the endpoints
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/sync", protect, sync);

module.exports = router;
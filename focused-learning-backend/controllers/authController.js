const User = require("../models/User");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: "firebase-managed", // Token is managed by Firebase Client
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      focusStreak: user.focusStreak,
      totalStudyMinutes: user.totalStudyMinutes,
      token: "firebase-managed",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

// @desc    Sync Firebase user with MongoDB
// @route   POST /api/auth/sync
// @access  Private
const sync = async (req, res, next) => {
  try {
    const { firstName, lastName, preferredName, contact, state, country } = req.body;
    
    const user = req.user;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (preferredName) user.preferredName = preferredName;
    if (contact) user.contact = contact;
    if (state) user.state = state;
    if (country) user.country = country;
    
    // Update display name if first and last name are provided
    if (firstName && lastName) {
      user.name = `${firstName} ${lastName}`;
    }

    await user.save();
    res.json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, sync };
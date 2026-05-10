const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    firstName: String,
    lastName: String,
    preferredName: String,
    contact: String,
    state: String,
    country: String,
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls for legacy users
    },
    totalStudyMinutes: {
      type: Number,
      default: 0,
    },
    focusStreak: {
      type: Number,
      default: 0,
    },
    lastStudyDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (e) {
    return false;
  }
};

module.exports = mongoose.model("User", userSchema);
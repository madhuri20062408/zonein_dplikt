const mongoose = require('mongoose');
const Roadmap = require('./focused-learning-backend/models/Roadmap');
const User = require('./focused-learning-backend/models/User');

const MONGO_URI = "mongodb+srv://thanm\u0061hi10_db_user:7dC42KENpc3FpcYA@focuslearncluster.kcnipkb.mongodb.net/?appName=focuslearnCluster";

async function checkRoadmaps() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const user = await User.findOne({ email: 'thanm\u0061hi10@gmail.com' });
    if (!user) {
      console.log("User not found");
      return;
    }

    const roadmaps = await Roadmap.find({ user: user._id });
    console.log(`Found ${roadmaps.length} roadmaps for user: ${user.email}`);
    roadmaps.forEach(r => {
      console.log(`- ID: ${r._id}, Goal: ${r.goal}`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
  }
}

checkRoadmaps();

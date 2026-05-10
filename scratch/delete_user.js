const mongoose = require('mongoose');
const admin = require('./focused-learning-backend/firebaseAdmin');
const User = require('./focused-learning-backend/models/User');
require('dotenv').config({ path: './focused-learning-backend/.env' });

const deleteUser = async (email) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Delete from MongoDB
    const mongoUser = await User.findOneAndDelete({ email });
    if (mongoUser) {
      console.log(`Deleted user ${email} from MongoDB`);
    } else {
      console.log(`User ${email} not found in MongoDB`);
    }

    // 2. Delete from Firebase
    try {
      const firebaseUser = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(firebaseUser.uid);
      console.log(`Deleted user ${email} from Firebase`);
    } catch (fbErr) {
      if (fbErr.code === 'auth/user-not-found') {
        console.log(`User ${email} not found in Firebase`);
      } else {
        console.error('Firebase deletion error:', fbErr);
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
  }
};

deleteUser('alekhyapuram24@gmail.com');

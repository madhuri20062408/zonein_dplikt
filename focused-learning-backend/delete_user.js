const mongoose = require('mongoose');
const admin = require('./firebaseAdmin');
const User = require('./models/User');
require('dotenv').config();

const deleteUsers = async (emails) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const email of emails) {
      console.log(`\nProcessing: ${email}`);
      
      // 1. Delete from MongoDB
      const mongoUser = await User.findOneAndDelete({ email });
      if (mongoUser) {
        console.log(`- Deleted from MongoDB`);
      } else {
        console.log(`- Not found in MongoDB`);
      }

      // 2. Delete from Firebase
      try {
        const firebaseUser = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(firebaseUser.uid);
        console.log(`- Deleted from Firebase`);
      } catch (fbErr) {
        if (fbErr.code === 'auth/user-not-found') {
          console.log(`- Not found in Firebase`);
        } else {
          console.error(`- Firebase error:`, fbErr.message);
        }
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (err) {
    console.error('Error:', err);
  }
};

deleteUsers(['alekhyapuram24@gmail.com', 'thanmahiperuri@gmail.com']);

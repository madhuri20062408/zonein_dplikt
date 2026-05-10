const mongoose = require('mongoose');
const admin = require('../firebaseAdmin');
require('dotenv').config({ path: './.env' });

async function clearAllData() {
  try {
    console.log('Starting total database and auth clear...');

    // 1. Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Clear MongoDB Collections
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      const count = await collection.countDocuments();
      await collection.deleteMany({});
      console.log(`🗑️  Cleared collection "${collection.collectionName}" (${count} documents removed)`);
    }

    // 3. Clear Firebase Users
    console.log('🔍 Listing Firebase Users...');
    let totalDeleted = 0;
    let listUsersResult = await admin.auth().listUsers(1000);
    
    while (listUsersResult.users.length > 0) {
      const uids = listUsersResult.users.map(u => u.uid);
      await admin.auth().deleteUsers(uids);
      totalDeleted += uids.length;
      console.log(`🗑️  Deleted ${uids.length} Firebase users...`);
      listUsersResult = await admin.auth().listUsers(1000);
    }
    
    console.log(`✅ Total Firebase users deleted: ${totalDeleted}`);
    console.log('\n✨ FACTORY RESET COMPLETE. All accounts and data have been wiped.');
    process.exit(0);
  } catch (err) {
    console.error('❌ FATAL ERROR during data clear:', err);
    process.exit(1);
  }
}

clearAllData();

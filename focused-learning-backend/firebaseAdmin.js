const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin Initialized from Module");
  } catch (error) {
    console.error("❌ Firebase Admin Init Error in Module:", error.message);
  }
}

module.exports = admin;

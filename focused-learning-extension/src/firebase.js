import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBNQg4KqKbPrWAbOyrvOPOIo31JH2lHN9U",
  authDomain: "zonein-e7f1e.firebaseapp.com",
  projectId: "zonein-e7f1e",
  storageBucket: "zonein-e7f1e.firebasestorage.app",
  messagingSenderId: "305905262561",
  appId: "1:305905262561:web:6c461c06f00686eaa7bca0",
  measurementId: "G-4LQYW3G9MF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

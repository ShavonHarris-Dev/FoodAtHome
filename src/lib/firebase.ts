import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA-XIUYWa-FLCJFop8KnHrbKbm1yO6Z5jc",
  authDomain: "food-at-home-b97e7.firebaseapp.com",
  projectId: "food-at-home-b97e7",
  storageBucket: "food-at-home-b97e7.firebasestorage.app",
  messagingSenderId: "815404312857",
  appId: "1:815404312857:web:142b7d0c734b0f4a8fbd88",
  measurementId: "G-MGSXDR8L1N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
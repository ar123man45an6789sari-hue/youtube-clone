import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDXzNbrgRDjQ1K9zI2Dm3T8kFOknkKPE4g",
  authDomain: "clone-41f29.firebaseapp.com",
  projectId: "clone-41f29",
  storageBucket: "clone-41f29.firebasestorage.app",
  messagingSenderId: "130015963544",
  appId: "1:130015963544:web:eb5739658bd99025e3e3ed"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;
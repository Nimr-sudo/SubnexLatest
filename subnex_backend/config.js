
const { initializeApp } = require('firebase/app');
const { getFirestore, collection } = require('firebase/firestore');

// Your Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4u0r_zvGQ8eT5LgLZYSLVA0z1mjPmBik",
  authDomain: "subnexproject-b0296.firebaseapp.com",
  projectId: "subnexproject-b0296",
  storageBucket: "subnexproject-b0296.appspot.com",
  messagingSenderId: "58718181857",
  appId: "1:58718181857:web:723b8949c87ab73f4a9aa0",
  measurementId: "G-L205FJQ3E4"
};

// Initialize Firebase with your configuration
const firebaseApp = initializeApp(firebaseConfig);

// Get the Firestore instance
const db = getFirestore(firebaseApp);

// Use collection to access Firestore collections
const Job = collection(db, "Jobs");
const User = collection(db,"Users")

// Export the Job collection for use in other modules
module.exports = {Job, User};

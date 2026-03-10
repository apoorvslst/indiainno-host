const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');

dotenv.config();

// Usually we'd use a service account JSON file, but for rapid prototyping 
// we will just use the normal web API keys if admin init fails, or 
// preferably initialize without credentials if running on GCP. 
// However, since we need to write to Firestore from this local backend,
// we will try to use the Firebase Web SDK from the backend for simplicity in this demo,
// OR require the user to drop a service-account.json.

// Since we are mocking/rapid-prototyping, we use the client SDK in node 
// to avoid setting up service accounts just for the hackathon.
const { initializeApp: initClient } = require('firebase/app');
const { getFirestore: getClientFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, increment } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDUWTTc69K1LZmykSiqec_LNCr_lXNGKHA",
    authDomain: "indiainno-19bc5.firebaseapp.com",
    projectId: "indiainno-19bc5",
    storageBucket: "indiainno-19bc5.firebasestorage.app",
    messagingSenderId: "120183157834",
    appId: "1:120183157834:web:1a34a65852b64a27e6e2b3"
};

const app = initClient(firebaseConfig);
const db = getClientFirestore(app);

module.exports = {
    db,
    collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, increment
};

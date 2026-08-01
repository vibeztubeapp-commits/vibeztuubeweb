import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAoUIT68gc4miCKot7iztgdV-nG6tNo044",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "vibeztube-dev-bc81c.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vibeztube-dev-bc81c",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "vibeztube-dev-bc81c.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "889698576592",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:889698576592:web:76c5f9b3abbec2a0c996d5",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = {} as any
export const storage = {} as any

export const firebaseRuntimeConfig = {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
}

export default app

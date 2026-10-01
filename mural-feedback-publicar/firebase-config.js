window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBjAIFhG_kDnmZ0C19V2YTmB6AzwkMImOE",
  authDomain: "feedback-7fbf4.firebaseapp.com",
  projectId: "feedback-7fbf4",
  storageBucket: "feedback-7fbf4.firebasestorage.app",
  messagingSenderId: "228137275928",
  appId: "1:228137275928:web:49af926708702944ae696d",
  measurementId: "G-C0CT7403BM"
};

const requestedSession = new URLSearchParams(window.location.search).get("sesion") || "liderazgo-empoderamiento";
window.MURAL_SESSION_ID = requestedSession
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 60) || "liderazgo-empoderamiento";

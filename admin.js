import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth,
      document.getElementById("email").value.trim(),
      document.getElementById("password").value
    );
    message.textContent = "Login successful.";
    window.location.href = "admin-dashboard.html";
  } catch (error) {
    message.textContent = error.code === "auth/invalid-credential"
      ? "Invalid email or password."
      : error.message;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user && location.pathname.endsWith("admin.html")) {
    // Keep login page usable; successful login redirects above.
  }
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const status = document.getElementById("status");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "admin.html";
    return;
  }
  status.textContent = `Signed in as ${user.email}`;
});

document.getElementById("logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "admin.html";
});

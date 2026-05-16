body {
  margin: 0;
  background: #03151b;
  color: white;
  font-family: Arial, sans-serif;
}

.login-container,
.dashboard {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card,
.campaign-card {
  background: rgba(0,0,0,0.3);
  border: 1px solid #0ff;
  padding: 2rem;
  border-radius: 12px;
}

input {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  background: transparent;
  border: 1px solid #0ff;
  color: white;
}

button {
  margin-top: 16px;
  padding: 12px 24px;
  background: #0ff;
  border: none;
  cursor: pointer;
}import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

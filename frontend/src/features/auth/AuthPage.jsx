import { useState } from "react";
import "./AuthPage.css";
import { loginUser, signupUser } from "../../api/authApi";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const handleSignupSubmit = async (formValues) => {
    setMessage("");

    try {
      const { response, data } = await signupUser(formValues);

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Signup failed");
        return;
      }

      
      onLoginSuccess(data.user);
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  const handleLoginSubmit = async (formValues) => {
    setMessage("");

    try {
      const { response, data } = await loginUser(formValues);

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Login failed");
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Speed Person Tracker Home Security</h1>
        <p className="auth-subtitle">
          {mode === "login" ? "Login to continue" : "Create your account"}
        </p>

        <div className="auth-switch">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        {mode === "login" ? (
          <LoginForm onSubmit={handleLoginSubmit} />
        ) : (
          <SignupForm onSubmit={handleSignupSubmit} />
        )}
      </div>
    </div>
  );
}

export default AuthPage;
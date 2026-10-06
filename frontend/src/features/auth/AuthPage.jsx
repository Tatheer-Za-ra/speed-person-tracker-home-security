// frontend/src/features/auth/AuthPage.jsx

import React, { useState } from "react";
import { ShieldCheck, Cpu } from "lucide-react";
import "./AuthPage.css";
import { loginUser, signupUser } from "../../api/authApi";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  const handleSignupSubmit = async (formValues) => {
    setMessage("");
    setLoading(true);

    try {
      const { response, data } = await signupUser(formValues);

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Signup failed. Please try again.");
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (formValues) => {
    setMessage("");
    setLoading(true);

    try {
      const { response, data } = await loginUser(formValues);

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Invalid credentials. Please verify email and password.");
        return;
      }

      onLoginSuccess(data.user);
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Left Column: Dark Canvas with Brand Header + Floating White Auth Card */}
      <div className="auth-left-pane">
        {/* Top-Left Brand Emblem & Title */}
        <div className="auth-brand-header">
          <div className="auth-brand-emblem">
            <ShieldCheck size={24} className="auth-emblem-icon" />
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-name">
              Haven<span className="auth-brand-accent">Track</span>
            </span>
            <span className="auth-brand-tagline">AI RESIDENTIAL SECURITY</span>
          </div>
        </div>

        {/* Floating White Auth Card */}
        <div className="auth-floating-card">
          {/* Top Segmented Pill Toggle Switcher */}
          <div className="auth-pill-toggle">
            <button
              type="button"
              className={`pill-toggle-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`pill-toggle-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Register
            </button>
          </div>

          {/* Card Headings */}
          <div className="auth-card-headings">
            <h1 className="auth-card-title">
              {mode === "login" ? "Sign In" : "Register"}
            </h1>
            <p className="auth-card-subtitle">
              {mode === "login"
                ? "Access your security portal. Manage offline vehicle tracking, verify resident profiles, and review incident telemetry."
                : "Create an administrator account to calibrate residential cameras, set speed limits, and manage facial profiles."}
            </p>
          </div>

          {/* Feedback Alert Banner */}
          {message && (
            <div className={`auth-card-alert ${messageType}`}>
              <span>{message}</span>
            </div>
          )}

          {/* Form Component */}
          {mode === "login" ? (
            <LoginForm onSubmit={handleLoginSubmit} loading={loading} />
          ) : (
            <SignupForm onSubmit={handleSignupSubmit} loading={loading} />
          )}

        </div>

        {/* Sub-Footer Meta */}
        <div className="auth-left-bottom">
          <span>HavenTrack • Local Residential Surveillance System</span>
        </div>
      </div>

      {/* Right Column: High-Tech Security Visual Fading into Left Dark Canvas */}
      <div className="auth-right-pane">
        <div className="auth-image-container">
          <img
            src="/auth-side-security.jpg"
            alt="HavenTrack Residential AI Surveillance"
            className="auth-hero-img"
          />

          {/* Smooth Multi-Stage Gradient Mask: Blends into Left Canvas (#070a11) with Zero Seams */}
          <div className="auth-mask-left" />
          <div className="auth-mask-top" />
          <div className="auth-mask-bottom" />

          {/* Floating High-Tech Telemetry Chip on Image */}
          <div className="auth-overlay-chip top-chip">
            <Cpu size={14} className="chip-icon-pulse" />
            <span>Local AI Vision Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
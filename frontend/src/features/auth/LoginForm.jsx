// frontend/src/features/auth/LoginForm.jsx

import React, { useState } from "react";
import { Eye, EyeOff, LogIn, Loader2, KeyRound } from "lucide-react";

function LoginForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotTip, setShowForgotTip] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    onSubmit(form);
  };


  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Email Address Field */}
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="auth-email">
          Email Address
        </label>
        <input
          id="auth-email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="name@example.com"
          required
          autoComplete="email"
          className="auth-input"
          disabled={loading}
        />
      </div>

      {/* Password Field with Show/Hide Toggle */}
      <div className="auth-field">
        <div className="auth-label-row">
          <label className="auth-field-label" htmlFor="auth-password">
            Password
          </label>
          <button
            type="button"
            className="auth-forgot-link"
            onClick={() => setShowForgotTip((prev) => !prev)}
          >
            Forgot Password?
          </button>
        </div>

        <div className="auth-password-wrapper">
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your security password"
            required
            autoComplete="current-password"
            className="auth-input auth-password-input"
            disabled={loading}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            title={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {showForgotTip && (
          <div className="auth-hint-banner">
            <KeyRound size={14} className="hint-icon" />
            <span>
              HavenTrack runs 100% locally on your computer. Passwords are stored in your local <code>app.db</code> SQLite database.
            </span>
          </div>
        )}
      </div>


      {/* Submit Button */}
      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading || !form.email || !form.password}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="auth-spin" />
            <span>Signing In...</span>
          </>
        ) : (
          <>
            <LogIn size={16} />
            <span>Sign In</span>
          </>
        )}
      </button>
    </form>
  );
}

export default LoginForm;
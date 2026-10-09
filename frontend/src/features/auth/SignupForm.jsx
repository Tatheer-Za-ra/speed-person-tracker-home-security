// frontend/src/features/auth/SignupForm.jsx

import React, { useState } from "react";
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function SignupForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(form.email.trim());
  const isPasswordLengthValid = form.password.length >= 8;
  const isPasswordMatch = form.password.length > 0 && form.password === form.confirmPassword;

  const canSubmit =
    !loading &&
    form.name.trim().length > 0 &&
    isEmailValid &&
    isPasswordLengthValid &&
    isPasswordMatch;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {/* Full Name Field */}
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="signup-name">
          Full Name
        </label>
        <input
          id="signup-name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. John Doe"
          required
          autoComplete="name"
          className="auth-input"
          disabled={loading}
        />
      </div>

      {/* Email Address Field */}
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="signup-email">
          Email Address
        </label>
        <input
          id="signup-email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          onBlur={() => handleBlur("email")}
          placeholder="name@example.com"
          required
          autoComplete="email"
          className={`auth-input ${
            touched.email && form.email
              ? isEmailValid
                ? "success"
                : "error"
              : ""
          }`}
          disabled={loading}
        />
        {touched.email && form.email && !isEmailValid && (
          <div className="auth-input-hint error">
            <AlertCircle size={13} />
            <span>Please enter a valid email address (e.g. name@domain.com)</span>
          </div>
        )}
      </div>

      {/* Password Field with Show/Hide Toggle */}
      <div className="auth-field">
        <div className="auth-label-row">
          <label className="auth-field-label" htmlFor="signup-password">
            Password
          </label>
          <span className="auth-field-requirement">Min. 8 characters</span>
        </div>

        <div className="auth-password-wrapper">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            onBlur={() => handleBlur("password")}
            placeholder="Create password (8+ characters)"
            required
            autoComplete="new-password"
            className={`auth-input auth-password-input ${
              touched.password && form.password
                ? isPasswordLengthValid
                  ? "success"
                  : "error"
                : ""
            }`}
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

        {form.password.length > 0 && (
          <div className={`auth-input-hint ${isPasswordLengthValid ? "success" : "error"}`}>
            {isPasswordLengthValid ? (
              <>
                <CheckCircle2 size={13} />
                <span>Password length valid ({form.password.length} characters)</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} />
                <span>Password must be at least 8 characters ({form.password.length}/8)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirm Password Field with Show/Hide Toggle */}
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="signup-confirm-password">
          Confirm Password
        </label>

        <div className="auth-password-wrapper">
          <input
            id="signup-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleBlur("confirmPassword")}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
            className={`auth-input auth-password-input ${
              (touched.confirmPassword || form.confirmPassword.length > 0)
                ? isPasswordMatch
                  ? "success"
                  : "error"
                : ""
            }`}
            disabled={loading}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            title={showConfirmPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {form.confirmPassword.length > 0 && (
          <div className={`auth-input-hint ${isPasswordMatch ? "success" : "error"}`}>
            {isPasswordMatch ? (
              <>
                <CheckCircle2 size={13} />
                <span>Passwords match</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} />
                <span>Passwords do not match</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-submit-btn"
        disabled={!canSubmit}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="auth-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <>
            <UserPlus size={16} />
            <span>Create Resident Account</span>
          </>
        )}
      </button>
    </form>
  );
}

export default SignupForm;
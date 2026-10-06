// frontend/src/features/auth/SignupForm.jsx

import React, { useState } from "react";
import { Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";

function SignupForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    onSubmit(form);
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
          placeholder="name@example.com"
          required
          autoComplete="email"
          className="auth-input"
          disabled={loading}
        />
      </div>

      {/* Password Field with Show/Hide Toggle */}
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="signup-password">
          Password
        </label>

        <div className="auth-password-wrapper">
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
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
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading || !form.name || !form.email || !form.password}
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
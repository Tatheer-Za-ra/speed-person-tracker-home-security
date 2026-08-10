import { useState } from "react";

function LoginForm({ onSubmit }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      email: "",
      password: "",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="auth-field">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
        />
      </div>

      <div className="auth-field">
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
        />
      </div>

      <button type="submit" className="primary-button">
        Login
      </button>
    </form>
  );
}

export default LoginForm;
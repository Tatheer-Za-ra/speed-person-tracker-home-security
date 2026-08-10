const API_BASE = "http://localhost:5000";

export async function signupUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
     credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { response, data };
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { response, data };
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}

export async function logoutUser() {
  return fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
const API_BASE = "http://localhost:5000";

export async function listKnownPersons() {
  const response = await fetch(`${API_BASE}/api/known-persons`, {
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}

export async function createKnownPerson(formData) {
  const response = await fetch(`${API_BASE}/api/known-persons`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json();
  return { response, data };
}

export async function updateKnownPerson(personId, formData) {
  const response = await fetch(`http://localhost:5000/api/known-persons/${personId}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });

  const rawText = await response.text();

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText || "Unexpected server response" };
  }

  return { response, data };
}

export async function deleteKnownPerson(personId) {
  const response = await fetch(`${API_BASE}/api/known-persons/${personId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}
// frontend/src/api/eventsApi.js

const API_BASE = "http://localhost:5000";

export async function fetchEventSummary() {
  const response = await fetch(`${API_BASE}/api/events/summary`, {
    credentials: "include",
  });
  const data = await response.json();
  return { response, data };
}

export async function fetchEvents(filters = {}) {
  const queryParams = new URLSearchParams();

  if (filters.video_id) queryParams.append("video_id", filters.video_id);
  if (filters.event_type) queryParams.append("event_type", filters.event_type);
  if (filters.label) queryParams.append("label", filters.label);
  if (filters.is_alert !== undefined && filters.is_alert !== null) {
    queryParams.append("is_alert", filters.is_alert);
  }
  if (filters.limit) queryParams.append("limit", filters.limit);
  if (filters.offset) queryParams.append("offset", filters.offset);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/events${queryString}`, {
    credentials: "include",
  });
  const data = await response.json();
  return { response, data };
}

export async function fetchAlerts(limit = 50) {
  const response = await fetch(`${API_BASE}/api/events/alerts?limit=${limit}`, {
    credentials: "include",
  });
  const data = await response.json();
  return { response, data };
}

export async function fetchEventAnalytics(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.video_id) queryParams.append("video_id", params.video_id);
  if (params.start_date) queryParams.append("start_date", params.start_date);
  if (params.end_date) queryParams.append("end_date", params.end_date);
  if (params.preset) queryParams.append("preset", params.preset);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const response = await fetch(`${API_BASE}/api/events/analytics${queryString}`, {
    credentials: "include",
  });
  const data = await response.json();
  return { response, data };
}


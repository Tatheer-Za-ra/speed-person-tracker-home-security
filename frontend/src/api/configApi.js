// frontend/src/api/configApi.js

const API_BASE = "http://localhost:5000/api/config";

/**
 * GET /api/config/speed-thresholds
 * Returns user's active category speed thresholds
 */
export async function fetchSpeedThresholds() {
  const response = await fetch(`${API_BASE}/speed-thresholds`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}

/**
 * PUT /api/config/speed-thresholds
 * Body: { car: 30.0, motorcycle: 40.0, truck: 25.0 }
 */
export async function updateSpeedThresholds(thresholds) {
  const response = await fetch(`${API_BASE}/speed-thresholds`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(thresholds),
  });

  const data = await response.json();
  return { response, data };
}

/**
 * GET /api/config/retention
 */
export async function fetchRetentionConfig() {
  const response = await fetch(`${API_BASE}/retention`, {
    method: "GET",
    credentials: "include",
  });
  const data = await response.json();
  return { response, data };
}

/**
 * PUT /api/config/retention
 * Body: { retention_days: 14 }
 */
export async function updateRetentionConfig(retentionDays) {
  const response = await fetch(`${API_BASE}/retention`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ retention_days: retentionDays }),
  });
  const data = await response.json();
  return { response, data };
}

/**
 * POST /api/config/retention/run
 */
export async function triggerManualCleanup() {
  const response = await fetch(`${API_BASE}/retention/run`, {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json();
  return { response, data };
}

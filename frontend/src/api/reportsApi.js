// frontend/src/api/reportsApi.js

const API_BASE = "http://localhost:5000/api/reports";

/**
 * Triggers a browser file download from a Blob response.
 */
function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Download PDF Security Audit Report.
 * @param {Object} params - { video_id, is_alert, label }
 */
export async function downloadPdfReport(params = {}) {
  const query = new URLSearchParams();
  if (params.video_id) query.append("video_id", params.video_id);
  if (params.batch_id) query.append("batch_id", params.batch_id);
  if (params.scope) query.append("scope", params.scope);
  if (params.is_alert !== undefined && params.is_alert !== null) {
    query.append("is_alert", params.is_alert);
  }
  if (params.label) query.append("label", params.label);

  const url = `${API_BASE}/pdf?${query.toString()}`;
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to download PDF audit report.");
  }

  const blob = await response.blob();
  triggerBrowserDownload(blob, "security_audit_report.pdf");
  return true;
}

/**
 * Download CSV Security Event Log Spreadsheet.
 * @param {Object} params - { video_id, batch_id, scope, is_alert, label }
 */
export async function downloadCsvReport(params = {}) {
  const query = new URLSearchParams();
  if (params.video_id) query.append("video_id", params.video_id);
  if (params.batch_id) query.append("batch_id", params.batch_id);
  if (params.scope) query.append("scope", params.scope);
  if (params.is_alert !== undefined && params.is_alert !== null) {
    query.append("is_alert", params.is_alert);
  }
  if (params.label) query.append("label", params.label);

  const url = `${API_BASE}/csv?${query.toString()}`;
  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to download CSV export log.");
  }

  const blob = await response.blob();
  triggerBrowserDownload(blob, "security_audit_log.csv");
  return true;
}

/**
 * Fetch human-friendly scope info for a video and its upload session (batch).
 * @param {Object} params - { video_id, batch_id }
 */
export async function fetchReportScopeInfo(params = {}) {
  const query = new URLSearchParams();
  if (params.video_id) query.append("video_id", params.video_id);
  if (params.batch_id) query.append("batch_id", params.batch_id);

  const url = `${API_BASE}/scope-info?${query.toString()}`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) return null;
  return response.json();
}


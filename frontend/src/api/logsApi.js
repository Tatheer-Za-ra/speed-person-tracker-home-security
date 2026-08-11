// frontend/src/api/logsApi.js

const API_BASE = "http://localhost:5000/api/videos/logs";

/**
 * Fetch list of all historical video processing logs with telemetry stats.
 */
export async function fetchVideoLogs() {
  const response = await fetch(API_BASE, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to load video processing history logs.");
  }
  const data = await response.json();
  return data;
}

/**
 * Permanently delete a video processing run and cascade purge disk/database entries.
 * @param {number} videoId
 */
export async function deleteVideoLog(videoId) {
  const response = await fetch(`${API_BASE}/${videoId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to delete video run #${videoId}.`);
  }

  const data = await response.json();
  return data;
}

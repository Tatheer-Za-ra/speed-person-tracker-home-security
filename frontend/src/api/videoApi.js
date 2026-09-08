const API_BASE = "http://localhost:5000";

export async function uploadVideos(files, enableSiteCalibration = false, options = {}) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("videos", file);
  }
  if (enableSiteCalibration) {
    formData.append("enable_site_calibration", "true");
  }
  if (options.isContinuous) {
    formData.append("is_continuous", "true");
  }
  if (options.recordingStartTime) {
    formData.append("recording_start_time", options.recordingStartTime);
  }
  if (options.startTimes) {
    formData.append("start_times", JSON.stringify(options.startTimes));
  }

  const response = await fetch(`${API_BASE}/api/videos/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json();
  return { response, data };
}

export async function listVideos() {
  const response = await fetch(`${API_BASE}/api/videos`, {
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}

export async function getVideoStatus(videoId) {
  const response = await fetch(`${API_BASE}/api/videos/${videoId}/status`, {
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}

export async function listAllVideoLogs() {
  const response = await fetch(`${API_BASE}/api/videos/logs`, {
    credentials: "include",
  });

  const data = await response.json();
  return { response, data };
}
const API_BASE = "http://localhost:5000";

export async function uploadVideos(files) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("videos", file);
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
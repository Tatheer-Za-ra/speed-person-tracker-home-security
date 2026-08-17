// frontend/src/features/videos/VideoUploadPage.jsx

import React, { useEffect, useState } from "react";
import { Zap, Eye, BarChart2, ShieldAlert, Loader2 } from "lucide-react";
import "./VideoUploadPage.css";
import { listVideos, uploadVideos } from "../../api/videoApi";

function getStatusClass(status) {
  switch ((status || "").toLowerCase()) {
    case "queued":
      return "status-badge queued";
    case "processing":
      return "status-badge processing";
    case "completed":
      return "status-badge completed";
    case "failed":
      return "status-badge failed";
    default:
      return "status-badge";
  }
}

function VideoUploadPage({ onNavigateToRun }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [fileInputKey, setFileInputKey] = useState(0);

  const fetchVideos = async () => {
    try {
      const { response, data } = await listVideos();
      if (response.ok && data) {
        const list = Array.isArray(data) ? data : (data.videos || data.results || []);
        setVideos(list);
      }
    } catch (err) {
      console.error("Could not fetch uploaded videos list:", err);
    }
  };

  useEffect(() => {
    fetchVideos();
    const intervalId = setInterval(() => {
      fetchVideos();
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setMessageType("error");
      setMessage("Please select at least one video file first.");
      return;
    }

    try {
      setMessageType("info");
      setMessage("Uploading and starting processing...");
      await uploadVideos(selectedFiles);
      setMessageType("success");
      setMessage("Video upload completed");
      setSelectedFiles([]);
      setFileInputKey((prev) => prev + 1);
      fetchVideos();
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  return (
    <div className="videos-layout">
      <div className="videos-card">
        <h2>Upload Security Videos</h2>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <form onSubmit={handleUpload}>
          <div className="videos-field">
            <label>Select one or more CCTV videos (.mp4, .avi, .mov, .mkv)</label>
            <input
              key={fileInputKey}
              type="file"
              accept=".mp4,.avi,.mov,.mkv"
              multiple
              onChange={handleFileChange}
            />
          </div>

          <button type="submit" className="primary-button">
            Upload & Start Processing
          </button>
        </form>

        {selectedFiles.length > 0 && (
          <div className="selected-files-box">
            <h3>Selected Files</h3>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${index}`}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="videos-card">
        <h2>Uploaded Videos & Status</h2>

        {videos.length === 0 ? (
          <p>No videos uploaded yet.</p>
        ) : (
          <div className="video-list">
            {videos.map((video) => {
              const statusLower = (video.status || "").toLowerCase();
              const isCompleted = statusLower === "completed";
              const isProcessing = statusLower === "processing" || statusLower === "queued";
              const progressPct = video.progress_percent ?? (isCompleted ? 100 : isProcessing ? 15 : 0);

              return (
                <div key={video.id} className="video-item-wrapper">
                  <div className="video-item">
                    <p className="video-title">
                      <strong>{video.original_filename}</strong>
                    </p>

                    <p className="video-meta">
                      Status:{" "}
                      <span className={getStatusClass(video.status)}>
                        {video.status || "unknown"}
                      </span>
                    </p>

                    <p className="video-meta" style={{ fontSize: "0.8125rem" }}>
                      {video.message || "No message"}
                    </p>

                    {/* Dynamic Real-Time Frame Processing Progress Bar */}
                    {isProcessing && (
                      <div className="processing-progress-box" style={{ marginTop: "12px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "#0284c7", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Loader2 size={14} style={{ animation: "spin 1.2s linear infinite" }} />
                            <span>{video.message || "AI Frame Processing & Tracking..."}</span>
                          </span>
                          <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "#0369a1" }}>
                            {progressPct}%
                          </span>
                        </div>

                        <div style={{ width: "100%", height: "8px", background: "#cbd5e1", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.max(6, progressPct)}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #0284c7 0%, #059669 100%)",
                            borderRadius: "10px",
                            transition: "width 0.5s ease-in-out"
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-Processing Action Panel */}
                  {isCompleted && (
                    <div className="post-processing-action-card">
                      <div className="action-card-header" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Zap size={15} style={{ color: "#059669" }} />
                        <span>Processing Finished — Post-Run Actions</span>
                      </div>

                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="action-btn details-btn"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "events", video.original_filename)
                          }
                        >
                          <Eye size={14} />
                          <span>Event Details</span>
                        </button>

                        <button
                          type="button"
                          className="action-btn summary-btn"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "summary", video.original_filename)
                          }
                        >
                          <BarChart2 size={14} />
                          <span>Run Summary</span>
                        </button>

                        <button
                          type="button"
                          className="action-btn alerts-btn"
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "alerts", video.original_filename)
                          }
                        >
                          <ShieldAlert size={14} />
                          <span>Security Alerts</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoUploadPage;
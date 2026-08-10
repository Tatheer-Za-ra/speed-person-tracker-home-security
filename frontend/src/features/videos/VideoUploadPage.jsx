// frontend/src/features/videos/VideoUploadPage.jsx

import React, { useEffect, useState } from "react";
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
  const [messageType, setMessageType] = useState("error");
  const [fileInputKey, setFileInputKey] = useState(0);

  const fetchVideos = async () => {
    try {
      const { response, data } = await listVideos();

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Could not load videos");
        return;
      }

      setVideos(data);
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    }
  };

  useEffect(() => {
    fetchVideos();

    const intervalId = setInterval(() => {
      fetchVideos();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setMessage("");

    if (selectedFiles.length === 0) {
      setMessageType("error");
      setMessage("Please select at least one video");
      return;
    }

    try {
      const { response, data } = await uploadVideos(selectedFiles);

      if (!response.ok) {
        setMessageType("error");
        setMessage(data.error || "Video upload failed");
        return;
      }

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
              const isCompleted = (video.status || "").toLowerCase() === "completed";

              return (
                <div key={video.id} className="video-item">
                  <div>
                    <strong style={{ fontSize: "1.05rem" }}>{video.original_filename}</strong>

                    <p className="video-meta">
                      Status:{" "}
                      <span className={getStatusClass(video.status)}>
                        {video.status || "unknown"}
                      </span>
                    </p>

                    <p className="video-meta" style={{ fontSize: "0.8125rem" }}>
                      {video.message || "No message"}
                    </p>
                  </div>

                  {/* Post-Processing Action Panel */}
                  {isCompleted && (
                    <div className="post-processing-action-card">
                      <div className="action-card-header">
                        ⚡ Processing Finished — Post-Run Actions
                      </div>

                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="action-btn details-btn"
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "events", video.original_filename)
                          }
                        >
                          🔍 Event Details
                        </button>

                        <button
                          type="button"
                          className="action-btn summary-btn"
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "summary", video.original_filename)
                          }
                        >
                          📊 Run Summary
                        </button>

                        <button
                          type="button"
                          className="action-btn alerts-btn"
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "alerts", video.original_filename)
                          }
                        >
                          🚨 Security Alerts
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
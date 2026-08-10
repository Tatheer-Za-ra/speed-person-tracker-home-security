import { useEffect, useState } from "react";
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


function VideoUploadPage() {
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
        <h2>Upload Videos</h2>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <form onSubmit={handleUpload}>
          <div className="videos-field">
            <label>Select one or more videos</label>
            <input
              key={fileInputKey}
              type="file"
              accept=".mp4,.avi,.mov,.mkv"
              multiple
              onChange={handleFileChange}
            />
          </div>

          <button type="submit" className="primary-button">
            Upload Videos
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
        <h2>Uploaded Videos</h2>

        {videos.length === 0 ? (
          <p>No videos uploaded yet.</p>
        ) : (
          <div className="video-list">
            {videos.map((video) => (
              <div key={video.id} className="video-item">
                <div>
                  <strong>{video.original_filename}</strong>

                  <p className="video-meta">
                    Status:{" "}
                    <span className={getStatusClass(video.status)}>
                      {video.status || "unknown"}
                    </span>
                  </p>
                  <p className="video-meta">
                    {video.message || "No message"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoUploadPage;
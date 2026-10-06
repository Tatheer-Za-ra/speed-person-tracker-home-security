// frontend/src/features/config/CameraCalibrationPanel.jsx

import React, { useEffect, useState } from "react";
import { updateCameraCalibration, fetchCameraCalibration, applyVideoSiteCalibration, deleteVideoSiteCalibration, deleteAllSiteCalibrations } from "../../api/configApi";
import { listAllVideoLogs } from "../../api/videoApi";
import { Compass, ShieldCheck, Film, Info, CheckCircle2, Zap, Trash2 } from "lucide-react";
import CalibrationDiagnosticModal from "../videos/CalibrationDiagnosticModal";
import "./CameraCalibrationPanel.css";

function CameraCalibrationPanel() {
  const [recalculating, setRecalculating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeCalibConfig, setActiveCalibConfig] = useState(null);
  const [calibratedVideos, setCalibratedVideos] = useState([]);
  const [activeCalibVideo, setActiveCalibVideo] = useState(null);

  const fetchActiveConfig = async () => {
    try {
      const { response, data } = await fetchCameraCalibration();
      if (response.ok && data && data.calibration) {
        setActiveCalibConfig(data.calibration);
        fetchCalibratedVideos(data.calibration);
      }
    } catch (err) {
      console.error("Could not fetch active calibration config:", err);
    }
  };

  const fetchCalibratedVideos = async () => {
    try {
      const { response, data } = await listAllVideoLogs();
      if (response.ok && data) {
        const list = data.logs || (Array.isArray(data) ? data : []);
        const calibrated = list.filter((v) => v.has_standalone_site_calibration);
        setCalibratedVideos(calibrated);
      }
    } catch (err) {
      console.error("Could not fetch calibrated videos:", err);
    }
  };

  useEffect(() => {
    fetchActiveConfig();
    fetchCalibratedVideos();

    const timer = setInterval(() => {
      fetchActiveConfig();
      fetchCalibratedVideos();
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const handleApplyVideoSiteProfile = async (videoId, filename) => {
    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await applyVideoSiteCalibration(videoId);
      if (response.ok && data.status === "success") {
        setSuccessMessage(data.message || `Activated camera perspective from '${filename}' for future footage!`);
        fetchActiveConfig();
      } else {
        setErrorMessage(data.message || "Failed to apply camera perspective profile.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteSiteProfile = async (videoId, filename) => {
    if (!window.confirm(`Are you sure you want to permanently delete the perspective profile for "${filename}"?`)) {
      return;
    }

    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await deleteVideoSiteCalibration(videoId);
      if (response.ok && data.status === "success") {
        setSuccessMessage(data.message || `Permanently deleted perspective profile for '${filename}'.`);
        fetchActiveConfig();
        fetchCalibratedVideos();
      } else {
        setErrorMessage(data.message || "Failed to delete perspective profile.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteAllSiteProfiles = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL saved camera perspective profiles?")) {
      return;
    }

    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await deleteAllSiteCalibrations();
      if (response.ok && data.status === "success") {
        setSuccessMessage(data.message || "Successfully deleted all saved perspective profiles!");
        fetchActiveConfig();
        fetchCalibratedVideos();
      } else {
        setErrorMessage(data.message || "Failed to delete perspective profiles.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await updateCameraCalibration({ mode: "ai_self_calibrated" });
      if (response.ok && data.status === "success") {
        setSuccessMessage(data.message || "Recalculated speed telemetry for all recorded events.");
        fetchActiveConfig();
      } else {
        setErrorMessage(data.message || "Failed to trigger speed recalculation.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="camera-calibration-card">
      {activeCalibVideo && (
        <CalibrationDiagnosticModal
          video={activeCalibVideo}
          onClose={() => setActiveCalibVideo(null)}
        />
      )}

      <div className="calibration-header">
        <div className="header-status-badge">
          <ShieldCheck size={14} />
          <span>CAMERA PERSPECTIVE &amp; SPEED CALIBRATION</span>
        </div>
        <h2>Saved Camera Angles &amp; Active Perspective Profiles</h2>
        <p className="calibration-desc">
          Each uploaded CCTV video calibrates the camera angle for accurate speed detection. Below are saved perspective settings for your camera locations. Select any profile to make it the <strong>active default</strong> for future footage.
        </p>
      </div>

      {errorMessage && <div className="calibration-alert error">{errorMessage}</div>}
      {successMessage && <div className="calibration-alert success">{successMessage}</div>}

      {/* Saved Site Calibration Diagnostic Maps Section */}
      <div className="iso-dimensions-section" style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "8px" }}>
          <label className="section-label" style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Compass size={18} style={{ color: "#0284c7" }} /> Saved Camera Perspectives ({calibratedVideos.length})
          </label>

          {calibratedVideos.length > 0 && (
            <button
              type="button"
              title="Permanently Delete All Saved Perspective Profiles"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: "600",
                background: "#fff1f2",
                color: "#e11d48",
                border: "1px solid #fecdd3",
                cursor: recalculating ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={handleDeleteAllSiteProfiles}
              disabled={recalculating}
            >
              <Trash2 size={14} />
              <span>Delete All Profiles</span>
            </button>
          )}
        </div>

        {calibratedVideos.length === 0 ? (
          <div className="no-calib-banner" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "10px" }}>
            <Info size={20} style={{ color: "#0284c7", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.875rem", color: "#475569", lineHeight: "1.5" }}>
              <strong style={{ color: "#0f172a" }}>No Camera Perspective Profiles Recorded Yet</strong>
              <br />
              When you upload a video with <strong>"[x] Set Up Perspective for a New Camera Location"</strong> enabled, its road angle, horizon level, and distance grid settings will automatically be saved and displayed here.
            </div>
          </div>
        ) : (
          <div className="calibrated-videos-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px", marginTop: "12px" }}>
            {calibratedVideos.map((vid, idx) => {
              const calib = vid.site_calibration || {};
              const vidId = vid.video_id || vid.id;
              const batchNum = vid.user_seq_batch_num || vid.batch_id;
              const isActive = Boolean(
                activeCalibConfig && (
                  (activeCalibConfig.active_video_id && String(activeCalibConfig.active_video_id) === String(vidId)) ||
                  (activeCalibConfig.active_batch_id && String(activeCalibConfig.active_batch_id) === String(batchNum)) ||
                  (!activeCalibConfig.active_video_id && !activeCalibConfig.active_batch_id && idx === 0)
                )
              );

              return (
                <div
                  key={vidId}
                  className="dim-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    padding: "18px",
                    borderRadius: "12px",
                    background: isActive ? "#f0fdf4" : "#ffffff",
                    border: isActive ? "2px solid #10b981" : "1px solid #e2e8f0",
                    boxShadow: isActive ? "0 4px 12px rgba(16, 185, 129, 0.15)" : "0 1px 3px rgba(0,0,0,0.05)"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div className="dim-name" style={{ fontSize: "0.95rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", wordBreak: "break-word" }}>
                        <Film size={18} style={{ color: "#0284c7", flexShrink: 0 }} />
                        <span>{vid.original_filename}</span>
                      </div>

                      {isActive && (
                        <div>
                          <span style={{ background: "#10b981", color: "#ffffff", fontSize: "0.725rem", fontWeight: "700", padding: "4px 10px", borderRadius: "14px", display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}>
                            <CheckCircle2 size={13} /> Active Profile
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="dim-specs" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", color: "#334155" }}>
                      <span>Batch: <strong>Batch #{vid.batch_number ?? vid.batch_id}</strong></span>
                      <span>Camera Height: <strong>{calib.camera_height_m ?? "3.5"}m</strong></span>
                      <span>Tilt Angle: <strong>{calib.camera_tilt_deg ?? "30"}°</strong></span>
                      <span>Field of View: <strong>{calib.fov_deg ?? "55"}°</strong></span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      className="calib-map-btn"
                      style={{
                        width: "100%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        fontSize: "0.825rem",
                        fontWeight: "600",
                        background: "#0284c7",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer"
                      }}
                      onClick={() => setActiveCalibVideo({
                        ...vid,
                        id: vidId,
                      })}
                    >
                      <Compass size={16} />
                      <span>View Perspective Map</span>
                    </button>

                    {!isActive && (
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          fontSize: "0.825rem",
                          fontWeight: "600",
                          cursor: recalculating ? "not-allowed" : "pointer",
                          background: "#10b981",
                          color: "#ffffff",
                          border: "none",
                          transition: "all 0.2s ease"
                        }}
                        onClick={() => handleApplyVideoSiteProfile(vidId, vid.original_filename)}
                        disabled={recalculating}
                      >
                        <Zap size={15} />
                        <span>Set as Active Perspective</span>
                      </button>
                    )}

                    <button
                      type="button"
                      title="Permanently Delete Perspective Profile"
                      style={{
                        width: "100%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "0.825rem",
                        fontWeight: "600",
                        cursor: recalculating ? "not-allowed" : "pointer",
                        background: "#fff1f2",
                        color: "#e11d48",
                        border: "1px solid #fecdd3",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => handleDeleteSiteProfile(vidId, vid.original_filename)}
                      disabled={recalculating}
                    >
                      <Trash2 size={14} />
                      <span>Delete Perspective Profile</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="calibration-footer-ai" style={{ marginTop: "24px", justifyContent: "center", textAlign: "center" }}>
        <div className="ai-footer-info" style={{ textAlign: "center", width: "100%" }}>
          <span><strong>Zero Setup Required:</strong> Every uploaded CCTV video automatically applies camera perspective settings for accurate vehicle speed calculations.</span>
        </div>
      </div>
    </div>
  );
}

export default CameraCalibrationPanel;

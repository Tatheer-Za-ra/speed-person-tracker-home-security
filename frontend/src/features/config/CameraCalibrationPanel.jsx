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
        setSuccessMessage(data.message || `Activated site calibration from '${filename}' for future video runs!`);
        fetchActiveConfig();
      } else {
        setErrorMessage(data.message || "Failed to apply site calibration profile.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteSiteProfile = async (videoId, filename) => {
    if (!window.confirm(`Are you sure you want to permanently delete the site calibration map for "${filename}"?`)) {
      return;
    }

    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await deleteVideoSiteCalibration(videoId);
      if (response.ok && data.status === "success") {
        setSuccessMessage(data.message || `Permanently deleted calibration map for '${filename}'.`);
        fetchActiveConfig();
        fetchCalibratedVideos();
      } else {
        setErrorMessage(data.message || "Failed to delete site calibration map.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not connect to backend server.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleDeleteAllSiteProfiles = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL saved site calibration maps in your gallery?")) {
      return;
    }

    setRecalculating(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const { response, data } = await deleteAllSiteCalibrations();
      if (response.ok && data.status === "success") {
        setSuccessMessage(data.message || "Successfully deleted all saved site calibration maps!");
        fetchActiveConfig();
        fetchCalibratedVideos();
      } else {
        setErrorMessage(data.message || "Failed to delete site calibration maps.");
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
          <span>AUTOMATED AI CAMERA CALIBRATION ENGINE</span>
        </div>
        <h2>Saved Site Calibration Maps & Active Account Profile</h2>
        <p className="calibration-desc">
          Every uploaded CCTV video runs AI perspective profiling. Below are all saved site calibration maps for your camera locations. Select any profile to set it as the <strong>active default</strong> for future video runs.
        </p>
      </div>

      {errorMessage && <div className="calibration-alert error">{errorMessage}</div>}
      {successMessage && <div className="calibration-alert success">{successMessage}</div>}

      {/* Saved Site Calibration Diagnostic Maps Section */}
      <div className="iso-dimensions-section" style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "8px" }}>
          <label className="section-label" style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <Compass size={18} style={{ color: "#0284c7" }} /> All Saved Camera Location Maps ({calibratedVideos.length})
          </label>

          {calibratedVideos.length > 0 && (
            <button
              type="button"
              title="Permanently Delete All Saved Site Calibration Maps"
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
              <span>Delete All Maps</span>
            </button>
          )}
        </div>

        {calibratedVideos.length === 0 ? (
          <div className="no-calib-banner" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "10px" }}>
            <Info size={20} style={{ color: "#0284c7", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.875rem", color: "#475569", lineHeight: "1.5" }}>
              <strong style={{ color: "#0f172a" }}>No Site Perspective Maps Recorded Yet</strong>
              <br />
              When you upload a video with <strong>"[x] Optimize Precision for New Camera Location"</strong> enabled, its vanishing point crosshair, horizon line, and depth grid diagnostic map will automatically be saved and displayed here.
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
                      <span>Vertical FOV: <strong>{calib.fov_deg ?? "55"}°</strong></span>
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
                      <span>View Site Calibration Map</span>
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
                        <span>Apply for Future Runs</span>
                      </button>
                    )}

                    <button
                      type="button"
                      title="Permanently Delete Calibration Map"
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
                      <span>Delete Calibration Map</span>
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
          <span><strong>Zero Setup Required:</strong> Every uploaded CCTV video automatically uses AI self-calibrated velocity telemetry.</span>
        </div>
      </div>
    </div>
  );
}

export default CameraCalibrationPanel;

import React, { useEffect, useState } from "react";
import {
  Zap,
  Eye,
  BarChart2,
  ShieldAlert,
  Loader2,
  Upload,
  FileVideo,
  Film,
  X,
  Target,
  Compass,
  Clock,
  Calendar,
  Link2,
  Split,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import "./VideoUploadPage.css";
import { listVideos, uploadVideos } from "../../api/videoApi";
import CalibrationDiagnosticModal from "./CalibrationDiagnosticModal";
import {
  getTodayDateString,
  getCurrentLocalDateTimeString,
  formatFootageDateTime,
} from "./dateUtils";


/**
 * Reusable Column-Labeled DateTime Picker Component
 * Displays distinct column headings: Date, Hr, Min, Sec, AM/PM
 * Strictly prevents any future date or time (capped at current moment).
 */
export function FootageDateTimePicker({ value, onChange, disabled = false, isCompact = false }) {
  const now = new Date();
  const todayStr = getTodayDateString();

  // Parse current value into discrete parts
  const parseParts = (val) => {
    let d = new Date(val);
    if (isNaN(d.getTime()) || d.getTime() > now.getTime()) {
      d = new Date();
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    let hr12 = hours % 12;
    if (hr12 === 0) hr12 = 12;

    return {
      date,
      hr: String(hr12).padStart(2, "0"),
      min: String(d.getMinutes()).padStart(2, "0"),
      sec: String(d.getSeconds()).padStart(2, "0"),
      ampm,
    };
  };

  const [parts, setParts] = useState(() => parseParts(value));

  useEffect(() => {
    setParts(parseParts(value));
  }, [value]);

  // Emit updated ISO string with strict past/present validation
  const updateAndEmit = (newParts) => {
    const currentNow = new Date();
    let { date, hr, min, sec, ampm } = newParts;

    // Enforce date <= today
    if (date > todayStr) {
      date = todayStr;
    }

    let hrNum = parseInt(hr, 10);
    if (isNaN(hrNum) || hrNum < 1) hrNum = 1;
    if (hrNum > 12) hrNum = 12;

    let minNum = parseInt(min, 10);
    if (isNaN(minNum) || minNum < 0) minNum = 0;
    if (minNum > 59) minNum = 59;

    let secNum = parseInt(sec, 10);
    if (isNaN(secNum) || secNum < 0) secNum = 0;
    if (secNum > 59) secNum = 59;

    // Convert 12-hr to 24-hr
    let hr24 = hrNum;
    if (ampm === "PM" && hr24 < 12) hr24 += 12;
    if (ampm === "AM" && hr24 === 12) hr24 = 0;

    const [y, m, d] = date.split("-").map(Number);
    let target = new Date(y, m - 1, d, hr24, minNum, secNum);

    // Edge Case: Date or Time cannot be greater than current moment
    if (target.getTime() > currentNow.getTime()) {
      target = new Date(currentNow.getTime());
    }

    const resYear = target.getFullYear();
    const resMonth = String(target.getMonth() + 1).padStart(2, "0");
    const resDay = String(target.getDate()).padStart(2, "0");
    const resHours = String(target.getHours()).padStart(2, "0");
    const resMins = String(target.getMinutes()).padStart(2, "0");
    const resSecs = String(target.getSeconds()).padStart(2, "0");
    const outStr = `${resYear}-${resMonth}-${resDay}T${resHours}:${resMins}:${resSecs}`;

    setParts(parseParts(outStr));
    if (onChange) {
      onChange(outStr);
    }
  };

  return (
    <div className={`footage-dt-picker ${isCompact ? "compact" : ""}`}>
      {/* Date Column */}
      <div className="dt-col date-col">
        <label className="dt-col-label">Date</label>
        <input
          type="date"
          className="dt-input date-input"
          max={todayStr}
          value={parts.date}
          onChange={(e) => updateAndEmit({ ...parts, date: e.target.value })}
          disabled={disabled}
          title="Footage recording date (cannot be in the future)"
          required
        />
      </div>

      {/* Time Columns with explicit Hr, Min, Sec headings */}
      <div className="dt-time-cols-container">
        <div className="dt-col hr-col">
          <label className="dt-col-label">Hr</label>
          <input
            type="number"
            className="dt-input num-input"
            min="1"
            max="12"
            value={parts.hr}
            onChange={(e) => updateAndEmit({ ...parts, hr: e.target.value })}
            disabled={disabled}
            placeholder="HH"
            title="Hour (1-12)"
            required
          />
        </div>

        <span className="dt-separator">:</span>

        <div className="dt-col min-col">
          <label className="dt-col-label">Min</label>
          <input
            type="number"
            className="dt-input num-input"
            min="0"
            max="59"
            value={parts.min}
            onChange={(e) => updateAndEmit({ ...parts, min: e.target.value })}
            disabled={disabled}
            placeholder="MM"
            title="Minutes (0-59)"
            required
          />
        </div>

        <span className="dt-separator">:</span>

        <div className="dt-col sec-col">
          <label className="dt-col-label">Sec</label>
          <input
            type="number"
            className="dt-input num-input"
            min="0"
            max="59"
            value={parts.sec}
            onChange={(e) => updateAndEmit({ ...parts, sec: e.target.value })}
            disabled={disabled}
            placeholder="SS"
            title="Seconds (0-59)"
            required
          />
        </div>

        <div className="dt-col ampm-col">
          <label className="dt-col-label">AM/PM</label>
          <select
            className="dt-input ampm-select"
            value={parts.ampm}
            onChange={(e) => updateAndEmit({ ...parts, ampm: e.target.value })}
            disabled={disabled}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>
  );
}

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
  const [isUploading, setIsUploading] = useState(false);
  const [enableSiteCalibration, setEnableSiteCalibration] = useState(false);
  const [activeCalibVideo, setActiveCalibVideo] = useState(null);

  // Footage Timing States
  const [singleStartTime, setSingleStartTime] = useState(getCurrentLocalDateTimeString());
  const [isContinuous, setIsContinuous] = useState(true);
  const [fileStartTimes, setFileStartTimes] = useState({});
  const [unknownTimeMap, setUnknownTimeMap] = useState({});

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
    setMessage("");

    // Initialize individual timings with default
    const initialTimes = {};
    const defaultTime = getCurrentLocalDateTimeString();
    setSingleStartTime(defaultTime);
    files.forEach((_, idx) => {
      initialTimes[idx] = defaultTime;
    });
    setFileStartTimes(initialTimes);
    setUnknownTimeMap({});
  };

  const removeSelectedFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setFileStartTimes((prev) => {
      const next = {};
      let nextIdx = 0;
      Object.keys(prev).forEach((k) => {
        if (Number(k) !== indexToRemove) {
          next[nextIdx] = prev[k];
          nextIdx++;
        }
      });
      return next;
    });
    setUnknownTimeMap((prev) => {
      const next = {};
      let nextIdx = 0;
      selectedFiles.forEach((_, idx) => {
        if (idx !== indexToRemove) {
          if (prev[idx]) next[nextIdx] = true;
          nextIdx++;
        }
      });
      return next;
    });
    setMessage("");
  };

  const toggleUnknownTime = (index) => {
    setUnknownTimeMap((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleFileTimeChange = (index, value) => {
    setFileStartTimes((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const isProcessingBatch = isUploading || videos.some((v) => {
    const st = (v.status || "").toLowerCase();
    return st === "processing" || st === "queued";
  });

  const handleUpload = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setMessageType("error");
      setMessage("Please select at least one video file first.");
      return;
    }

    if (isProcessingBatch) {
      return;
    }

    try {
      setIsUploading(true);
      setMessageType("info");
      setMessage("Uploading and starting processing...");

      const isBatchContinuous = selectedFiles.length > 1 ? isContinuous : false;
      const options = {
        isContinuous: isBatchContinuous,
      };

      if (isBatchContinuous) {
        const isV0Unknown = Boolean(unknownTimeMap[0]);
        const v0Time = isV0Unknown ? null : (fileStartTimes[0] || singleStartTime);
        options.recordingStartTime = v0Time;
        options.startTimes = {
          0: v0Time,
        };
      } else {
        const resolvedStartTimes = {};
        selectedFiles.forEach((_, idx) => {
          const isUnknown = Boolean(unknownTimeMap[idx]);
          resolvedStartTimes[idx] = isUnknown ? null : (fileStartTimes[idx] || singleStartTime);
        });
        options.startTimes = resolvedStartTimes;
        options.recordingStartTime = Boolean(unknownTimeMap[0]) ? null : (fileStartTimes[0] || singleStartTime);
      }

      await uploadVideos(selectedFiles, enableSiteCalibration, options);
      setMessageType("success");
      setMessage("Video upload completed successfully.");
      setSelectedFiles([]);
      setFileInputKey((prev) => prev + 1);
      fetchVideos();
    } catch {
      setMessageType("error");
      setMessage("Could not connect to backend");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="videos-layout">
      {activeCalibVideo && (
        <CalibrationDiagnosticModal
          video={activeCalibVideo}
          onClose={() => setActiveCalibVideo(null)}
        />
      )}

      <div className="videos-card">
        <h2>Upload Security Videos</h2>

        {message && <p className={`message ${messageType}`}>{message}</p>}

        <form onSubmit={handleUpload}>
          <div className="videos-field">
            <label className="videos-label">
              Select one or more CCTV videos (.mp4, .avi, .mov, .mkv) <span className="required-asterisk">*</span>
            </label>

            <div className="custom-file-upload-wrapper">
              <input
                key={fileInputKey}
                id="cctv-video-file-input"
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                multiple
                disabled={isProcessingBatch}
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              <label
                htmlFor="cctv-video-file-input"
                className={`custom-file-upload-btn ${isProcessingBatch ? "disabled" : ""}`}
              >
                <Upload size={16} className="upload-icon" />
                <span className="file-upload-text">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} video file(s) selected`
                    : "Choose CCTV video files"}
                </span>
              </label>
            </div>
          </div>

          {/* Batch Timing Mode Configuration - for multiple video selections */}
          {selectedFiles.length > 1 && (
            <div className="footage-timing-card">
              <div className="footage-timing-header">
                <Clock size={18} style={{ color: "#0284c7" }} />
                <span className="footage-timing-title">Batch Footage Timing Configuration</span>
              </div>

              <p className="footage-timing-desc">
                Choose how recording timestamps are assigned to this batch. You can set exact times or toggle &ldquo;Don&rsquo;t know the time?&rdquo; per video card below.
              </p>

              {/* Batch Timing Mode Selector */}
              <div className="batch-timing-mode-grid">
                <div
                  className={`batch-mode-card ${isContinuous ? "active" : ""}`}
                  onClick={() => !isProcessingBatch && setIsContinuous(true)}
                >
                  <div className="batch-mode-title-row">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <Link2 size={16} style={{ color: isContinuous ? "#0284c7" : "#64748b" }} />
                      Continuous (Sequential)
                    </span>
                    {isContinuous && <CheckCircle2 size={15} style={{ color: "#0284c7" }} />}
                  </div>
                  <span className="batch-mode-desc">
                    Consecutive CCTV recordings. Set start time on Video #1; subsequent video start times chain automatically based on preceding video durations.
                  </span>
                </div>

                <div
                  className={`batch-mode-card ${!isContinuous ? "active" : ""}`}
                  onClick={() => !isProcessingBatch && setIsContinuous(false)}
                >
                  <div className="batch-mode-title-row">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <Split size={16} style={{ color: !isContinuous ? "#0284c7" : "#64748b" }} />
                      Non-Continuous (Independent)
                    </span>
                    {!isContinuous && <CheckCircle2 size={15} style={{ color: "#0284c7" }} />}
                  </div>
                  <span className="batch-mode-desc">
                    Independent clips from different days, hours, or cameras. Specify individual recording start times or mark individual clips as unknown below.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Selected Videos List with Per-Video Smart Controls */}
          {selectedFiles.length > 0 && (
            <div className="selected-files-card">
              <div className="selected-files-header">
                <Film size={16} className="selected-files-icon" />
                <span>Selected Videos ({selectedFiles.length})</span>
              </div>

              <div className="selected-files-list">
                {selectedFiles.map((file, index) => {
                  const sizeInMB = file.size ? (file.size / (1024 * 1024)).toFixed(1) : null;
                  const fileStartTimeVal = fileStartTimes[index] || singleStartTime;
                  const isUnknown = Boolean(unknownTimeMap[index]);

                  return (
                    <div key={`${file.name}-${index}`} className="selected-file-item">
                      {/* Line 1: File Information and Remove Action */}
                      <div className="selected-file-top-row">
                        <div className="file-info-left">
                          <FileVideo size={16} className="file-type-icon" />
                          <div className="file-name-meta">
                            <span className="file-name">#{index + 1}: {file.name}</span>
                            {sizeInMB && <span className="file-size">{sizeInMB} MB</span>}
                          </div>
                        </div>

                        {!isProcessingBatch && (
                          <button
                            type="button"
                            className="remove-file-btn"
                            onClick={() => removeSelectedFile(index)}
                            title="Remove file"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dedicated Timing Row per Video Card */}
                      {selectedFiles.length > 1 && isContinuous && index > 0 ? (
                        /* Continuous Batch: Subsequent videos chain automatically from Video #1 */
                        <div className="file-timing-second-line">
                          <div className="continuous-chained-note">
                            <Link2 size={14} style={{ color: "#0284c7", flexShrink: 0 }} />
                            <span>
                              {unknownTimeMap[0]
                                ? "Sequential: Chained from Video #1 @ Relative Timeline + Duration"
                                : "Sequential: Starts @ Video #1 Start time + It's Duration"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Single Video, Video #1 in Continuous, OR Any Video in Non-Continuous */
                        <div className="file-timing-second-line">
                          {isUnknown ? (
                            /* Mention shown on card when user clicks "Don't know the time" */
                            <div className="card-unknown-time-box">
                              <div className="card-unknown-time-content">
                                <div className="card-unknown-time-title">
                                  <Clock size={15} style={{ color: "#0284c7", flexShrink: 0 }} />
                                  <span>Start Time Unknown &bull; <strong>Relative Playback Mode (T+00s)</strong></span>
                                </div>
                                <p className="card-unknown-time-desc">
                                  Footage start time is not set. Events, speed violations, and incident logs will be tracked using elapsed video time (e.g. <strong>T+00m 15s</strong>) starting from 00:00 instead of a clock timestamp.
                                </p>
                              </div>

                              {!isProcessingBatch && (
                                <button
                                  type="button"
                                  className="set-exact-time-btn"
                                  onClick={() => toggleUnknownTime(index)}
                                  title="Specify footage recording clock time"
                                >
                                  <RotateCcw size={13} />
                                  <span>Set Clock Time</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            /* Active Time Picker with Smart "Don't know the time?" Button */
                            <div className="card-time-picker-row">
                              <div className="card-time-picker-left">
                                <span className="file-timing-label">
                                  <Clock size={14} style={{ color: "#0284c7" }} />
                                  {selectedFiles.length > 1 && isContinuous
                                    ? "Video #1 Start Time (Origin Baseline):"
                                    : selectedFiles.length > 1
                                    ? `Video #${index + 1} Start Time:`
                                    : "Footage Start Time:"}
                                </span>

                                <FootageDateTimePicker
                                  value={fileStartTimeVal}
                                  onChange={(val) => {
                                    handleFileTimeChange(index, val);
                                    if (index === 0) setSingleStartTime(val);
                                  }}
                                  disabled={isProcessingBatch}
                                  isCompact
                                />

                                <span className="file-timing-preview-pill">
                                  {formatFootageDateTime(fileStartTimeVal)}
                                </span>
                              </div>

                              {!isProcessingBatch && (
                                <button
                                  type="button"
                                  className="unknown-time-btn"
                                  onClick={() => toggleUnknownTime(index)}
                                  title="Click if you don't know the footage start time"
                                >
                                  <HelpCircle size={13} />
                                  <span>Don&rsquo;t know the time?</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="site-calibration-toggle-card">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={enableSiteCalibration}
                onChange={(e) => setEnableSiteCalibration(e.target.checked)}
                disabled={isProcessingBatch}
              />
              <div className="checkbox-text">
                <span className="checkbox-title">
                  Optimize Precision for New Camera Location (Site Auto-Calibration)
                </span>
                <span className="checkbox-desc">
                  First time uploading video from a new camera angle? Enable Site Auto-Calibration for maximum precision and visual perspective analysis.
                </span>
              </div>
            </label>
          </div>

          <button
            type="submit"
            className="primary-button upload-submit-btn"
            disabled={isProcessingBatch}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Uploading Batch...</span>
              </>
            ) : isProcessingBatch ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Processing in Progress...</span>
              </>
            ) : (
              "Upload & Start Processing"
            )}
          </button>
        </form>
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

                    {video.recording_start_time ? (
                      <p className="video-meta" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0369a1", fontWeight: "600" }}>
                        <Clock size={13} />
                        <span>Footage Start: {formatFootageDateTime(video.recording_start_time)}</span>
                        {video.duration_seconds && (
                          <span style={{ color: "#64748b", fontWeight: "400", marginLeft: "4px" }}>
                            ({Math.floor(video.duration_seconds / 60)}m {Math.floor(video.duration_seconds % 60)}s duration)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="video-meta" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                        <Clock size={13} />
                        <span>Footage Timing: <em>Relative Playback (T+00s)</em></span>
                        {video.duration_seconds && (
                          <span style={{ color: "#64748b", fontWeight: "400", marginLeft: "4px" }}>
                            ({Math.floor(video.duration_seconds / 60)}m {Math.floor(video.duration_seconds % 60)}s duration)
                          </span>
                        )}
                      </p>
                    )}

                    {!isProcessing && video.message && (
                      <p className="video-meta" style={{ fontSize: "0.8125rem" }}>
                        {video.message}
                      </p>
                    )}

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

                      <div className="action-buttons-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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

                        {(video.calibration_diagnostic_url || video.site_calibration) && (
                          <button
                            type="button"
                            className="calib-map-btn"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                            onClick={() => setActiveCalibVideo(video)}
                          >
                            <Compass size={14} />
                            <span>View Site Calibration Map</span>
                          </button>
                        )}
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
import React, { useEffect, useState, useMemo, useRef } from "react";
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
  ChevronDown,
} from "lucide-react";
import "./VideoUploadPage.css";
import { listVideos, uploadVideos } from "../../api/videoApi";
import CalibrationDiagnosticModal from "./CalibrationDiagnosticModal";
import { useToast } from "../../context/ToastContext";
import {
  getTodayDateString,
  getCurrentLocalDateTimeString,
  formatFootageDateTime,
} from "./dateUtils";


const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const SECONDS_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/**
 * Reusable Column-Labeled DateTime Picker Component
 * Includes a sleek, fixed-height multi-column scrollable time popover (Hr, Min, Sec, AM/PM)
 * with auto-scrolling, smart AM/PM auto-flip, and click-outside dismissal.
 */
export function FootageDateTimePicker({ value, onChange, disabled = false, isCompact = false }) {
  const now = new Date();
  const todayStr = getTodayDateString();

  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const hrRef = useRef(null);
  const minRef = useRef(null);
  const secRef = useRef(null);
  const ampmRef = useRef(null);

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

  // Click-outside listener to close time popover
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Auto-scroll each column to active selected item when opened
  useEffect(() => {
    if (isOpen) {
      const scrollTimer = setTimeout(() => {
        const scrollToActive = (listRef) => {
          if (!listRef.current) return;
          const container = listRef.current;
          const activeEl = container.querySelector(".time-scroll-item.selected");
          if (activeEl) {
            const targetTop = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
            container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
          }
        };
        scrollToActive(hrRef);
        scrollToActive(minRef);
        scrollToActive(secRef);
        scrollToActive(ampmRef);
      }, 50);
      return () => clearTimeout(scrollTimer);
    }
  }, [isOpen]);

  // Emit updated ISO string with smart AM/PM adjustment and strict past/present validation
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

    // Smart adjustment: If today and selecting this hour with PM results in a future time,
    // test if AM would be valid in the past (e.g. user selects 09 while it was previously PM).
    if (date === todayStr && target.getTime() > currentNow.getTime()) {
      if (ampm === "PM") {
        const testHr24 = hrNum === 12 ? 0 : hrNum;
        const testTarget = new Date(y, m - 1, d, testHr24, minNum, secNum);
        if (testTarget.getTime() <= currentNow.getTime()) {
          ampm = "AM";
          hr24 = testHr24;
          target = testTarget;
        }
      }
    }

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

  const handleSetCurrentTime = () => {
    const nowIso = getCurrentLocalDateTimeString();
    setParts(parseParts(nowIso));
    if (onChange) {
      onChange(nowIso);
    }
  };

  return (
    <div className={`footage-dt-picker ${isCompact ? "compact" : ""}`} ref={pickerRef}>
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

      {/* Time Trigger & Scrollable Multi-Column Dropdown */}
      <div className="dt-col time-col">
        <label className="dt-col-label">Time (Hr : Min : Sec)</label>
        <div className="dt-time-interactive-container">
          <button
            type="button"
            className={`dt-time-trigger-btn ${isOpen ? "open" : ""}`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            title="Click to open time selector"
          >
            <Clock size={13} style={{ color: "#0284c7" }} />
            <span className="time-digits-display">
              <span className="t-num">{parts.hr}</span>
              <span className="t-colon">:</span>
              <span className="t-num">{parts.min}</span>
              <span className="t-colon">:</span>
              <span className="t-num">{parts.sec}</span>
              <span className="t-ampm">{parts.ampm}</span>
            </span>
            <ChevronDown size={13} className={`t-arrow ${isOpen ? "rotate" : ""}`} />
          </button>

          <button
            type="button"
            className="dt-now-pill-btn"
            onClick={handleSetCurrentTime}
            disabled={disabled}
            title="Reset to current real-world clock time"
          >
            Now
          </button>

          {/* Fixed-Height Multi-Column Scrollable Dropdown Menu */}
          {isOpen && (
            <div className="time-scroll-popover">
              <div className="time-scroll-columns-grid">
                {/* Hours Column */}
                <div className="time-scroll-column">
                  <div className="time-column-header">HR</div>
                  <div className="time-column-list" ref={hrRef}>
                    {HOURS_12.map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`time-scroll-item ${parts.hr === h ? "selected" : ""}`}
                        onClick={() => updateAndEmit({ ...parts, hr: h })}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes Column */}
                <div className="time-scroll-column">
                  <div className="time-column-header">MIN</div>
                  <div className="time-column-list" ref={minRef}>
                    {MINUTES_60.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`time-scroll-item ${parts.min === m ? "selected" : ""}`}
                        onClick={() => updateAndEmit({ ...parts, min: m })}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seconds Column */}
                <div className="time-scroll-column">
                  <div className="time-column-header">SEC</div>
                  <div className="time-column-list" ref={secRef}>
                    {SECONDS_60.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`time-scroll-item ${parts.sec === s ? "selected" : ""}`}
                        onClick={() => updateAndEmit({ ...parts, sec: s })}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AM/PM Column */}
                <div className="time-scroll-column ampm-column">
                  <div className="time-column-header">AM/PM</div>
                  <div className="time-column-list" ref={ampmRef}>
                    {["AM", "PM"].map((ap) => (
                      <button
                        key={ap}
                        type="button"
                        className={`time-scroll-item ${parts.ampm === ap ? "selected" : ""}`}
                        onClick={() => updateAndEmit({ ...parts, ampm: ap })}
                      >
                        {ap}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Popover Footer with Quick 'Current Time' and 'Done' */}
              <div className="time-popover-footer">
                <button
                  type="button"
                  className="time-footer-now-btn"
                  onClick={handleSetCurrentTime}
                >
                  Current Time
                </button>
                <button
                  type="button"
                  className="time-footer-done-btn"
                  onClick={() => setIsOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
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
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [enableSiteCalibration, setEnableSiteCalibration] = useState(false);
  const [activeCalibVideo, setActiveCalibVideo] = useState(null);

  // Footage Timing States
  const [singleStartTime, setSingleStartTime] = useState(getCurrentLocalDateTimeString());
  const [isContinuous, setIsContinuous] = useState(true);
  const [fileStartTimes, setFileStartTimes] = useState({});
  const [unknownTimeMap, setUnknownTimeMap] = useState({});

  const hasActiveProcessing = useMemo(() => {
    return videos.some((v) => {
      const st = (v.status || "").toLowerCase();
      return st === "processing" || st === "queued";
    });
  }, [videos]);

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
    const interval = hasActiveProcessing ? 1000 : 3000;
    const intervalId = setInterval(() => {
      fetchVideos();
    }, interval);

    return () => clearInterval(intervalId);
  }, [hasActiveProcessing]);

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
      toast.warning("Please select at least one video file first.");
      return;
    }

    if (isProcessingBatch) {
      return;
    }

    try {
      setIsUploading(true);
      toast.info("Uploading video footage and beginning processing...");

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
      toast.success("Video upload completed and queued for analysis.");
      setSelectedFiles([]);
      setFileInputKey((prev) => prev + 1);
      fetchVideos();
    } catch {
      toast.error("Could not connect to backend server.");
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

      {/* Left Card: Upload & Timing Configuration */}
      <div className="videos-card">
        <div className="videos-card-header-block">
          <h2>Upload Security Footage</h2>
          <p className="videos-subtitle">
            Upload residential CCTV recordings to detect vehicles, verify residents, and measure driveway speeds.
          </p>
        </div>

        <form onSubmit={handleUpload}>
          <div className="videos-field">
            <label className="videos-label">
              Select Video Files (.mp4, .avi, .mov, .mkv) <span className="required-asterisk">*</span>
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
                    : "Choose CCTV Video Files"}
                </span>
              </label>
            </div>
          </div>

          {/* Batch Timing Mode Configuration - for multiple video selections */}
          {selectedFiles.length > 1 && (
            <div className="footage-timing-card">
              <div className="footage-timing-header">
                <Clock size={17} style={{ color: "#0284c7" }} />
                <span className="footage-timing-title">Footage Recording Mode</span>
              </div>

              <p className="footage-timing-desc">
                Choose how these files relate to each other on the timeline:
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
                      Continuous Recording
                    </span>
                    {isContinuous && <CheckCircle2 size={15} style={{ color: "#0284c7" }} />}
                  </div>
                  <span className="batch-mode-desc">
                    Files belong to one recording. Set when Clip #1 started, and subsequent clips will automatically chain in order.
                  </span>
                </div>

                <div
                  className={`batch-mode-card ${!isContinuous ? "active" : ""}`}
                  onClick={() => !isProcessingBatch && setIsContinuous(false)}
                >
                  <div className="batch-mode-title-row">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <Split size={16} style={{ color: !isContinuous ? "#0284c7" : "#64748b" }} />
                      Separate Clips
                    </span>
                    {!isContinuous && <CheckCircle2 size={15} style={{ color: "#0284c7" }} />}
                  </div>
                  <span className="batch-mode-desc">
                    Recorded at different times, days, or camera angles. Set the recording time for each clip individually.
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
                              Continuous timeline: Starts automatically when previous clip ends
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
                                  <span>Using Video Elapsed Time</span>
                                </div>
                                <p className="card-unknown-time-desc">
                                  Events and speed alerts will show video runtime (e.g. <strong>00:15</strong>) instead of clock time.
                                </p>
                              </div>

                              {!isProcessingBatch && (
                                <button
                                  type="button"
                                  className="set-exact-time-btn"
                                  onClick={() => toggleUnknownTime(index)}
                                  title="Enter footage clock time"
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
                                    ? "Clip #1 Recording Time:"
                                    : selectedFiles.length > 1
                                    ? `Clip #${index + 1} Recording Time:`
                                    : "Recording Date & Time:"}
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
                                  title="Click if you don't know when this was recorded"
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
                  First-Time Camera Angle Setup
                </span>
                <span className="checkbox-desc">
                  First time using footage from this camera? Turn this on to optimize real-world distance and vehicle speed accuracy for this angle.
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
                <span>Uploading Footage...</span>
              </>
            ) : isProcessingBatch ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Analysis in Progress...</span>
              </>
            ) : (
              "Upload & Analyze Footage"
            )}
          </button>
        </form>
      </div>

      {/* Right Card: Footage Library & Analysis Status */}
      <div className="videos-card">
        <div className="videos-card-header-block">
          <h2>Footage Library &amp; Status</h2>
          <p className="videos-subtitle">
            Review analysis status, detected vehicle speeds, and security events.
          </p>
        </div>

        {videos.length === 0 ? (
          <div className="empty-videos-state">
            <FileVideo size={36} className="empty-videos-icon" />
            <p className="empty-title">No security footage uploaded yet</p>
            <span className="empty-desc">
              Select CCTV video files on the left to begin speed tracking and visitor verification.
            </span>
          </div>
        ) : (
          <div className="video-list">
            {videos.map((video) => {
              const statusLower = (video.status || "").toLowerCase();
              const isCompleted = statusLower === "completed";
              const isProcessing = statusLower === "processing" || statusLower === "queued";
              const isFailed = statusLower === "failed";
              const progressPct = video.progress_percent ?? (isCompleted ? 100 : isProcessing ? 5 : 0);

              return (
                <div key={video.id} className="video-item-wrapper">
                  <div className="video-item">
                    {/* Top Row: File Name on left, Status Badge on right */}
                    <div className="video-item-top-row">
                      <div className="video-title">
                        <FileVideo size={16} className="video-file-icon" />
                        <strong>{video.original_filename}</strong>
                      </div>
                      <span className={getStatusClass(video.status)}>
                        {isProcessing ? "Analyzing..." : video.status || "Unknown"}
                      </span>
                    </div>

                    {/* Timing & Duration Information */}
                    <div className="video-timing-meta">
                      {video.recording_start_time ? (
                        <span className="timing-pill">
                          <Clock size={13} />
                          <span>Recorded: {formatFootageDateTime(video.recording_start_time)}</span>
                          {video.duration_seconds && (
                            <span className="timing-duration">
                              ({Math.floor(video.duration_seconds / 60)}m {Math.floor(video.duration_seconds % 60)}s)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="timing-pill neutral">
                          <Clock size={13} />
                          <span>Timeline: Starts at 00:00</span>
                          {video.duration_seconds && (
                            <span className="timing-duration">
                              ({Math.floor(video.duration_seconds / 60)}m {Math.floor(video.duration_seconds % 60)}s)
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Show error explanation only when failed */}
                    {isFailed && video.message && (
                      <p className="video-error-message">
                        {video.message}
                      </p>
                    )}

                    {/* Dynamic Real-Time Frame Processing Progress Bar */}
                    {isProcessing && (
                      <div className="processing-progress-box">
                        <div className="progress-status-row">
                          <span className="progress-status-text">
                            <Loader2 size={14} className="spin-icon" />
                            <span>
                              {(() => {
                                const msg = video.message || (statusLower === "queued" ? "Queued for processing..." : "Processing video...");
                                if (/processing video/i.test(msg)) {
                                  return "Processing video...";
                                }
                                return msg
                                  .replace(/\s*\d+%\s*/g, " ")
                                  .replace(/\(\d+\/\d+\s*frames\)/gi, "")
                                  .trim();
                              })()}
                            </span>
                          </span>
                          <span className="progress-pct-text">
                            {progressPct}%
                          </span>
                        </div>

                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${Math.max(6, progressPct)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-Processing Action Panel */}
                  {isCompleted && (
                    <div className="post-processing-action-card">
                      <div className="action-card-header">
                        <CheckCircle2 size={15} style={{ color: "#059669" }} />
                        <span>Analysis Complete (100%) — Review Results</span>
                      </div>

                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="action-btn details-btn"
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "events", video.original_filename)
                          }
                          title="Inspect all detected vehicles, speed readings, and people"
                        >
                          <Eye size={14} />
                          <span>View Events</span>
                        </button>

                        <button
                          type="button"
                          className="action-btn summary-btn"
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "summary", video.original_filename)
                          }
                          title="View overall vehicle count, peak speed, and hourly charts"
                        >
                          <BarChart2 size={14} />
                          <span>Analytics Summary</span>
                        </button>

                        <button
                          type="button"
                          className="action-btn alerts-btn"
                          onClick={() =>
                            onNavigateToRun &&
                            onNavigateToRun(video.id, "alerts", video.original_filename)
                          }
                          title="Review driveway speed violations and unrecognized visitor alerts"
                        >
                          <ShieldAlert size={14} />
                          <span>Security Alerts</span>
                        </button>

                        {(video.calibration_diagnostic_url || video.site_calibration) && (
                          <button
                            type="button"
                            className="action-btn calib-btn"
                            onClick={() => setActiveCalibVideo(video)}
                            title="View road horizon calibration and camera perspective angles"
                          >
                            <Compass size={14} />
                            <span>Perspective Map</span>
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
// frontend/src/features/dashboard/BatchEventTimeline.jsx

import React, { useMemo } from "react";
import { Clock, Video, Gauge, CheckCircle2, AlertTriangle, UserCheck, UserX } from "lucide-react";
import { normalizeCategory } from "./FilterBar";

const API_HOST = "http://localhost:5000";

export function formatMMSS(seconds) {
  if (seconds === undefined || seconds === null) return "00:00";
  const secNum = Math.floor(parseFloat(seconds) || 0);
  const mins = Math.floor(secNum / 60);
  const secs = secNum % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatTimestamp(seconds) {
  if (seconds === undefined || seconds === null) return "00s";
  const secNum = parseFloat(seconds);
  if (isNaN(secNum) || secNum < 0) return "00s";

  const hrs = Math.floor(secNum / 3600);
  const mins = Math.floor((secNum % 3600) / 60);
  const secs = Math.floor(secNum % 60);

  if (hrs > 0) {
    const padMins = String(mins).padStart(2, "0");
    const padSecs = String(secs).padStart(2, "0");
    return `${hrs}h ${padMins}m ${padSecs}s`;
  }

  if (mins > 0) {
    const padSecs = String(secs).padStart(2, "0");
    return `${mins}m ${padSecs}s`;
  }

  return `${secNum.toFixed(1)}s`;
}

/**
 * Format timestamp into exact user specified CCTV real-world clock time:
 * e.g. "23 Aug 2026, 09:02:05 AM"
 */
export function formatFootageClockTime(calculatedTimestamp, timestampSeconds, recordingStartTime) {
  let targetDate = null;

  if (calculatedTimestamp) {
    targetDate = new Date(calculatedTimestamp);
  } else if (recordingStartTime) {
    const base = new Date(recordingStartTime).getTime();
    if (!isNaN(base)) {
      targetDate = new Date(base + (parseFloat(timestampSeconds || 0) * 1000));
    }
  }

  if (targetDate && !isNaN(targetDate.getTime())) {
    const day = targetDate.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[targetDate.getMonth()];
    const year = targetDate.getFullYear();

    let hours = targetDate.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursStr = String(hours).padStart(2, "0");
    const minsStr = String(targetDate.getMinutes()).padStart(2, "0");
    const secsStr = String(targetDate.getSeconds()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hoursStr}:${minsStr}:${secsStr} ${ampm}`;
  }

  // Fallback if no start time is available (Relative Elapsed Time)
  return `+${formatTimestamp(timestampSeconds)}`;
}

/**
 * Batch Event Segregation Timeline Component
 * Groups filtered security events by Video ID / Video Name, rendering distinct video sections.
 */
function BatchEventTimeline({ events, onSelectEvent, videoDurationSeconds, isFiltered }) {
  // Group events by video_title / video filename
  const eventsByVideo = useMemo(() => {
    const map = new Map();

    events.forEach((ev) => {
      const vTitle = ev.video_title || (ev.video_id ? `Video ${ev.video_id}` : "Unclassified Video");
      if (!map.has(vTitle)) {
        map.set(vTitle, []);
      }
      map.get(vTitle).push(ev);
    });

    // Sort events within each video chronologically (earliest timestamp first)
    const result = Array.from(map.entries()).map(([vTitle, vEvents]) => {
      vEvents.sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
      return [vTitle, vEvents];
    });

    return result;
  }, [events]);

  if (events.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        No security events match the current filter selection.
      </div>
    );
  }

  return (
    <div className="batch-timeline-container">
      {eventsByVideo.map(([videoTitle, videoEvents]) => {
        const firstEv = videoEvents[0] || {};
        const videoStartTime = firstEv.recording_start_time;
        const durSec = videoDurationSeconds || firstEv.duration_seconds || videoEvents.find(e => e.duration_seconds)?.duration_seconds;
        const durationFormatted = durSec ? `(${Math.floor(durSec / 60)}m ${Math.floor(durSec % 60)}s duration)` : "";

        return (
          <div key={videoTitle} className="video-batch-section">
            {/* Distinct Video Section Header */}
            <div className="video-section-header">
              <div className="video-title-info">
                <span className="video-badge" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Video size={14} />
                  <span>{videoTitle}</span>
                </span>
                {videoStartTime ? (
                  <span className="video-time-pill" title="Footage Recording Start Time">
                    <Clock size={13} />
                    <span>Recorded: {formatFootageClockTime(videoStartTime, 0)} {durationFormatted}</span>
                  </span>
                ) : (
                  <span className="video-time-pill" title="Video Runtime" style={{ background: "#f8fafc", borderColor: "#cbd5e1", color: "#475569" }}>
                    <Clock size={13} style={{ color: "#0284c7" }} />
                    <span>Video Timeline: 00:00 – {durSec ? formatMMSS(durSec) : "End"} {durationFormatted}</span>
                  </span>
                )}
                <span className="video-subtext">
                  {videoEvents.length} matching event{videoEvents.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Video Event Feed Grid */}
            <div className="events-feed-grid">
              {videoEvents.map((ev) => {
                const meta = ev.metadata || {};
                const snapshotUrl = ev.snapshot_url ? `${API_HOST}${ev.snapshot_url}` : null;
                const isOverspeed = meta.speed_status === "OVERSPEED";
                const normCategory = normalizeCategory(ev.label, meta.face_match_status);
                const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
                const isAlert = ev.is_alert || isUnknownPerson;

                const clockTimeStr = formatFootageClockTime(
                  ev.calculated_timestamp,
                  ev.timestamp_seconds,
                  ev.recording_start_time
                );

                return (
                  <div
                    key={ev.id}
                    className={`event-card ${isAlert ? "is-alert" : ""}`}
                    onClick={() => onSelectEvent(ev)}
                  >
                    <div className="snapshot-thumb-container">
                      {snapshotUrl ? (
                        <img src={snapshotUrl} alt={`Event ${ev.id}`} className="snapshot-thumb-img" />
                      ) : (
                        <div className="snapshot-placeholder">No Snapshot</div>
                      )}

                      <div className="badge-overlay-top">
                        {isAlert ? (
                          <span className="status-badge alert">ALERT</span>
                        ) : meta.face_match_status === "known" ? (
                          <span className="status-badge known">KNOWN</span>
                        ) : (
                          <span className="status-badge normal">DETECTED</span>
                        )}
                      </div>

                      {meta.estimated_speed_kmh !== undefined && (
                        <div className={`speed-badge-top ${isOverspeed ? "overspeed" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Gauge size={13} />
                          <span>{meta.estimated_speed_kmh} km/h</span>
                        </div>
                      )}
                    </div>

                    <div className="event-details-body">
                      <div className="event-main-header">
                        <span className="event-type-name">
                          {normCategory.toUpperCase()}
                        </span>
                        {/* Only show separate offset tag if real-world recording start time exists */}
                        {ev.recording_start_time && (
                          <span className="event-relative-tag" title="Video Elapsed Offset">
                            +{formatTimestamp(ev.timestamp_seconds)}
                          </span>
                        )}
                      </div>

                      {/* Real-World CCTV Footage Clock Time or Video Elapsed Time */}
                      <div className={`event-clock-time-badge ${isAlert ? "alert-time" : ""}`} title={videoStartTime ? "Calculated CCTV Footage Clock Time" : "Video Playback Time"}>
                        <Clock size={14} className="clock-icon" style={{ color: isAlert ? "#dc2626" : "#0284c7" }} />
                        <span className="clock-time-text">
                          {videoStartTime ? clockTimeStr : `Video Timer: ${formatMMSS(ev.timestamp_seconds)} (${formatTimestamp(ev.timestamp_seconds)})`}
                        </span>
                      </div>

                      {/* Clean security details (replaces redundant class and raw ML confidence) */}
                      <div className="event-meta-row">
                        {ev.label === "person" ? (
                          meta.face_match_status === "known" ? (
                            <span style={{ color: "#059669", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <UserCheck size={14} />
                              <span>Resident: {meta.known_person_name || `#${meta.known_person_id || "Verified"}`}</span>
                            </span>
                          ) : (
                            <span style={{ color: "#e11d48", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              <UserX size={14} />
                              <span>Unrecognized Visitor</span>
                            </span>
                          )
                        ) : (
                          <>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Gauge size={13} style={{ color: "#64748b" }} />
                              <span>Limit: <strong>{meta.speed_limit_kmh ?? 30} km/h</strong></span>
                            </span>
                            <span style={{ color: isOverspeed ? "#dc2626" : "#16a34a", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              {isOverspeed ? (
                                <>
                                  <AlertTriangle size={13} />
                                  <span>Over Limit</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} />
                                  <span>Within Limit</span>
                                </>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BatchEventTimeline;

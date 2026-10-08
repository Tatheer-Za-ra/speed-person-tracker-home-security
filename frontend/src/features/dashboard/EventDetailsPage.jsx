
import React, { useState, useEffect, useMemo } from "react";
import { Zap, Car, Bike, Truck, FileSpreadsheet, ArrowLeft, Compass, Clock, BarChart3 } from "lucide-react";
import { fetchEvents } from "../../api/eventsApi";
import { listAllVideoLogs } from "../../api/videoApi";
import { fetchSpeedThresholds } from "../../api/configApi";
import FilterBar, { normalizeCategory } from "./FilterBar";
import BatchEventTimeline, { formatFootageClockTime } from "./BatchEventTimeline";
import SnapshotModal from "./SnapshotModal";
import ReportModal from "./ReportModal";
import CalibrationDiagnosticModal from "../videos/CalibrationDiagnosticModal";
import SummaryAnalyticsTab from "./SummaryAnalyticsTab";
import "./DashboardPage.css";

function EventDetailsPage({ runFilter, onBackToVideos, onBackToLogs }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoDetails, setVideoDetails] = useState(null);
  const [speedThresholds, setSpeedThresholds] = useState({
    car: 30.0,
    motorcycle: 45.0,
    truck: 25.0,
  });

  // Filters & Modals
  const [activeTab, setActiveTab] = useState(() => {
    return runFilter?.mode === "summary" || !runFilter?.videoId ? "analytics" : "timeline";
  });
  const [activeQuickMode, setActiveQuickMode] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCalibModalOpen, setIsCalibModalOpen] = useState(false);

  const videoId = runFilter?.videoId || null;
  const filename = runFilter?.filename || null;

  const handleBack = () => {
    if (runFilter?.sourcePage === "logs" && onBackToLogs) {
      onBackToLogs();
    } else if (onBackToVideos) {
      onBackToVideos();
    }
  };

  useEffect(() => {
    if (!videoId) return;

    const loadRunEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await fetchEvents({ video_id: videoId, limit: 300 });
        if (data && data.status === "success") {
          setEvents(data.events || []);
        } else {
          setError("Could not load event data for this video run.");
        }

        const { response: vResp, data: vData } = await listAllVideoLogs();
        if (vResp.ok && vData) {
          const logs = vData.logs || [];
          const match = logs.find((item) => String(item.video_id || item.id) === String(videoId));
          if (match) {
            setVideoDetails(match);
            if (match.speed_thresholds || match.run_thresholds) {
              setSpeedThresholds(match.speed_thresholds || match.run_thresholds);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError("Could not connect to backend server.");
      } finally {
        setLoading(false);
      }
    };

    loadRunEvents();
  }, [videoId]);

  useEffect(() => {
    const loadThresholds = async () => {
      try {
        const { response, data } = await fetchSpeedThresholds();
        if (response.ok && data?.status === "success" && data?.thresholds) {
          setSpeedThresholds((prev) => prev || data.thresholds);
        }
      } catch (err) {
        console.error("Could not fetch speed thresholds:", err);
      }
    };
    loadThresholds();
  }, []);

  const handleOpenCalibModal = async () => {
    if (!videoDetails && videoId) {
      try {
        const { response: vResp, data: vData } = await listAllVideoLogs();
        if (vResp.ok && vData) {
          const logs = vData.logs || [];
          const match = logs.find((item) => String(item.video_id || item.id) === String(videoId));
          if (match) {
            setVideoDetails(match);
          }
        }
      } catch (err) {
        console.error("Could not fetch video details for calibration modal:", err);
      }
    }
    setIsCalibModalOpen(true);
  };

  // Clean Filtering Engine
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const meta = ev.metadata || {};
      const normCat = normalizeCategory(ev.label, meta.face_match_status);

      // 1. Quick Mode Filter
      if (activeQuickMode === "ALERTS") {
        const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
        if (!ev.is_alert && !isUnknownPerson) return false;
      }

      // 2. Person Identity Filter
      if (personFilter === "KNOWN" && normCat !== "Known Person") return false;
      if (personFilter === "UNKNOWN" && normCat !== "Unknown Person") return false;

      // 3. Vehicle Category Filter
      if (vehicleFilter !== "ALL") {
        if (ev.label === "person") return false;
        if (normCat !== vehicleFilter) return false;
      }

      return true;
    });
  }, [events, activeQuickMode, personFilter, vehicleFilter]);

  const alertEventsCount = useMemo(() => {
    return events.filter((ev) => {
      const meta = ev.metadata || {};
      const isUnknownPerson = ev.label === "person" && meta.face_match_status !== "known";
      return ev.is_alert || isUnknownPerson;
    }).length;
  }, [events]);

  // Extract exact speed limits applied during this video run
  const runSpeedLimits = useMemo(() => {
    const limits = {
      car: videoDetails?.speed_thresholds?.car ?? videoDetails?.run_thresholds?.car ?? speedThresholds.car ?? 30,
      motorcycle: videoDetails?.speed_thresholds?.motorcycle ?? videoDetails?.run_thresholds?.motorcycle ?? speedThresholds.motorcycle ?? 40,
      truck: videoDetails?.speed_thresholds?.truck ?? videoDetails?.run_thresholds?.truck ?? speedThresholds.truck ?? 25,
    };
    events.forEach((ev) => {
      const meta = ev.metadata || {};
      if (ev.label && meta.speed_limit_kmh) {
        limits[ev.label] = Number(meta.speed_limit_kmh);
      } else if (ev.label && meta.limit_kmh) {
        limits[ev.label] = Number(meta.limit_kmh);
      }
    });
    return limits;
  }, [events, videoDetails, speedThresholds]);

  if (!videoId) {
    return (
      <div className="dashboard-container">
        <div className="global-analytics-header" style={{ marginBottom: "20px" }}>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 6px", fontSize: "1.65rem", color: "#0f172a" }}>
            <BarChart3 size={28} style={{ color: "#0066cc" }} />
            <span>Traffic Flow &amp; Peak Rush Analytics</span>
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.9375rem" }}>
            Comprehensive neighborhood velocity statistics, peak rush hour detection, vehicle classification, and multi-day trend analysis across all CCTV footage.
          </p>
        </div>

        <SummaryAnalyticsTab
          runVideoId={null}
          runFilename={null}
          speedThresholds={speedThresholds}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Optional secondary source back button */}
      {runFilter?.sourcePage === "logs" && (
        <div style={{ display: "flex", justifyContent: "flex-start", width: "100%", marginBottom: "14px" }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#64748b",
              fontSize: "0.8125rem",
              fontWeight: "500",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0066cc")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            <ArrowLeft size={13} />
            <span>Return to Video Logs</span>
          </button>
        </div>
      )}

      {/* Top Navigation Tabs: Timeline vs Summary Stats & Analytics */}
      <div className="event-details-tabs-header">
        <div className="details-tabs-pills">
          {videoId && (
            <button
              type="button"
              className={`details-nav-tab ${activeTab === "timeline" ? "active" : ""}`}
              onClick={() => setActiveTab("timeline")}
            >
              <Clock size={16} />
              <span>Event Timeline</span>
            </button>
          )}

          <button
            type="button"
            className={`details-nav-tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 size={16} />
            <span>Summary Stats &amp; Traffic Intelligence</span>
          </button>
        </div>
      </div>

      {activeTab === "analytics" ? (
        <SummaryAnalyticsTab
          runVideoId={videoId}
          runFilename={filename}
          speedThresholds={runSpeedLimits}
        />
      ) : (
        <>
          {/* Unified Control & Speed Thresholds Top Bar */}
          <div className="speed-limits-run-bar" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "12px 20px",
            marginBottom: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            flexWrap: "wrap",
            gap: "12px"
          }}>
        {/* Speed Thresholds Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#334155", fontSize: "0.875rem" }}>
            <Zap size={16} style={{ color: "#d97706" }} />
            <span>Speed Limits for This Footage:</span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Car size={14} />
              <span>Car Limit: <strong>{runSpeedLimits.car} km/h</strong></span>
            </span>
            <span style={{ background: "#fefce8", color: "#a16207", border: "1px solid #fef08a", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Bike size={14} />
              <span>Bike Limit: <strong>{runSpeedLimits.motorcycle} km/h</strong></span>
            </span>
            <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8125rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Truck size={14} />
              <span>Truck Limit: <strong>{runSpeedLimits.truck} km/h</strong></span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              color: "#0284c7",
              padding: "8px 14px",
              fontSize: "0.875rem",
              fontWeight: "600",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
            onClick={handleOpenCalibModal}
          >
            <Compass size={16} />
            <span>
              {videoDetails?.has_standalone_site_calibration
                ? "Camera Perspective Map"
                : "Camera Calibration Profile"}
            </span>
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", boxShadow: "0 0 12px rgba(52, 211, 153, 0.35)", display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "0.875rem" }}
            onClick={() => setIsReportModalOpen(true)}
          >
            <FileSpreadsheet size={16} />
            <span>Generate Incident Audit Report</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">TOTAL EVENTS</div>
          <div className="metric-value total-val">{events.length}</div>
          <div className="metric-subtext">All events in this footage</div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-title">SECURITY ALERTS</div>
          <div className="metric-value alert-val">{alertEventsCount}</div>
          <div className="metric-subtext">Speeding & unrecognized visitor alerts</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">VEHICLES DETECTED</div>
          <div className="metric-value vehicle-val">
            {events.filter((e) => e.label !== "person").length}
          </div>
          <div className="metric-subtext">Cars, trucks & motorbikes</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">PEOPLE DETECTED</div>
          <div className="metric-value person-val">
            {events.filter((e) => e.label === "person").length}
          </div>
          <div className="metric-subtext">Residents & detected visitors</div>
        </div>
      </div>

      {/* Filtering Engine */}
      <FilterBar
        personFilter={personFilter}
        setPersonFilter={setPersonFilter}
        vehicleFilter={vehicleFilter}
        setVehicleFilter={setVehicleFilter}
        activeQuickMode={activeQuickMode}
        setActiveQuickMode={setActiveQuickMode}
        totalEventsCount={events.length}
        alertEventsCount={alertEventsCount}
      />

          {/* Batch Segregation Event Feed */}
          <div className="events-section">
            <div className="section-header">
              <div className="section-title">
                Recorded Events &amp; Timeline
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                Loading detected events and speed telemetry...
              </div>
            ) : error ? (
              <div style={{ padding: "30px", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: "12px" }}>
                {error}
              </div>
            ) : (
              <BatchEventTimeline
                events={filteredEvents}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                videoDurationSeconds={videoDetails?.duration_seconds || events[0]?.duration_seconds}
                isFiltered={filteredEvents.length !== events.length}
                speedThresholds={runSpeedLimits}
              />
            )}
          </div>
        </>
      )}

      {/* Report Generator Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultVideoId={videoId}
        videoFilename={filename}
        batchId={videoDetails?.batch_id}
      />

      {/* Snapshot Lightbox Inspection Modal */}
      {selectedEvent && (
        <SnapshotModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          speedThresholds={runSpeedLimits}
        />
      )}

      {/* Site Calibration Map Lightbox Modal */}
      {isCalibModalOpen && (
        <CalibrationDiagnosticModal
          video={videoDetails || {
            id: videoId,
            video_id: videoId,
            original_filename: filename || `Video #${videoId}`,
            calibration_diagnostic_url: `/api/videos/${videoId}/calibration-diagnostic`
          }}
          onClose={() => setIsCalibModalOpen(false)}
        />
      )}
    </div>
  );
}

export default EventDetailsPage;

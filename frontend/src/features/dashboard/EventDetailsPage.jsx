
import React, { useState, useEffect, useMemo } from "react";
import { Zap, Car, Bike, Truck, FileSpreadsheet, ArrowLeft, Compass } from "lucide-react";
import { fetchEvents } from "../../api/eventsApi";
import { listAllVideoLogs } from "../../api/videoApi";
import FilterBar, { normalizeCategory } from "./FilterBar";
import BatchEventTimeline from "./BatchEventTimeline";
import SnapshotModal from "./SnapshotModal";
import ReportModal from "./ReportModal";
import CalibrationDiagnosticModal from "../videos/CalibrationDiagnosticModal";
import "./DashboardPage.css";

function EventDetailsPage({ runFilter, onBackToVideos }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoDetails, setVideoDetails] = useState(null);

  // Filters & Modals
  const [activeQuickMode, setActiveQuickMode] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCalibModalOpen, setIsCalibModalOpen] = useState(false);

  const videoId = runFilter?.videoId || null;
  const filename = runFilter?.filename || null;

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
    const limits = { car: 30, motorcycle: 40, truck: 25 };
    events.forEach((ev) => {
      const meta = ev.metadata || {};
      if (ev.label && meta.speed_limit_kmh) {
        limits[ev.label] = meta.speed_limit_kmh;
      }
    });
    return limits;
  }, [events]);

  if (!videoId) {
    return (
      <div className="dashboard-container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>No Active Video Processing Session</h2>
        <p style={{ color: "#94a3b8", margin: "12px 0 24px" }}>
          The Event Details page strictly displays telemetry for a completed video processing run. Please upload a video first.
        </p>
        <button type="button" className="primary-button" onClick={onBackToVideos}>
          <ArrowLeft size={16} style={{ marginRight: "6px" }} /> Go to Video Upload Page
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Top Left Clean Back Link */}
      <div style={{ display: "flex", justifyContent: "flex-start", width: "100%", marginBottom: "-12px" }}>
        <button
          type="button"
          onClick={onBackToVideos}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#475569",
            fontSize: "0.875rem",
            fontWeight: "600",
            transition: "color 0.2s ease"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0066cc")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

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
            <span>Speed Thresholds Set For This Run:</span>
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
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0f9ff", border: "1px solid #0284c7", color: "#0284c7", padding: "8px 14px", fontSize: "0.875rem", fontWeight: "600", borderRadius: "8px" }}
            onClick={handleOpenCalibModal}
          >
            <Compass size={16} />
            <span>View Site Calibration Map</span>
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", boxShadow: "0 0 12px rgba(52, 211, 153, 0.35)", display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "0.875rem" }}
            onClick={() => setIsReportModalOpen(true)}
          >
            <FileSpreadsheet size={16} />
            <span>Generate Security Audit Report</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">TOTAL EVENTS</div>
          <div className="metric-value">{events.length}</div>
          <div className="metric-subtext" title={filename ? filename : `Video #${videoId}`}>
            Video: {filename ? filename : `Video #${videoId}`}
          </div>
        </div>

        <div className="metric-card alert-card">
          <div className="metric-title">SECURITY ALERTS</div>
          <div className="metric-value alert-val">{alertEventsCount}</div>
          <div className="metric-subtext">Speeding & unknown face alerts</div>
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
          <div className="metric-subtext">Pedestrians & recognized faces</div>
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
            Run Event Feed & Timeline
            <span className="event-count-badge">{filteredEvents.length} matching events</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            Loading isolated run telemetry...
          </div>
        ) : error ? (
          <div style={{ padding: "30px", background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: "12px" }}>
            {error}
          </div>
        ) : (
          <BatchEventTimeline
            events={filteredEvents}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        )}
      </div>

      {/* Report Generator Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultVideoId={videoId}
        videoFilename={filename}
      />

      {/* Snapshot Lightbox Inspection Modal */}
      {selectedEvent && (
        <SnapshotModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
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

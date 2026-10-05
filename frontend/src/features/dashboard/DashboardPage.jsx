// frontend/src/features/dashboard/DashboardPage.jsx

import React, { useState, useEffect, useMemo } from "react";
import { Car, Bike, Truck } from "lucide-react";
import { fetchEventSummary, fetchEvents } from "../../api/eventsApi";

// ... existing imports stay same
import { fetchSpeedThresholds } from "../../api/configApi";
import SpeedConfigModal from "./SpeedConfigModal";
import SnapshotModal from "./SnapshotModal";
import ReportModal from "./ReportModal";
import LandingHero from "./LandingHero";
import CapabilitiesGrid from "./CapabilitiesGrid";
import WorkflowSteps from "./WorkflowSteps";
import "./DashboardPage.css";

const API_HOST = "http://localhost:5000";

function DashboardPage({ currentRunFilter, onResetRunFilter, onNavigateToPage, onNavigateToConfig, onNavigateToRun }) {
  const [summary, setSummary] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Speed Limit Threshold State & Modal Visibility
  const [speedThresholds, setSpeedThresholds] = useState({
    car: 30.0,
    motorcycle: 40.0,
    truck: 25.0,
  });
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);

  const videoId = currentRunFilter?.videoId || null;
  const initialMode = currentRunFilter?.mode || "all";

  // Fetch Speed Limits Configuration
  const loadSpeedThresholds = async () => {
    try {
      const { response, data } = await fetchSpeedThresholds();
      if (response.ok && data.status === "success" && data.thresholds) {
        setSpeedThresholds(data.thresholds);
      }
    } catch (err) {
      console.error("Could not fetch speed thresholds:", err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: summaryData } = await fetchEventSummary();
      if (summaryData && summaryData.status === "success") {
        setSummary(summaryData.summary);
      }
    } catch (err) {
      setError("Failed to load telemetry data from backend server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadSpeedThresholds();
  }, [videoId]);

  return (
    <div className="dashboard-container">
      {/* Landing Hero Section */}
      <LandingHero
        onNavigateToUpload={() => onNavigateToPage && onNavigateToPage("videos")}
        onNavigateToConfig={(tab) => {
          if (onNavigateToConfig) {
            onNavigateToConfig(tab);
          } else if (onNavigateToPage) {
            onNavigateToPage("config");
          }
        }}
        onNavigateToLogs={() => onNavigateToPage && onNavigateToPage("logs")}
        speedThresholds={speedThresholds}
      />
      
      {/* 6 Residential Security Capabilities & Quick-Access Portal */}
      <CapabilitiesGrid
        onNavigateToConfig={(tab) => {
          if (onNavigateToConfig) {
            onNavigateToConfig(tab);
          } else if (onNavigateToPage) {
            onNavigateToPage("config");
          }
        }}
        onNavigateToLogs={() => onNavigateToPage && onNavigateToPage("logs")}
        onNavigateToAnalytics={() => {
          if (onNavigateToRun) {
            onNavigateToRun(null, "summary", null);
          } else if (onNavigateToPage) {
            onNavigateToPage("event-details");
          }
        }}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        speedThresholds={speedThresholds}
      />

      {/* 3-Step Pipeline: From Video to Threat Intelligence */}
      <WorkflowSteps
        onNavigateToUpload={() => onNavigateToPage && onNavigateToPage("videos")}
        onNavigateToConfig={(tab) => {
          if (onNavigateToConfig) {
            onNavigateToConfig(tab);
          } else if (onNavigateToPage) {
            onNavigateToPage("config");
          }
        }}
        onNavigateToLogs={() => onNavigateToPage && onNavigateToPage("logs")}
      />

      {/* Speed Threshold Settings Modal */}
      <SpeedConfigModal
        isOpen={isSpeedModalOpen}
        onClose={() => setIsSpeedModalOpen(false)}
        onThresholdsUpdated={(updated) => setSpeedThresholds(updated)}
      />

      {/* Report Generator Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultVideoId={videoId}
        videoFilename={currentRunFilter?.filename}
      />

      {/* Snapshot Lightbox Modal */}
      {selectedEvent && (
        <SnapshotModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

export default DashboardPage;
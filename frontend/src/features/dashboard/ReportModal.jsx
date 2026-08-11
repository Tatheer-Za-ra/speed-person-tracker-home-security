// frontend/src/features/dashboard/ReportModal.jsx

import React, { useState, useEffect } from "react";
import { downloadPdfReport, downloadCsvReport } from "../../api/reportsApi";
import "./ReportModal.css";

function ReportModal({ isOpen, onClose, defaultVideoId = null, videoFilename = null }) {
  const [reportFormat, setReportFormat] = useState("PDF"); // "PDF" | "CSV"
  const [scope, setScope] = useState(defaultVideoId ? "SINGLE" : "ALL"); // "ALL" | "SINGLE"
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (defaultVideoId) {
      setScope("SINGLE");
    } else {
      setScope("ALL");
    }
  }, [defaultVideoId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");

    const params = {};
    if (scope === "SINGLE" && defaultVideoId) {
      params.video_id = defaultVideoId;
    }

    try {
      if (reportFormat === "PDF") {
        await downloadPdfReport(params);
        setSuccessMessage("PDF Security Audit Report generated successfully!");
      } else {
        await downloadCsvReport(params);
        setSuccessMessage("CSV Security Event Log exported successfully!");
      }
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 1400);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-title">
            <span className="report-modal-icon">📄</span>
            <span>Security Audit Report Export</span>
          </div>

          <button type="button" className="report-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <p className="report-modal-description">
          Generate structured security audit reports containing telemetry metrics, intruder detections, and velocity classifications.
        </p>

        {errorMessage && <div className="report-modal-alert error">{errorMessage}</div>}
        {successMessage && <div className="report-modal-alert success">{successMessage}</div>}

        {/* Format Selection Cards */}
        <div className="report-format-grid">
          <div
            className={`format-card ${reportFormat === "PDF" ? "selected" : ""}`}
            onClick={() => setReportFormat("PDF")}
          >
            <div className="format-icon">📄</div>
            <div className="format-title">PDF Audit Report</div>
            <div className="format-subtext">Formatted executive summary, telemetry metrics grid & styled table</div>
          </div>

          <div
            className={`format-card ${reportFormat === "CSV" ? "selected" : ""}`}
            onClick={() => setReportFormat("CSV")}
          >
            <div className="format-icon">📊</div>
            <div className="format-title">CSV Log Spreadsheet</div>
            <div className="format-subtext">Raw data telemetry export for Excel, pandas & external audit systems</div>
          </div>
        </div>

        {/* Audit Scope Options */}
        <div className="report-scope-section">
          <div className="scope-label">Audit Data Scope:</div>
          <div className="scope-radio-group">
            {defaultVideoId && (
              <label className="scope-radio-label">
                <input
                  type="radio"
                  name="reportScope"
                  value="SINGLE"
                  checked={scope === "SINGLE"}
                  onChange={() => setScope("SINGLE")}
                />
                <span>Current Video Run {videoFilename ? `("${videoFilename}")` : `#${defaultVideoId}`}</span>
              </label>
            )}

            <label className="scope-radio-label">
              <input
                type="radio"
                name="reportScope"
                value="ALL"
                checked={scope === "ALL"}
                onChange={() => setScope("ALL")}
              />
              <span>All Processed Video Runs</span>
            </label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="report-modal-footer">
          <button type="button" className="report-btn-secondary" onClick={onClose}>
            Cancel
          </button>

          <button
            type="button"
            className="report-btn-primary"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating
              ? "Compiling Report..."
              : `Download ${reportFormat === "PDF" ? "PDF Report" : "CSV Export"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;

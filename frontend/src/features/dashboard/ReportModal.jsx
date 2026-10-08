import React, { useState, useEffect } from "react";
import { FileSpreadsheet, FileText, Download, Loader2, X } from "lucide-react";
import { downloadPdfReport, downloadCsvReport, fetchReportScopeInfo } from "../../api/reportsApi";
import "./ReportModal.css";

function ReportModal({ isOpen, onClose, defaultVideoId = null, videoFilename = null, batchId = null }) {
  const [reportFormat, setReportFormat] = useState("PDF"); // "PDF" | "CSV"
  const [scope, setScope] = useState(defaultVideoId ? "SINGLE" : "BATCH"); // "BATCH" | "SINGLE"
  const [scopeInfo, setScopeInfo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (defaultVideoId) {
      setScope("SINGLE");
    } else {
      setScope("BATCH");
    }
  }, [defaultVideoId]);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    const loadScopeInfo = async () => {
      try {
        const res = await fetchReportScopeInfo({ video_id: defaultVideoId, batch_id: batchId });
        if (!isCancelled && res && res.status === "success") {
          setScopeInfo(res);
          if (res.batch_video_count <= 1) {
            setScope("SINGLE");
          }
        }
      } catch (err) {
        console.error("Could not fetch report scope info:", err);
      }
    };
    loadScopeInfo();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, defaultVideoId, batchId]);

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

  const isMultiVideoBatch = (scopeInfo?.batch_video_count || 0) > 1;

  const handleDownload = async () => {
    setIsGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");

    const params = {};
    if ((scope === "SINGLE" || !isMultiVideoBatch) && defaultVideoId) {
      params.video_id = defaultVideoId;
      params.scope = "single";
    } else {
      params.scope = "batch";
      if (defaultVideoId) {
        params.video_id = defaultVideoId;
      }
      if (batchId) {
        params.batch_id = batchId;
      }
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
            <FileSpreadsheet size={18} style={{ color: "#059669" }} />
            <span>Security Audit Report Export</span>
          </div>

          <button type="button" className="report-modal-close" onClick={onClose} title="Close">
            <X size={18} />
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
            <div className="format-icon">
              <FileText size={20} style={{ color: "#dc2626" }} />
            </div>
            <div className="format-title">PDF Audit Report</div>
            <div className="format-subtext">Formatted executive summary, telemetry metrics grid & styled table</div>
          </div>

          <div
            className={`format-card ${reportFormat === "CSV" ? "selected" : ""}`}
            onClick={() => setReportFormat("CSV")}
          >
            <div className="format-icon">
              <FileSpreadsheet size={20} style={{ color: "#059669" }} />
            </div>
            <div className="format-title">CSV Log Spreadsheet</div>
            <div className="format-subtext">Raw data telemetry export for Excel, pandas & external audit systems</div>
          </div>
        </div>

        {/* Audit Scope Options */}
        <div className="report-scope-section">
          <div className="scope-label">
            {isMultiVideoBatch ? "Audit Data Scope:" : "Audit Target:"}
          </div>
          {isMultiVideoBatch ? (
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
                  <span title={videoFilename || String(defaultVideoId)}>
                    {scopeInfo?.current_video_label || `Current Video Run ${videoFilename ? `("${videoFilename}")` : `#${defaultVideoId}`}`}
                  </span>
                </label>
              )}

              <label className="scope-radio-label">
                <input
                  type="radio"
                  name="reportScope"
                  value="BATCH"
                  checked={scope === "BATCH"}
                  onChange={() => setScope("BATCH")}
                />
                <span title={scopeInfo?.batch_filenames?.join(", ") || ""}>
                  {scopeInfo?.session_label || "Entire Upload Session"}
                </span>
              </label>
            </div>
          ) : (
            <div className="scope-single-info" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem", color: "#334155" }}>
              <span title={videoFilename || String(defaultVideoId || "")}>
                {scopeInfo?.current_video_label || (videoFilename ? `Current Video Run ("${videoFilename}")` : `Video Run #${defaultVideoId}`)}
              </span>
            </div>
          )}
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
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="spin-icon" style={{ animation: "spin 1.2s linear infinite" }} />
                <span>Compiling Report...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Download {reportFormat === "PDF" ? "PDF Report" : "CSV Export"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;

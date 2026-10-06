// frontend/src/features/dashboard/CapabilitiesGrid.jsx

import React from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  UserCheck,
  ClipboardList,
  BarChart3,
  FileText,
  Lock,
  ArrowRight,
  Zap,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
} from "lucide-react";
import "./CapabilitiesGrid.css";

function CapabilitiesGrid({
  onNavigateToConfig,
  onNavigateToLogs,
  onNavigateToAnalytics,
  onOpenReportModal,
  speedThresholds,
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  };

  return (
    <section className="capabilities-section">
      <div className="capabilities-container">
        {/* Eyebrow Header */}
        <div className="capabilities-eyebrow-wrapper">
          <span className="cap-eyebrow-line left" />
          <span className="capabilities-eyebrow">RESIDENTIAL SECURITY CAPABILITIES</span>
          <span className="cap-eyebrow-line right" />
        </div>

        {/* Section Headline & Description */}
        <h2 className="capabilities-headline">
          Everyday protection HavenTrack handles for you.
        </h2>
        <p className="capabilities-subheadline">
          Turn residential camera footage into verified visitor logs, speed enforcement, and formal audit reports—100% privately on local hardware.
        </p>

        {/* 6 Cards Grid (3 Columns x 2 Rows) */}
        <motion.div
          className="capabilities-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {/* CARD 1: Driveway Speed & Safety */}
          <motion.div
            className="capability-card"
            variants={cardVariants}
            onClick={() => onNavigateToConfig && onNavigateToConfig("speed")}
            title="Click to configure speed limits"
          >
            {/* Top Bar: Icon Left + Title Right */}
            <div className="cap-top-bar">
              <div className="cap-icon-box blue">
                <Gauge size={24} />
              </div>
              <h3 className="cap-card-title">Driveway Speed &amp; Safety</h3>
            </div>

            {/* Explanatory text starting right below the icon across full width */}
            <p className="cap-card-desc">
              Automatically flag delivery vans, cars, and bikes exceeding your private driveway or street limits.
            </p>

            {/* Spacious Visual Viewport */}
            <div className="cap-viewport">
              <img
                src="/home-cctv-detect.jpg"
                alt="Driveway Speed Monitoring"
                className="cap-viewport-img"
              />

              {/* Bounding Box 1: Car with non-overlapping tag row */}
              <div className="py-box car-box">
                <div className="py-tags-wrapper">
                  <span className="py-tag orange">car • 38 km/h</span>
                  <span className="py-tag red">overspeed</span>
                </div>
              </div>

              {/* Bounding Box 2: Speed limit zone */}
              <div className="py-box speed-zone-box">
                <span className="py-tag cyan">
                  limit: {speedThresholds?.car ?? 25} km/h
                </span>
              </div>
            </div>

            {/* Section Link Text Footer */}
            <div className="cap-link-footer">
              <span className="cap-link-text blue">
                <span>Configure Speed Limits</span>
                <ArrowRight size={15} className="link-arrow" />
              </span>
            </div>
          </motion.div>

          {/* CARD 2: Family & Resident Verification */}
          <motion.div
            className="capability-card"
            variants={cardVariants}
            onClick={() => onNavigateToConfig && onNavigateToConfig("persons")}
            title="Click to manage known persons"
          >
            {/* Top Bar: Icon Left + Title Right */}
            <div className="cap-top-bar">
              <div className="cap-icon-box green">
                <UserCheck size={24} />
              </div>
              <h3 className="cap-card-title">Family &amp; Resident Verification</h3>
            </div>

            {/* Explanatory text starting right below the icon across full width */}
            <p className="cap-card-desc">
              Recognize family members and authorized residents arriving home while keeping all facial profiles private.
            </p>

            {/* Spacious Visual Viewport */}
            <div className="cap-viewport">
              <img
                src="/home-cctv-detect.jpg"
                alt="Resident Face Recognition"
                className="cap-viewport-img"
              />

              {/* Bounding Box: Person with Identity Tag */}
              <div className="py-box person-box">
                <div className="py-tags-wrapper">
                  <span className="py-tag purple">person</span>
                  <span className="py-tag green">resident: sara</span>
                </div>
              </div>

              {/* Bounding Box: Gate Entrance */}
              <div className="py-box gate-zone-box">
                <span className="py-tag yellow">entry gate</span>
              </div>
            </div>

            {/* Section Link Text Footer */}
            <div className="cap-link-footer">
              <span className="cap-link-text green">
                <span>Manage Known Persons</span>
                <ArrowRight size={15} className="link-arrow" />
              </span>
            </div>
          </motion.div>

          {/* CARD 3: Comprehensive Security Event Logs */}
          <motion.div
            className="capability-card"
            variants={cardVariants}
            onClick={onNavigateToLogs}
            title="Click to view all event logs"
          >
            {/* Top Bar: Icon Left + Title Right */}
            <div className="cap-top-bar">
              <div className="cap-icon-box amber">
                <ClipboardList size={24} />
              </div>
              <h3 className="cap-card-title">Comprehensive Event &amp; Audit Logs</h3>
            </div>

            {/* Explanatory text starting right below the icon across full width */}
            <p className="cap-card-desc">
              Review the unified timeline of all detected activities—including overspeed vehicles, resident entries, and visitor alerts.
            </p>

            {/* Spacious Visual Viewport: Multi-Object Surveillance Stream */}
            <div className="cap-viewport">
              <img
                src="/home-cctv-setup.jpg"
                alt="Comprehensive Event Audit Feed"
                className="cap-viewport-img"
              />

              {/* Bounding Box 1: Driveway Zone */}
              <div className="py-box driveway-zone">
                <span className="py-tag cyan">driveway zone</span>
              </div>

              {/* Bounding Box 2: Gate Security Boundary */}
              <div className="py-box perimeter-boundary">
                <div className="py-tags-wrapper">
                  <span className="py-tag amber">perimeter</span>
                  <span className="py-tag green">secure</span>
                </div>
              </div>
            </div>

            {/* Section Link Text Footer */}
            <div className="cap-link-footer">
              <span className="cap-link-text amber">
                <span>View All Event Logs</span>
                <ArrowRight size={15} className="link-arrow" />
              </span>
            </div>
          </motion.div>

          {/* CARD 4: Peak Rush & Traffic Flow Analytics */}
          <motion.div
            className="capability-card"
            variants={cardVariants}
            onClick={onNavigateToAnalytics}
            title="Click to explore peak rush and traffic analytics across all CCTV logs"
          >
            {/* Top Bar: Icon Left + Title Right */}
            <div className="cap-top-bar">
              <div className="cap-icon-box cyan">
                <BarChart3 size={24} />
              </div>
              <h3 className="cap-card-title">Peak Rush &amp; Traffic Flow Analytics</h3>
            </div>

            {/* Explanatory text starting right below the icon across full width */}
            <p className="cap-card-desc">
              Pinpoint peak traffic rush hours, measure velocity patterns, and analyze hourly distributions across all CCTV history, past 7 days, or custom dates.
            </p>

            {/* Spacious Visual Viewport: Dark-Mode Peak Rush Analytics Graph */}
            <div className="cap-viewport rush-chart-viewport">
              <div className="rush-mini-chart">
                <div className="rush-highlight-banner">
                  <Clock size={14} className="rush-clock-icon" />
                  <span>Rush Peak: <strong>8:00 AM – 9:00 AM</strong> (42 vehicles)</span>
                </div>
                <div className="rush-bars-row">
                  <div className="mini-bar" style={{ height: "25%" }} />
                  <div className="mini-bar" style={{ height: "35%" }} />
                  <div className="mini-bar" style={{ height: "45%" }} />
                  <div className="mini-bar active-peak" style={{ height: "92%" }}>
                    <span className="bar-peak-badge">Peak</span>
                  </div>
                  <div className="mini-bar" style={{ height: "70%" }} />
                  <div className="mini-bar" style={{ height: "50%" }} />
                  <div className="mini-bar" style={{ height: "82%" }} />
                  <div className="mini-bar" style={{ height: "65%" }} />
                  <div className="mini-bar" style={{ height: "40%" }} />
                  <div className="mini-bar" style={{ height: "20%" }} />
                </div>
                <div className="rush-time-labels">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span className="active-label">8 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>11 PM</span>
                </div>
              </div>
            </div>

            {/* Section Link Text Footer */}
            <div className="cap-link-footer">
              <span className="cap-link-text cyan">
                <span>Explore Traffic &amp; Peak Rush Stats</span>
                <ArrowRight size={15} className="link-arrow" />
              </span>
            </div>
          </motion.div>

          {/* CARD 5: Printable Incident Audit Reports */}
          <motion.div
            className="capability-card"
            variants={cardVariants}
            onClick={onOpenReportModal}
            title="Click to generate incident report"
          >
            {/* Top Bar: Icon Left + Title Right */}
            <div className="cap-top-bar">
              <div className="cap-icon-box indigo">
                <FileText size={24} />
              </div>
              <h3 className="cap-card-title">Printable Incident Audit Reports</h3>
            </div>

            {/* Explanatory text starting right below the icon across full width */}
            <p className="cap-card-desc">
              Export formal, time-stamped incident summaries and evidence tables in PDF or CSV format for HOA or authorities.
            </p>

            {/* Spacious Visual Viewport: Official PDF Certificate Preview */}
            <div className="cap-viewport report-doc-viewport">
              <div className="mini-report-doc">
                <div className="report-doc-top">
                  <Shield size={16} className="report-shield-icon" />
                  <span className="report-doc-brand">HavenTrack Official Security Audit</span>
                </div>
                <div className="report-doc-lines">
                  <div className="doc-skeleton-line wide" />
                  <div className="doc-skeleton-line medium" />
                  <div className="doc-skeleton-line full" />
                </div>
                <div className="report-doc-footer-pills">
                  <span className="doc-badge green">
                    <CheckCircle2 size={12} /> Verified Evidence Attached
                  </span>
                  <span className="doc-badge blue">
                    PDF / CSV
                  </span>
                </div>
              </div>
            </div>

            {/* Section Link Text Footer */}
            <div className="cap-link-footer">
              <span className="cap-link-text indigo">
                <span>Generate System Audit Report</span>
                <ArrowRight size={15} className="link-arrow" />
              </span>
            </div>
          </motion.div>

          {/* CARD 6: Zero-Cloud Local Privacy & Retention */}
          <motion.div
            className="capability-card"
            variants={cardVariants}
            onClick={() => onNavigateToConfig && onNavigateToConfig("retention")}
            title="Click to manage retention & storage"
          >
            {/* Top Bar: Icon Left + Title Right */}
            <div className="cap-top-bar">
              <div className="cap-icon-box purple">
                <Lock size={24} />
              </div>
              <h3 className="cap-card-title">Zero-Cloud Privacy &amp; Retention</h3>
            </div>

            {/* Explanatory text starting right below the icon across full width */}
            <p className="cap-card-desc">
              Keep all video footage and sensitive facial data strictly on your home computer with automated cleanup.
            </p>

            {/* Spacious Visual Viewport: Local Storage Hub & Trust Chips */}
            <div className="cap-viewport storage-hub-viewport">
              <div className="storage-trust-chips-wrap">
                <div className="trust-chip-item">
                  <Lock size={15} className="chip-ico green" />
                  <span>100% Offline Processing</span>
                </div>
                <div className="trust-chip-item">
                  <Shield size={15} className="chip-ico blue" />
                  <span>Zero Cloud Uploads</span>
                </div>
                <div className="trust-chip-item">
                  <Clock size={15} className="chip-ico purple" />
                  <span>Auto-Purge Expired Footage</span>
                </div>
              </div>
            </div>

            {/* Section Link Text Footer */}
            <div className="cap-link-footer">
              <span className="cap-link-text purple">
                <span>Manage Retention &amp; Storage</span>
                <ArrowRight size={15} className="link-arrow" />
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default CapabilitiesGrid;

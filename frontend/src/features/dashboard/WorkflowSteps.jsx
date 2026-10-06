// frontend/src/features/dashboard/WorkflowSteps.jsx

import React from "react";
import { motion } from "framer-motion";
import {
  Video,
  Upload,
  Cpu,
  ShieldAlert,
  Camera,
  FileText,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Eye,
  Sliders,
  ShieldCheck,
  Lock,
} from "lucide-react";
import "./WorkflowSteps.css";

function WorkflowSteps() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section className="workflow-section">
      <div className="workflow-container">
        {/* Eyebrow Header with Accent Lines */}
        <div className="workflow-eyebrow-wrapper">
          <span className="eyebrow-line left" />
          <span className="workflow-eyebrow">HOW HAVENTRACK WORKS</span>
          <span className="eyebrow-line right" />
        </div>

        {/* Section Headline & Description */}
        <h2 className="workflow-headline">
          Smart Home Surveillance. <br />
          Instant Threat Intelligence.
        </h2>
        <p className="workflow-subheadline">
          HavenTrack transforms recorded residential CCTV footage into automated vehicle speed monitoring 
          and face-verified home security—running 100% locally and privately on your own hardware.
        </p>

        {/* 2-Top + 1-Bottom Grid */}
        <motion.div
          className="workflow-cards-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* STEP 1: Upload Security Footage */}
          <motion.div className="workflow-step-card" variants={cardVariants}>
            <div className="step-card-header">
              <div className="step-title-row">
                <div className="step-badge">1</div>
                <h3 className="step-title">Upload Security Footage</h3>
              </div>
              <p className="step-desc">
                Upload your residential CCTV footage. HavenTrack automatically locks road horizon and camera angle for accurate speed tracking.
              </p>
            </div>

            {/* Visual Mockup 1: Residential Camera Perspective Calibration */}
            <div className="step-mockup-card">
              <div className="mockup-top-strip">
                <div className="mockup-pill-tag">
                  <Video size={13} className="pill-icon blue" />
                  <span>CCTV Video (MP4 / AVI)</span>
                </div>
                <div className="mockup-pill-tag neutral">
                  <Sliders size={13} className="pill-icon" />
                  <span>Fixed Mount: 3.5m • 30° Tilt</span>
                </div>
              </div>

              <div className="mockup-viewport">
                <img
                  src="/home-cctv-setup.jpg"
                  alt="HavenTrack Residential CCTV Camera Setup"
                  className="mockup-img"
                  onError={(e) => {
                    e.target.src = "/workflow-calibration.jpg";
                  }}
                />
                
                {/* Calibration Horizon & Perspective Overlay */}
                <div className="calib-horizon-line" />
                <div className="calib-horizon-badge">Road Horizon Locked</div>

                {/* Perspective Guide Lines */}
                <svg className="perspective-guide-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="50" y1="28" x2="18" y2="92" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="50" y1="28" x2="82" y2="92" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="28" y1="70" x2="72" y2="70" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
                </svg>

                <div className="viewport-overlay-bottom">
                  <span className="calib-status-chip">
                    <CheckCircle2 size={13} className="chip-icon green" />
                    <span>Smart Calibration</span>
                  </span>
                  <span className="calib-baseline-tag">15m Baseline</span>
                </div>
              </div>

              <div className="mockup-footer-note">
                <span className="note-dot green" />
                <span>Zero manual perspective tuning required</span>
              </div>
            </div>
          </motion.div>

          {/* STEP 2: Speed Tracking & Identity Check */}
          <motion.div className="workflow-step-card" variants={cardVariants}>
            <div className="step-card-header">
              <div className="step-title-row">
                <div className="step-badge">2</div>
                <h3 className="step-title">Speed Tracking &amp; Identity Check</h3>
              </div>
              <p className="step-desc">
                Vision engine evaluates vehicle speeds against neighborhood limits, while face recognition verifies family from unknown visitors.
              </p>
            </div>

            {/* Visual Mockup 2: Residential AI Vision Telemetry & Detection */}
            <div className="step-mockup-card">
              <div className="mockup-top-strip">
                <div className="mockup-pill-tag">
                  <Zap size={13} className="pill-icon blue" />
                  <span>AI Vision Engine</span>
                </div>
                <div className="mockup-pill-tag offline-blue">
                  <span className="pulse-dot blue" />
                  <span>Frame-Accurate Tracking</span>
                </div>
              </div>

              <div className="mockup-viewport">
                <img
                  src="/home-cctv-detect.jpg"
                  alt="HavenTrack Residential Vehicle & Person Tracking"
                  className="mockup-img"
                  onError={(e) => {
                    e.target.src = "/workflow-detection.jpg";
                  }}
                />

                {/* Vehicle Speed Violation Bounding Box */}
                <div className="vision-box vehicle-box">
                  <div className="vision-tag overspeed">
                    <Zap size={11} />
                    <span>Vehicle: <strong>38 km/h</strong></span>
                    <span className="tag-alert-flag">OVER LIMIT</span>
                  </div>
                </div>

                {/* Person Tracking Bounding Box */}
                <div className="vision-box person-box">
                  <div className="vision-tag identity">
                    <Eye size={11} />
                    <span>Visitor Detected</span>
                  </div>
                </div>

                <div className="viewport-overlay-bottom">
                  <span className="telemetry-chip">
                    Driveway Limit: <strong>25 km/h</strong>
                  </span>
                  <span className="telemetry-chip">
                    Tracking Accuracy: <strong>96%</strong>
                  </span>
                </div>
              </div>

              <div className="mockup-footer-note">
                <span className="note-dot blue" />
                <span>Continuous trajectory tracking &amp; speed evaluation</span>
              </div>
            </div>
          </motion.div>

          {/* STEP 3: Instant Alerts & Incident Reports (Full Width 3rd Section) */}
          <motion.div className="workflow-step-card full-width" variants={cardVariants}>
            <div className="card-full-width-layout">
              {/* Left Column: Details & Local Offline Architecture */}
              <div className="full-width-header-col">
                <div className="step-badge">3</div>
                <h3 className="step-title">Instant Alerts & Incident Reports</h3>
                <p className="step-desc">
                  HavenTrack automatically captures high-resolution evidence snapshots of speeders and intruders, records time-stamped incident logs, and exports formal PDF audit reports for neighborhood security.
                </p>

                <div className="full-width-privacy-strip">
                  <div className="mockup-pill-tag">
                    <HardDrive size={13} className="pill-icon purple" />
                    <span>Local Database Storage</span>
                  </div>
                  <div className="mockup-pill-tag security">
                    <Lock size={12} className="pill-icon" />
                    <span>100% Offline &amp; Private</span>
                  </div>
                </div>

                <div className="mockup-footer-note">
                  <span className="note-dot purple" />
                  <span>All surveillance footage, speed metrics, and logs stay on your local computer</span>
                </div>
              </div>

              {/* Right Column: 2x2 Grid of the 4 High-Fidelity Outcome Cards */}
              <div className="full-width-outcomes-grid">
                <div className="outcome-item red-accent">
                  <div className="outcome-icon-wrap red">
                    <Camera size={16} />
                  </div>
                  <div className="outcome-content">
                    <span className="outcome-title">Evidence Snapshot Saved</span>
                    <span className="outcome-desc">High-res timestamped photo crop captured</span>
                  </div>
                </div>

                <div className="outcome-item amber-accent">
                  <div className="outcome-icon-wrap amber">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="outcome-content">
                    <span className="outcome-title">Security Incidents Logged</span>
                    <span className="outcome-desc">Overspeed &amp; visitor events filed in history</span>
                  </div>
                </div>

                <div className="outcome-item cyan-accent">
                  <div className="outcome-icon-wrap cyan">
                    <Clock size={16} />
                  </div>
                  <div className="outcome-content">
                    <span className="outcome-title">Peak Rush &amp; Traffic Trends</span>
                    <span className="outcome-desc">Hourly traffic flow &amp; multi-day trend analytics</span>
                  </div>
                </div>

                <div className="outcome-item green-accent">
                  <div className="outcome-icon-wrap green">
                    <FileText size={16} />
                  </div>
                  <div className="outcome-content">
                    <span className="outcome-title">Audit PDF Report Ready</span>
                    <span className="outcome-desc">One-click printable formal report</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default WorkflowSteps;

// frontend/src/features/dashboard/LandingHero.jsx

import React from "react";
import { motion } from "framer-motion";
import { Gauge, UserCheck, AlertTriangle, ArrowRight, Shield, Zap, Car, Bike, Truck } from "lucide-react";
import "./LandingHero.css";

function LandingHero({ onNavigateToUpload, speedThresholds }) {
  // Stagger animation container variants
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

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: (customIndex) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, delay: customIndex * 0.15, ease: "easeOut" },
    }),
  };

  return (
    <div className="landing-hero">
      <div className="hero-container">
        {/* Left Column: Typography & Primary Action */}
        <motion.div
          className="hero-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="hero-badge" variants={itemVariants}>
            <Shield className="badge-icon" size={16} />
            <span>AI Surveillance Command Center</span>
          </motion.div>

          <motion.h1 className="hero-headline" variants={itemVariants}>
            Smarter Security. <br />
            <span className="headline-accent">Precision Tracking.</span>
          </motion.h1>

          <motion.p className="hero-subheadline" variants={itemVariants}>
            Advanced AI that tracks vehicle speeds and identifies unknown persons on your property in real-time with automated security reports.
          </motion.p>

          <motion.div className="hero-actions" variants={itemVariants}>
            <motion.button
              type="button"
              className="primary-cta-btn"
              onClick={onNavigateToUpload}
              whileHover={{ scale: 1.04, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Upload Surveillance Footage</span>
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Right Column: 3-Card Cascading Feature Grid */}
        <div className="hero-right">
          <motion.div
            className="feature-card"
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.03, translateY: -4 }}
          >
            <div className="card-header">
              <div className="card-icon-box cyan">
                <Gauge size={22} />
              </div>
              <div>
                <h3 className="card-title">Speed Telemetry</h3>
                <p className="card-subtitle">Velocity tracking & speed limit flags</p>
              </div>
            </div>

            <p className="card-desc">
              Computes vehicle velocity (km/h) across frames and flags overspeed violations against threshold limits.
            </p>

            {/* Pill-Shaped Badges */}
            <div className="pill-badges-row">
              <span className="pill-badge">
                <Car size={14} className="pill-icon" />
                <span>Car: <strong>{speedThresholds?.car ?? 30} km/h</strong></span>
              </span>

              <span className="pill-badge">
                <Bike size={14} className="pill-icon" />
                <span>Bike: <strong>{speedThresholds?.motorcycle ?? 40} km/h</strong></span>
              </span>

              <span className="pill-badge">
                <Truck size={14} className="pill-icon" />
                <span>Truck: <strong>{speedThresholds?.truck ?? 25} km/h</strong></span>
              </span>
            </div>
          </motion.div>

          <motion.div
            className="feature-card"
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.03, translateY: -4 }}
          >
            <div className="card-header">
              <div className="card-icon-box green">
                <UserCheck size={22} />
              </div>
              <div>
                <h3 className="card-title">Known Person Recognition</h3>
                <p className="card-subtitle">Facenet512 deep feature embeddings</p>
              </div>
            </div>

            <p className="card-desc">
              Matches facial embeddings against authorized resident database with Cosine Similarity confidence scores.
            </p>

            {/* Pill-Shaped Badges */}
            <div className="pill-badges-row">
              <span className="pill-badge success">
                <UserCheck size={14} className="pill-icon" />
                <span>Known Person (94.2% Match)</span>
              </span>

              <span className="pill-badge">
                <Shield size={14} className="pill-icon" />
                <span>Authorized Resident</span>
              </span>
            </div>
          </motion.div>

          <motion.div
            className="feature-card"
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.03, translateY: -4 }}
          >
            <div className="card-header">
              <div className="card-icon-box red">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="card-title">Security Alerts</h3>
                <p className="card-subtitle">Automated threat tagging & audit logs</p>
              </div>
            </div>

            <p className="card-desc">
              Triggers security alert cards whenever an unrecognized intruder or speeding vehicle is detected.
            </p>

            {/* Pill-Shaped Badges */}
            <div className="pill-badges-row">
              <span className="pill-badge alert">
                <AlertTriangle size={14} className="pill-icon" />
                <span>Unrecognized Intruder</span>
              </span>

              <span className="pill-badge alert">
                <Zap size={14} className="pill-icon" />
                <span>Overspeed Flagged</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default LandingHero;

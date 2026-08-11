// frontend/src/features/dashboard/LandingHero.jsx

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Gauge, UserCheck, AlertTriangle, ArrowRight, Shield, Zap, Car, Bike, Truck, ChevronRight, HardDrive, Clock } from "lucide-react";
import "./LandingHero.css";

function LandingHero({ onNavigateToUpload, onNavigateToConfig, onNavigateToLogs, speedThresholds }) {
  // Typewriter effect state
  const [typewriterText, setTypewriterText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  const phrases = useMemo(() => [
    "Precision Speed Telemetry.",
    "Automated Security Alerts.",
    "Advanced Person Recognition."
  ], []);

  useEffect(() => {
    const handleTyping = () => {
      const currentPhraseIndex = loopNum % phrases.length;
      const fullText = phrases[currentPhraseIndex];

      setTypewriterText(
        isDeleting
          ? fullText.substring(0, typewriterText.length - 1)
          : fullText.substring(0, typewriterText.length + 1)
      );

      setTypingSpeed(isDeleting ? 50 : 100);

      if (!isDeleting && typewriterText === fullText) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && typewriterText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [typewriterText, isDeleting, loopNum, typingSpeed, phrases]);

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
    hidden: { opacity: 0, y: 30 },
    visible: (customIndex) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: customIndex * 0.12, ease: "easeOut" },
    }),
  };

  return (
    <div className="landing-hero">
      <div className="hero-container">
        {/* Top Hero Banner: Split Text Left & Image Right */}
        <div className="hero-top-banner">
          {/* Left Side: Headline & CTA */}
          <motion.div
            className="hero-text-content"
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
              <span className="headline-accent">{typewriterText}</span>
              <span className="blinking-cursor">|</span>
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

          {/* Right Side: Smart Security Illustration Image */}
          <motion.div
            className="hero-image-wrapper"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img
              src="/hero-security.jpg"
              alt="HavenTrack Smart Security AI Surveillance"
              className="hero-main-img"
            />
          </motion.div>
        </div>

        {/* Bottom Section: 4 Feature Cards Row (Strict Left-Aligned Equal Layout) */}
        <div className="hero-cards-row">
          {/* Card 1: Speed Telemetry */}
          <motion.div
            className="feature-card cyan-theme"
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, translateY: -4 }}
          >
            <div className="card-top-section">
              <div className="card-icon-box cyan">
                <Gauge size={22} />
              </div>

              <h3 className="card-title">Speed Telemetry</h3>
              <p className="card-subtitle">Real-time velocity tracking</p>
            </div>

            <hr className="card-divider" />

            <p className="card-desc">
              Monitors vehicle speeds in real-time and flags violations exceeding limits.
            </p>

            <div className="pill-badges-row">
              <span className="pill-badge cyan">
                <Car size={14} className="pill-icon" />
                <span>Car: <strong>{speedThresholds?.car ?? 30} km/h</strong></span>
              </span>

              <span className="pill-badge cyan">
                <Bike size={14} className="pill-icon" />
                <span>Bike: <strong>{speedThresholds?.motorcycle ?? 40} km/h</strong></span>
              </span>

              <span className="pill-badge cyan">
                <Truck size={14} className="pill-icon" />
                <span>Truck: <strong>{speedThresholds?.truck ?? 25} km/h</strong></span>
              </span>
            </div>

            <hr className="card-divider" />

            <button
              type="button"
              className="card-quick-link cyan"
              onClick={() => onNavigateToConfig && onNavigateToConfig("speed")}
            >
              <span>Configure Speed Limits</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>

          {/* Card 2: Person Recognition */}
          <motion.div
            className="feature-card green-theme"
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, translateY: -4 }}
          >
            <div className="card-top-section">
              <div className="card-icon-box green">
                <UserCheck size={22} />
              </div>

              <h3 className="card-title">Person Recognition</h3>
              <p className="card-subtitle">Identify residents & visitors</p>
            </div>

            <hr className="card-divider" />

            <p className="card-desc">
              Identifies family members and authorized residents upon entering property.
            </p>

            <div className="pill-badges-row">
              <span className="pill-badge green">
                <UserCheck size={14} className="pill-icon" />
                <span>Recognized Resident</span>
              </span>

              <span className="pill-badge green">
                <Shield size={14} className="pill-icon" />
                <span>Authorized Visitor</span>
              </span>
            </div>

            <hr className="card-divider" />

            <button
              type="button"
              className="card-quick-link green"
              onClick={() => onNavigateToConfig && onNavigateToConfig("persons")}
            >
              <span>Manage Known Persons</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>

          {/* Card 3: Security Alerts */}
          <motion.div
            className="feature-card red-theme"
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, translateY: -4 }}
          >
            <div className="card-top-section">
              <div className="card-icon-box red">
                <AlertTriangle size={22} />
              </div>

              <h3 className="card-title">Security Alerts</h3>
              <p className="card-subtitle">Instant threat notifications</p>
            </div>

            <hr className="card-divider" />

            <p className="card-desc">
              Generates security alert tags whenever intruders or speeding vehicles are detected.
            </p>

            <div className="pill-badges-row">
              <span className="pill-badge red">
                <AlertTriangle size={14} className="pill-icon" />
                <span>Unrecognized Intruder</span>
              </span>

              <span className="pill-badge red">
                <Zap size={14} className="pill-icon" />
                <span>Overspeed Flagged</span>
              </span>
            </div>

            <hr className="card-divider" />

            <button
              type="button"
              className="card-quick-link red"
              onClick={onNavigateToLogs}
            >
              <span>View Event Logs</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>

          {/* Card 4: Storage Retention */}
          <motion.div
            className="feature-card purple-theme"
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, translateY: -4 }}
          >
            <div className="card-top-section">
              <div className="card-icon-box purple">
                <HardDrive size={22} />
              </div>

              <h3 className="card-title">Storage Retention</h3>
              <p className="card-subtitle">Automated storage cleanup</p>
            </div>

            <hr className="card-divider" />

            <p className="card-desc">
              Automates disk space cleanup and manages video event log retention policies.
            </p>

            <div className="pill-badges-row">
              <span className="pill-badge purple">
                <Clock size={14} className="pill-icon" />
                <span>14 Days Policy</span>
              </span>

              <span className="pill-badge purple">
                <Zap size={14} className="pill-icon" />
                <span>Auto Cleanup</span>
              </span>
            </div>

            <hr className="card-divider" />

            <button
              type="button"
              className="card-quick-link purple"
              onClick={() => onNavigateToConfig && onNavigateToConfig("retention")}
            >
              <span>Manage Retention Settings</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default LandingHero;

// frontend/src/features/dashboard/LandingHero.jsx

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import "./LandingHero.css";

function LandingHero({ onNavigateToUpload, onNavigateToConfig, onNavigateToLogs, speedThresholds }) {
  // Typewriter effect state
  const [typewriterText, setTypewriterText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  const phrases = useMemo(() => [
    "Precision Speed Telemetry.",
    "Formal Incident Audits.",
    "Resident & Visitor Recognition."
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
              <span>Local Residential Vision Intelligence</span>
            </motion.div>

            <motion.h1 className="hero-headline" variants={itemVariants}>
              Smarter Security. <br />
              <span className="headline-accent">{typewriterText}</span>
              <span className="blinking-cursor">|</span>
            </motion.h1>

            <motion.p className="hero-subheadline" variants={itemVariants}>
              Transforms recorded residential CCTV footage into frame-by-frame vehicle velocity tracking, resident verification, and formal incident audit reports.
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
      </div>
    </div>
  );
}

export default LandingHero;

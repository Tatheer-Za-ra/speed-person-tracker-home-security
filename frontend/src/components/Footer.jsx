// frontend/src/components/Footer.jsx

import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="haventrack-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-logo">Haven<span className="brand-accent">Track</span></span>
          <span className="footer-tagline">AI-Powered Video Surveillance & Intelligent Event Analytics</span>
        </div>

        <div className="footer-copy">
          © 2026 HavenTrack. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;

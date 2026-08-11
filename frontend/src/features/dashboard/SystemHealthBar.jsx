// frontend/src/features/dashboard/SystemHealthBar.jsx

import React from "react";
import "./SystemHealthBar.css";

function SystemHealthBar() {
  return (
    <div className="system-health-bar">
      <div className="health-item">
        <span className="health-dot online"></span>
        <span className="health-label">Flask API Server:</span>
        <span className="health-value">CONNECTED (127.0.0.1:5000)</span>
      </div>

      <div className="health-item">
        <span className="health-dot online"></span>
        <span className="health-label">AI Engine:</span>
        <span className="health-value">YOLOv8 + DeepSORT + Cosine Sim READY</span>
      </div>

      <div className="health-item">
        <span className="health-dot online"></span>
        <span className="health-label">Database:</span>
        <span className="health-value">SQLite CONNECTED</span>
      </div>

      <div className="health-item">
        <span className="health-dot online pulse"></span>
        <span className="health-label">Security Monitor:</span>
        <span className="health-value highlight">ACTIVE</span>
      </div>
    </div>
  );
}

export default SystemHealthBar;

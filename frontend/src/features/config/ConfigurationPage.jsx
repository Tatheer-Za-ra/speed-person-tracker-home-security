// frontend/src/features/config/ConfigurationPage.jsx

import React, { useState } from "react";
import KnownPersonsPage from "../known-persons/KnownPersonsPage";
import SpeedConfigModal from "../dashboard/SpeedConfigModal";
import RetentionConfigPanel from "./RetentionConfigPanel";
import { fetchSpeedThresholds } from "../../api/configApi";
import "./ConfigurationPage.css";

function ConfigurationPage() {
  const [activeTab, setActiveTab] = useState("persons"); // "persons" | "speed" | "retention"
  const [speedThresholds, setSpeedThresholds] = useState({
    car: 30.0,
    motorcycle: 40.0,
    truck: 25.0,
  });
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);

  React.useEffect(() => {
    const loadSpeedThresholds = async () => {
      try {
        const { response, data } = await fetchSpeedThresholds();
        if (response.ok && data.status === "success" && data.thresholds) {
          setSpeedThresholds(data.thresholds);
        }
      } catch (err) {
        console.error("Failed to load speed thresholds:", err);
      }
    };
    loadSpeedThresholds();
  }, []);

  return (
    <div className="config-page-container">
      {/* Sub-Tab Navigation Bar */}
      <div className="config-tab-bar">
        <button
          type="button"
          className={`config-tab-btn ${activeTab === "persons" ? "active" : ""}`}
          onClick={() => setActiveTab("persons")}
        >
          👤 Known Person Configuration
        </button>

        <button
          type="button"
          className={`config-tab-btn ${activeTab === "speed" ? "active" : ""}`}
          onClick={() => setActiveTab("speed")}
        >
          ⚡ Speed Configuration
        </button>

        <button
          type="button"
          className={`config-tab-btn ${activeTab === "retention" ? "active" : ""}`}
          onClick={() => setActiveTab("retention")}
        >
          🧹 Data Retention & Storage
        </button>
      </div>

      {/* Sub-Tab Content Rendering */}
      {activeTab === "persons" ? (
        <div className="config-tab-content">
          <KnownPersonsPage />
        </div>
      ) : activeTab === "speed" ? (
        <div className="config-tab-content speed-config-panel">
          <div className="speed-overview-card">
            <h2>⚡ Category Speed Limit Thresholds</h2>
            <p className="speed-overview-desc">
              Configure maximum velocity speed limits (km/h) for target vehicle classification categories. Any vehicle exceeding its configured speed limit will trigger a <strong>SECURITY ALERT</strong>.
            </p>

            <div className="speed-values-grid">
              <div className="speed-value-card">
                <span className="speed-cat-icon">🚗</span>
                <span className="speed-cat-name">Car Speed Limit</span>
                <span className="speed-cat-limit">{speedThresholds.car ?? 30} km/h</span>
              </div>

              <div className="speed-value-card">
                <span className="speed-cat-icon">🏍️</span>
                <span className="speed-cat-name">Bike / Motorcycle Limit</span>
                <span className="speed-cat-limit">{speedThresholds.motorcycle ?? 40} km/h</span>
              </div>

              <div className="speed-value-card">
                <span className="speed-cat-icon">🚚</span>
                <span className="speed-cat-name">Truck Speed Limit</span>
                <span className="speed-cat-limit">{speedThresholds.truck ?? 25} km/h</span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button edit-speed-btn"
              onClick={() => setIsSpeedModalOpen(true)}
            >
              ⚙️ Edit Speed Limit Thresholds
            </button>
          </div>

          <SpeedConfigModal
            isOpen={isSpeedModalOpen}
            onClose={() => setIsSpeedModalOpen(false)}
            onThresholdsUpdated={(updated) => setSpeedThresholds(updated)}
          />
        </div>
      ) : (
        <div className="config-tab-content">
          <RetentionConfigPanel />
        </div>
      )}
    </div>
  );
}

export default ConfigurationPage;

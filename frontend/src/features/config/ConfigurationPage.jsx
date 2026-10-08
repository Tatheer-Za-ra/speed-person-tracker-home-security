// frontend/src/features/config/ConfigurationPage.jsx

import React, { useState } from "react";
import { Zap, Car, Bike, Truck, Settings, UserCheck, Gauge, HardDrive } from "lucide-react";
import KnownPersonsPage from "../known-persons/KnownPersonsPage";
import SpeedConfigModal from "../dashboard/SpeedConfigModal";
import RetentionConfigPanel from "./RetentionConfigPanel";
import CameraCalibrationPanel from "./CameraCalibrationPanel";
import { fetchSpeedThresholds } from "../../api/configApi";
import "./ConfigurationPage.css";

function ConfigurationPage({ initialTab, onTabChange }) {
  const [activeTab, setActiveTab] = useState(() => {
    return initialTab || localStorage.getItem("configTab") || "persons";
  });

  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="config-page-container">
      {/* Configuration Sub-Tab Switcher Bar */}
      <div className="config-tab-bar">
        <button
          type="button"
          className={`config-tab-btn ${activeTab === "persons" ? "active" : ""}`}
          onClick={() => handleSelectTab("persons")}
        >
          <UserCheck size={16} />
          <span>Known Persons</span>
        </button>

        <button
          type="button"
          className={`config-tab-btn ${activeTab === "speed" ? "active" : ""}`}
          onClick={() => handleSelectTab("speed")}
        >
          <Gauge size={16} />
          <span>Speed Configuration</span>
        </button>

        <button
          type="button"
          className={`config-tab-btn ${activeTab === "retention" ? "active" : ""}`}
          onClick={() => handleSelectTab("retention")}
        >
          <HardDrive size={16} />
          <span>Data Retention</span>
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
            <h2 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Zap size={22} style={{ color: "#d97706" }} />
              <span>Category Speed Limit Thresholds</span>
            </h2>
            <p className="speed-overview-desc">
              Configure maximum velocity speed limits (km/h) for target vehicle classification categories. Any vehicle exceeding its configured speed limit will trigger a <strong>SECURITY ALERT</strong>.
            </p>

            <div className="speed-values-grid">
              <div className="speed-value-card">
                <span className="speed-cat-icon car-bg">
                  <Car size={26} style={{ color: "#0284c7" }} />
                </span>
                <span className="speed-cat-name">Car Speed Limit</span>
                <span className="speed-cat-limit">{speedThresholds.car ?? 30} km/h</span>
              </div>

              <div className="speed-value-card">
                <span className="speed-cat-icon bike-bg">
                  <Bike size={26} style={{ color: "#d97706" }} />
                </span>
                <span className="speed-cat-name">Bike / Motorcycle Limit</span>
                <span className="speed-cat-limit">{speedThresholds.motorcycle ?? 40} km/h</span>
              </div>

              <div className="speed-value-card">
                <span className="speed-cat-icon truck-bg">
                  <Truck size={26} style={{ color: "#059669" }} />
                </span>
                <span className="speed-cat-name">Truck Speed Limit</span>
                <span className="speed-cat-limit">{speedThresholds.truck ?? 25} km/h</span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button edit-speed-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              onClick={() => setIsSpeedModalOpen(true)}
            >
              <Settings size={16} />
              <span>Edit Speed Limit Thresholds</span>
            </button>
          </div>

          <SpeedConfigModal
            isOpen={isSpeedModalOpen}
            onClose={() => setIsSpeedModalOpen(false)}
            onThresholdsUpdated={(updated) => setSpeedThresholds(updated)}
          />

          {/* Camera Position & 3D Perspective Geometry Calibration */}
          <CameraCalibrationPanel />
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

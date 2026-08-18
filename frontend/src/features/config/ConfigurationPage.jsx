// frontend/src/features/config/ConfigurationPage.jsx

import React, { useState } from "react";
import { Zap, Car, Bike, Truck, Settings } from "lucide-react";
import KnownPersonsPage from "../known-persons/KnownPersonsPage";
import SpeedConfigModal from "../dashboard/SpeedConfigModal";
import RetentionConfigPanel from "./RetentionConfigPanel";
import CameraCalibrationPanel from "./CameraCalibrationPanel";
import { fetchSpeedThresholds } from "../../api/configApi";
import "./ConfigurationPage.css";

function ConfigurationPage({ initialTab }) {
  const [activeTab, setActiveTab] = useState(() => {
    return initialTab || localStorage.getItem("configTab") || "persons";
  });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      localStorage.setItem("configTab", initialTab);
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

  return (
    <div className="config-page-container">
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
                <span className="speed-cat-icon">
                  <Car size={28} style={{ color: "#0284c7" }} />
                </span>
                <span className="speed-cat-name">Car Speed Limit</span>
                <span className="speed-cat-limit">{speedThresholds.car ?? 30} km/h</span>
              </div>

              <div className="speed-value-card">
                <span className="speed-cat-icon">
                  <Bike size={28} style={{ color: "#d97706" }} />
                </span>
                <span className="speed-cat-name">Bike / Motorcycle Limit</span>
                <span className="speed-cat-limit">{speedThresholds.motorcycle ?? 40} km/h</span>
              </div>

              <div className="speed-value-card">
                <span className="speed-cat-icon">
                  <Truck size={28} style={{ color: "#059669" }} />
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

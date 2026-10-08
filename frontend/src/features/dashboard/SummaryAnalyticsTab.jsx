// frontend/src/features/dashboard/SummaryAnalyticsTab.jsx

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Flame,
  Zap,
  Car,
  Bike,
  Truck,
  UserCheck,
  UserX,
  Moon,
  Calendar,
  Clock,
  BarChart3,
  ShieldAlert,
  RefreshCw,
  Gauge,
  Film,
  Globe,
  AlertTriangle,
  ChevronRight,
  Info
} from "lucide-react";
import { fetchEventAnalytics } from "../../api/eventsApi";
import { fetchSpeedThresholds } from "../../api/configApi";
import "./SummaryAnalyticsTab.css";

function formatHourLabel(h) {
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour} ${ampm}`;
}

export default function SummaryAnalyticsTab({ runVideoId, runFilename, onSelectHourFilter, speedThresholds: propSpeedThresholds }) {
  // Scope: "single" (this run) vs "global" (all CCTV logs)
  const [scope, setScope] = useState(runVideoId ? "single" : "global");
  const [preset, setPreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [localSpeedThresholds, setLocalSpeedThresholds] = useState(propSpeedThresholds || null);

  useEffect(() => {
    if (propSpeedThresholds) {
      setLocalSpeedThresholds(propSpeedThresholds);
      return;
    }
    fetchSpeedThresholds()
      .then(({ response, data }) => {
        if (response.ok && data?.status === "success" && data?.thresholds) {
          setLocalSpeedThresholds(data.thresholds);
        }
      })
      .catch((err) => console.error("Could not fetch speed thresholds in analytics:", err));
  }, [propSpeedThresholds]);

  // Active highlighted hour from chart hover or click
  const [hoveredHour, setHoveredHour] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (scope === "single" && runVideoId) {
        params.video_id = runVideoId;
      }
      if (preset && preset !== "all" && preset !== "custom") {
        params.preset = preset;
      } else if (preset === "custom") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const { response, data } = await fetchEventAnalytics(params);
      if (response.ok && data.status === "success" && data.analytics) {
        setAnalytics(data.analytics);
        if (data.analytics.video_meta?.speed_thresholds) {
          setLocalSpeedThresholds(data.analytics.video_meta.speed_thresholds);
        }
      } else {
        setError(data?.message || "Failed to load security analytics.");
      }
    } catch (err) {
      console.error(err);
      setError("Could not communicate with backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [scope, preset, startDate, endDate, runVideoId]);

  const summary = analytics?.summary || {};
  const hourlyList = analytics?.hourly_distribution || [];
  const weekdayList = analytics?.weekday_distribution || [];
  const vehicleStats = analytics?.vehicle_analytics || [];
  const severity = analytics?.violation_severity || { normal: 0, minor: 0, severe: 0 };
  const peakRush = summary?.peak_rush_hour;
  const topSpeed = summary?.top_speed_record;

  // Max value in hourly data for responsive chart scaling
  const maxHourlyTotal = useMemo(() => {
    if (!hourlyList.length) return 1;
    const maxVal = Math.max(...hourlyList.map((item) => item.total));
    return maxVal > 0 ? maxVal : 1;
  }, [hourlyList]);

  // Max value in weekday distribution
  const maxWeekdayTotal = useMemo(() => {
    if (!weekdayList.length) return 1;
    const maxVal = Math.max(...weekdayList.map((item) => item.total));
    return maxVal > 0 ? maxVal : 1;
  }, [weekdayList]);

  return (
    <div className="analytics-tab-container">
      {/* Scope & Filter Control Bar */}
      <div className="analytics-filter-bar">
        {/* Scope Selector: Show toggle only if a specific video run is provided */}
        {runVideoId ? (
          <div className="scope-toggle-group">
            <button
              type="button"
              className={`scope-toggle-btn ${scope === "single" ? "active" : ""}`}
              onClick={() => setScope("single")}
            >
              <Film size={15} />
              <span>Current Video Run ({runFilename ? runFilename : `#${runVideoId}`})</span>
            </button>

            <button
              type="button"
              className={`scope-toggle-btn ${scope === "global" ? "active" : ""}`}
              onClick={() => setScope("global")}
            >
              <Globe size={15} />
              <span>All Video Logs History</span>
            </button>
          </div>
        ) : (
          <div className="global-scope-pill">
            <Globe size={16} style={{ color: "#0284c7" }} />
            <span>All CCTV Scope (All Video Runs)</span>
          </div>
        )}

        {/* Date Presets: Active when viewing All CCTV Logs */}
        {scope !== "single" && (
          <div className="analytics-presets-row">
            <div className="preset-buttons">
              <button
                type="button"
                className={`preset-btn ${preset === "all" ? "active" : ""}`}
                onClick={() => setPreset("all")}
              >
                All Time
              </button>
              <button
                type="button"
                className={`preset-btn ${preset === "this_month" ? "active" : ""}`}
                onClick={() => setPreset("this_month")}
              >
                This Month
              </button>
              <button
                type="button"
                className={`preset-btn ${preset === "30d" ? "active" : ""}`}
                onClick={() => setPreset("30d")}
              >
                Past 30 Days
              </button>
              <button
                type="button"
                className={`preset-btn ${preset === "7d" ? "active" : ""}`}
                onClick={() => setPreset("7d")}
              >
                Past 7 Days
              </button>
              <button
                type="button"
                className={`preset-btn ${preset === "custom" ? "active" : ""}`}
                onClick={() => setPreset("custom")}
              >
                <Calendar size={13} style={{ marginRight: 4 }} />
                Custom Range
              </button>
            </div>

            {preset === "custom" && (
              <div className="custom-date-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                  title="Start Date"
                />
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                  title="End Date"
                />
              </div>
            )}

            <button
              type="button"
              className="refresh-analytics-btn"
              onClick={loadAnalytics}
              title="Refresh statistics"
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="analytics-loading-state">
          <RefreshCw size={24} className="spin" style={{ color: "#0284c7" }} />
          <span>Loading security analytics...</span>
        </div>
      )}

      {error && !loading && (
        <div className="analytics-error-state">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Executive KPI Scorecards */}
          <div className="kpi-grid">
            {/* Total Traffic Volume */}
            <div className="kpi-card flow-card">
              <div className="kpi-header">
                <span className="kpi-title">TOTAL ACTIVITY RECORDED</span>
                <span className="kpi-icon-pill blue">
                  <BarChart3 size={15} />
                </span>
              </div>
              <div className="kpi-main-stat">{summary.total_events || 0}</div>
              <div className="kpi-subtext">
                <strong>{summary.total_vehicles || 0}</strong> vehicles • <strong>{summary.total_persons || 0}</strong> pedestrians
              </div>
            </div>

            {/* Peak Rush Hour */}
            <div className="kpi-card rush-card">
              <div className="kpi-header">
                <span className="kpi-title">PEAK RUSH HOUR</span>
                <span className="kpi-icon-pill amber">
                  <Flame size={15} />
                </span>
              </div>
              <div className="kpi-main-stat rush-stat">
                {peakRush ? peakRush.label : "No Rush Peak"}
              </div>
              <div className="kpi-subtext">
                {peakRush ? (
                  <span>
                    <strong>{peakRush.count}</strong> events recorded (<strong>{peakRush.vehicles}</strong> vehicles, <strong>{peakRush.persons}</strong> people)
                  </span>
                ) : (
                  <span>No traffic volume recorded yet</span>
                )}
              </div>
            </div>

            {/* Speed Violation Rate */}
            <div className="kpi-card violation-card">
              <div className="kpi-header">
                <span className="kpi-title">SPEED VIOLATION RATE</span>
                <span className="kpi-icon-pill red">
                  <Gauge size={15} />
                </span>
              </div>
              <div className="kpi-main-stat red-stat">
                {summary.overspeed_rate || 0}%
              </div>
              <div className="kpi-subtext">
                <strong>{summary.total_overspeed || 0}</strong> overspeed violations of {summary.total_vehicles || 0} vehicles
              </div>
            </div>

            {/* Top Speeding Record */}
            <div className="kpi-card top-speed-card">
              <div className="kpi-header">
                <span className="kpi-title">TOP RECORDED SPEED</span>
                <span className="kpi-icon-pill purple">
                  <Zap size={15} />
                </span>
              </div>
              <div className="kpi-main-stat purple-stat">
                {topSpeed ? `${topSpeed.speed} km/h` : "—"}
              </div>
              <div className="kpi-subtext">
                {topSpeed ? (
                  <span>
                    <strong>{topSpeed.vehicle_label}</strong> (+{topSpeed.overshoot} over {topSpeed.limit} limit)
                  </span>
                ) : (
                  <span>Within speed limits</span>
                )}
              </div>
            </div>
          </div>

          {/* 24-Hour Peak Rush & Hourly Traffic Distribution Chart */}
          <div className="analytics-card">
            <div className="card-top-header">
              <div>
                <h3 className="card-heading" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={18} style={{ color: "#0284c7" }} />
                  <span>Hourly Activity &amp; Peak Rush Hours (24h Flow)</span>
                </h3>
                <p className="card-subheading">
                  Hourly activity throughout the day. Hover over any bar to view vehicle, pedestrian, and speeding details.
                </p>

                {/* Brief User Disclaimer regarding clock time vs upload time */}
                <div className="hourly-disclaimer-pill">
                  <Info size={14} style={{ flexShrink: 0, color: "#0284c7" }} />
                  <span>
                    {scope === "single" && !analytics?.video_meta?.recording_start_time
                      ? "Note: This video was uploaded without a custom recording time, so its activity is plotted using its upload timestamp so no events are missed."
                      : "Note: Videos uploaded without a custom recording time are displayed using their upload timestamps so their stats are never lost."}
                  </span>
                </div>
              </div>

              {peakRush && (
                <div className="peak-badge">
                  <Flame size={14} />
                  <span>Busiest: <strong>{peakRush.label}</strong> ({peakRush.count} events)</span>
                </div>
              )}
            </div>

            {/* Interactive 24-Hour Chart */}
            <div className="hourly-chart-wrapper">
              <div className="hourly-bars-container">
                {hourlyList.map((item) => {
                  const isPeak = peakRush && peakRush.hour === item.hour && item.total > 0;
                  const totalHeightPct = Math.min(100, Math.round((item.total / maxHourlyTotal) * 100));
                  const vehicleHeightPct = item.total > 0 ? Math.round((item.vehicles / item.total) * 100) : 0;
                  const personHeightPct = 100 - vehicleHeightPct;
                  const isHovered = hoveredHour === item.hour;

                  return (
                    <div
                      key={item.hour}
                      className={`hour-bar-column ${isPeak ? "peak-column" : ""} ${isHovered ? "hovered" : ""}`}
                      onMouseEnter={() => setHoveredHour(item.hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      {/* Floating Tooltip */}
                      {isHovered && (
                        <div className="bar-hover-tooltip">
                          <div className="tooltip-time">{formatHourLabel(item.hour)} - {formatHourLabel((item.hour + 1) % 24)}</div>
                          <div className="tooltip-row">
                            <span>Total Events:</span>
                            <strong>{item.total}</strong>
                          </div>
                          <div className="tooltip-row blue">
                            <span>Vehicles:</span>
                            <strong>{item.vehicles}</strong>
                          </div>
                          <div className="tooltip-row amber">
                            <span>Persons:</span>
                            <strong>{item.persons}</strong>
                          </div>
                          {item.overspeed > 0 && (
                            <div className="tooltip-row red">
                              <span>Overspeeding:</span>
                              <strong>{item.overspeed}</strong>
                            </div>
                          )}
                          {item.alerts > 0 && (
                            <div className="tooltip-row alert">
                              <span>Security Alerts:</span>
                              <strong>{item.alerts}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bar Fill */}
                      <div className="bar-track">
                        <div
                          className="bar-fill-stacked"
                          style={{ height: `${item.total > 0 ? Math.max(8, totalHeightPct) : 2}%` }}
                        >
                          {item.total > 0 && (
                            <>
                              <div
                                className="segment vehicles-segment"
                                style={{ height: `${vehicleHeightPct}%` }}
                                title={`Vehicles: ${item.vehicles}`}
                              />
                              <div
                                className="segment persons-segment"
                                style={{ height: `${personHeightPct}%` }}
                                title={`Persons: ${item.persons}`}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Hour Axis Label */}
                      <div className="hour-axis-label">
                        {item.hour % 2 === 0 ? formatHourLabel(item.hour) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="chart-legend-row">
                <div className="legend-item">
                  <span className="legend-swatch vehicles-swatch" />
                  <span>Vehicles</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch persons-swatch" />
                  <span>Pedestrians</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch peak-swatch" />
                  <span>Peak Rush Hour</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Columns: Speed Violations Matrix & Identity Threat Intelligence */}
          <div className="analytics-dual-grid">
            {/* Speed Violations by Vehicle Category */}
            <div className="analytics-card">
              <div className="card-top-header">
                <div>
                  <h3 className="card-heading" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Zap size={18} style={{ color: "#d97706" }} />
                    <span>Vehicle Speed & Safety Summary</span>
                  </h3>
                  <p className="card-subheading">
                    Speed tracking and speed limit compliance by vehicle type.
                  </p>
                </div>
              </div>

              {/* Per-category Cards */}
              <div className="vehicle-breakdown-list">
                {vehicleStats.map((item) => {
                  const Icon = item.category === "motorcycle" ? Bike : item.category === "truck" ? Truck : Car;
                  const overspeedPct = item.total > 0 ? Math.round((item.overspeed / item.total) * 100) : 0;
                  const isViolationHigh = overspeedPct > 40;
                  const activeCatLimit = (localSpeedThresholds && localSpeedThresholds[item.category])
                    ? localSpeedThresholds[item.category]
                    : (item.limit ?? (item.category === "motorcycle" ? 45 : 30));

                  return (
                    <div key={item.category} className="vehicle-cat-card">
                      <div className="cat-card-header">
                        <div className="cat-title-left">
                          <span className="cat-icon-box">
                            <Icon size={18} />
                          </span>
                          <div>
                            <span className="cat-name">{item.category.toUpperCase()}</span>
                            <span className="cat-limit">Limit: <strong>{activeCatLimit} km/h</strong></span>
                          </div>
                        </div>

                        <div className="cat-stats-right">
                          <span className={`cat-rate-badge ${isViolationHigh ? "high" : "normal"}`}>
                            {overspeedPct}% Violation Rate
                          </span>
                        </div>
                      </div>

                      <div className="cat-metrics-row">
                        <div className="cat-metric">
                          <span className="cm-label">Tracked</span>
                          <span className="cm-val">{item.total}</span>
                        </div>
                        <div className="cat-metric">
                          <span className="cm-label">Speeding</span>
                          <span className="cm-val red">{item.overspeed}</span>
                        </div>
                        <div className="cat-metric">
                          <span className="cm-label">Average Speed</span>
                          <span className="cm-val">{item.avg_speed} km/h</span>
                        </div>
                        <div className="cat-metric">
                          <span className="cm-label">Top Speed</span>
                          <span className={`cm-val ${item.max_speed > item.limit ? "red" : ""}`}>
                            {item.max_speed} km/h
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="cat-progress-track">
                        <div
                          className="cat-progress-fill"
                          style={{
                            width: `${overspeedPct}%`,
                            background: isViolationHigh ? "linear-gradient(90deg, #f97316, #dc2626)" : "linear-gradient(90deg, #0284c7, #059669)"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Violation Severity Breakdown & User Guide */}
              <div className="severity-summary-container">
                <div className="severity-header-row">
                  <div className="severity-title-row">
                    <AlertTriangle size={16} style={{ color: "#d97706" }} />
                    <span className="sev-label">Speed Infraction Severity</span>
                  </div>
                </div>
                
                <p className="severity-explainer">
                  <strong>What this shows:</strong> Groups tracked vehicles into 3 safety levels based on how far they exceeded their speed limit:
                </p>

                <div className="severity-cards-row">
                  {/* Card 1: Safe & Legal */}
                  <div className="severity-card normal">
                    <div className="sev-card-hd">
                      <span className="sev-pill green">Safe & Legal</span>
                    </div>
                    <div className="sev-card-stat green">
                      {severity.normal || 0}
                    </div>
                    <div className="sev-card-desc">
                      Drove at or below speed limit
                    </div>
                  </div>

                  {/* Card 2: Minor Infraction */}
                  <div className="severity-card minor">
                    <div className="sev-card-hd">
                      <span className="sev-pill amber">Minor Infraction</span>
                    </div>
                    <div className="sev-card-stat amber">
                      {severity.minor || 0}
                    </div>
                    <div className="sev-card-desc">
                      1 – 10 km/h over limit (mild risk)
                    </div>
                  </div>

                  {/* Card 3: Severe Violation */}
                  <div className="severity-card severe">
                    <div className="sev-card-hd">
                      <span className="sev-pill red">Severe Violation</span>
                    </div>
                    <div className="sev-card-stat red">
                      {severity.severe || 0}
                    </div>
                    <div className="sev-card-desc">
                      &gt;10 km/h over limit (high risk / alert)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Identity & Security Alerts */}
            <div className="analytics-card">
              <div className="card-top-header">
                <div>
                  <h3 className="card-heading" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldAlert size={18} style={{ color: "#dc2626" }} />
                    <span>Visitor Identity & Security Alerts</span>
                  </h3>
                  <p className="card-subheading">
                    Recognized residents, unknown visitors, and late-night security alerts.
                  </p>
                </div>
              </div>

              {/* Known vs Unknown Ratio */}
              <div className="identity-ratio-box">
                <div className="identity-kpi-row">
                  <div className="id-col known">
                    <div className="id-col-header">
                      <UserCheck size={16} />
                      <span>Known Residents</span>
                    </div>
                    <div className="id-col-num">{summary.known_persons_count || 0}</div>
                    <div className="id-col-sub">Verified face matches</div>
                  </div>

                  <div className="id-col-divider" />

                  <div className="id-col unknown">
                    <div className="id-col-header">
                      <UserX size={16} />
                      <span>Unknown Persons</span>
                    </div>
                    <div className="id-col-num red">{summary.unknown_persons_count || 0}</div>
                    <div className="id-col-sub">{summary.unknown_rate || 0}% of all visitors</div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="ratio-bar-track">
                  <div
                    className="ratio-known-fill"
                    style={{
                      width: `${summary.total_persons > 0 ? (summary.known_persons_count / summary.total_persons) * 100 : 0}%`
                    }}
                    title={`Known: ${summary.known_persons_count}`}
                  />
                  <div
                    className="ratio-unknown-fill"
                    style={{
                      width: `${summary.total_persons > 0 ? (summary.unknown_persons_count / summary.total_persons) * 100 : 100}%`
                    }}
                    title={`Unknown: ${summary.unknown_persons_count}`}
                  />
                </div>
              </div>

              {/* Night-time Threat Card */}
              <div className="night-threat-card">
                <div className="night-icon-box">
                  <Moon size={22} style={{ color: "#7c3aed" }} />
                </div>
                <div>
                  <div className="night-title">
                    Late-Night Activity (10:00 PM – 6:00 AM)
                  </div>
                  <div className="night-body">
                    <strong>{summary.night_threats_count || 0}</strong> unknown persons were spotted during late-night hours.
                  </div>
                </div>
              </div>

              {/* Day of the Week Distribution */}
              <div className="weekday-distribution-box">
                <div className="weekday-header">
                  <span>Weekly Activity (Monday – Sunday)</span>
                </div>
                <div className="weekday-bars-row">
                  {weekdayList.map((d) => {
                    const heightPct = Math.round((d.total / maxWeekdayTotal) * 100);
                    return (
                      <div key={d.day} className="weekday-col" title={`${d.day}: ${d.total} detections (${d.overspeed} speeding)`}>
                        <div className="weekday-bar-track">
                          <div
                            className="weekday-bar-fill"
                            style={{ height: `${d.total > 0 ? Math.max(10, heightPct) : 4}%` }}
                          />
                        </div>
                        <span className="weekday-name">{d.day.substring(0, 3)}</span>
                        <span className="weekday-count">{d.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

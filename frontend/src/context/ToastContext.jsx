// frontend/src/context/ToastContext.jsx

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Trash2,
  HelpCircle,
} from "lucide-react";
import "./Toast.css";

const ToastContext = createContext(null);

function ToastItem({ toastItem, onRemove }) {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(toastItem.duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (toastItem.duration <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onRemove(toastItem.id);
      }, remainingTimeRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, onRemove, toastItem.duration, toastItem.id]);

  const handleMouseEnter = () => {
    if (toastItem.duration <= 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(200, remainingTimeRef.current - elapsed);
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (toastItem.duration <= 0) return;
    setIsPaused(false);
  };

  const badgeLabels = {
    success: "SUCCESS",
    error: "SECURITY ALERT",
    warning: "WARNING",
    info: "SYSTEM INFO",
  };

  return (
    <div
      className={`toast-glass-card toast-${toastItem.type} ${isPaused ? "toast-paused" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
    >
      <div className="toast-icon-badge">
        {toastItem.type === "success" && <CheckCircle2 size={18} className="toast-icon" />}
        {toastItem.type === "error" && <AlertOctagon size={18} className="toast-icon" />}
        {toastItem.type === "warning" && <AlertTriangle size={18} className="toast-icon" />}
        {toastItem.type === "info" && <Info size={18} className="toast-icon" />}
      </div>

      <div className="toast-body">
        {toastItem.title && <div className="toast-title">{toastItem.title}</div>}
        <div className="toast-message">{toastItem.message}</div>

        {toastItem.action && (
          <div className="toast-action-container">
            <button
              type="button"
              className="toast-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof toastItem.action.onClick === "function") {
                  toastItem.action.onClick();
                }
                onRemove(toastItem.id);
              }}
            >
              {toastItem.action.label || "Action"}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="toast-close-btn"
        onClick={() => onRemove(toastItem.id)}
        aria-label="Close notification"
      >
        <X size={15} />
      </button>

      {toastItem.duration > 0 && (
        <div className="toast-progress-track">
          <div
            className="toast-progress-fill"
            style={{
              animationDuration: `${toastItem.duration}ms`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", options = {}) => {
    const id = ++toastIdRef.current;
    const duration = options.duration ?? 4000;
    const title = options.title || "";
    const action = options.action || null;

    const newToast = { id, message, type, title, duration, action };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const toast = {
    success: (msg, opts) => addToast(msg, "success", typeof opts === "string" ? { title: opts } : opts),
    error: (msg, opts) => addToast(msg, "error", typeof opts === "string" ? { title: opts } : opts),
    warning: (msg, opts) => addToast(msg, "warning", typeof opts === "string" ? { title: opts } : opts),
    info: (msg, opts) => addToast(msg, "info", typeof opts === "string" ? { title: opts } : opts),
  };

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure you want to proceed?",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        confirmVariant: options.confirmVariant || "danger",
        resolve: (val) => {
          setConfirmState(null);
          resolve(val);
        },
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState?.resolve) confirmState.resolve(true);
  };

  const handleCancel = () => {
    if (confirmState?.resolve) confirmState.resolve(false);
  };

  // Close confirm modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && confirmState) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmState]);

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Glassmorphism Toast Notification Portal */}
      <div className="toast-portal-container" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toastItem={t} onRemove={removeToast} />
        ))}
      </div>

      {/* Sleek Custom Glass Confirm Modal replacing window.confirm */}
      {confirmState && (
        <div className="confirm-modal-overlay" onClick={handleCancel}>
          <div
            className="confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`confirm-icon-box ${confirmState.confirmVariant}`}>
              {confirmState.confirmVariant === "danger" ? (
                <Trash2 size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
            </div>
            <div className="confirm-text-area">
              <h3 className="confirm-title">{confirmState.title}</h3>
              <p className="confirm-message">{confirmState.message}</p>
            </div>
            <div className="confirm-actions-row">
              <button
                type="button"
                className="confirm-btn-cancel"
                onClick={handleCancel}
                autoFocus
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                className={`confirm-btn-action ${confirmState.confirmVariant}`}
                onClick={handleConfirm}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: {
        success: (msg) => console.log("[Toast success]", msg),
        error: (msg) => console.error("[Toast error]", msg),
        warning: (msg) => console.warn("[Toast warning]", msg),
        info: (msg) => console.info("[Toast info]", msg),
      },
      confirm: async () => false,
    };
  }
  return ctx;
}

// frontend/src/context/ToastContext.jsx

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2, HelpCircle } from "lucide-react";
import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", options = {}) => {
    const id = ++toastIdRef.current;
    const duration = options.duration ?? 3800;
    const title = options.title || "";

    const newToast = { id, message, type, title, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

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
        confirmVariant: options.confirmVariant || "danger", // 'danger' | 'primary'
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

      {/* Floating Toast Notification Container */}
      <div className="toast-portal-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-card toast-${t.type}`}>
            <div className="toast-icon-wrapper">
              {t.type === "success" && <CheckCircle2 size={20} className="toast-icon" />}
              {t.type === "error" && <AlertCircle size={20} className="toast-icon" />}
              {t.type === "warning" && <AlertTriangle size={20} className="toast-icon" />}
              {t.type === "info" && <Info size={20} className="toast-icon" />}
            </div>
            <div className="toast-content">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
            {t.duration > 0 && (
              <div
                className="toast-progress-bar"
                style={{ animationDuration: `${t.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Sleek Custom Confirm Modal replacing window.confirm */}
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
                <Trash2 size={26} />
              ) : (
                <AlertTriangle size={26} />
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

import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, Clock, ExternalLink } from "lucide-react";
import { type AppNotification } from "@/context/AppContext";

interface NotificationDetailModalProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onTakeAction?: (actionUrl: string) => void;
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onTakeAction,
}: NotificationDetailModalProps) {
  if (!isOpen || !notification) return null;
  if (typeof document === "undefined") return null;

  const isAlert = notification.type === "alert";

  const formattedDate = new Date(notification.created_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      data-purpose="notification-detail-backdrop"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0c101a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        data-purpose="notification-detail-modal"
      >
        {/* Modal Header */}
        <div
          className={`p-6 border-b border-artisan-border dark:border-slate-800 flex items-start justify-between gap-4 ${
            isAlert
              ? "bg-caramel-50/50 dark:bg-amber-950/20"
              : "bg-culinary-50/30 dark:bg-emerald-950/10"
          }`}
        >
          <div className="space-y-2">
            {/* Category Pill */}
            {isAlert ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                <span>Immediate Action Required</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-culinary-50 dark:bg-emerald-950/80 text-culinary-700 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/60 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-culinary-600 dark:text-emerald-400" />
                <span>Action Notification</span>
              </div>
            )}

            <h2 className="text-lg font-bold text-espresso-900 dark:text-white leading-snug">
              {notification.title}
            </h2>

            <div className="flex items-center gap-1.5 text-xs text-espresso-400 dark:text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-espresso-400 hover:text-espresso-700 dark:text-slate-400 dark:hover:text-white hover:bg-artisan-subtle dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close and dismiss"
            aria-label="Close and dismiss"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 dark:text-slate-500">
              Summary
            </span>
            <p className="text-sm font-semibold text-espresso-850 dark:text-slate-200 leading-relaxed">
              {notification.message}
            </p>
          </div>

          {notification.details && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 dark:text-slate-500">
                Operational Context &amp; Details
              </span>
              <div className="p-3.5 rounded-xl bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 text-xs text-espresso-700 dark:text-slate-300 leading-relaxed space-y-1 shadow-2xs">
                <p>{notification.details}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-artisan-border dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-artisan-canvas/40 dark:bg-[#0c101a]">
          <span className="text-[11px] text-espresso-400 dark:text-slate-500 italic">
            Closing automatically removes this alert from unread lists.
          </span>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-espresso-700 dark:text-slate-300 bg-artisan-surface dark:bg-[#141b2c] hover:bg-artisan-subtle dark:hover:bg-slate-800 border border-artisan-border dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
              type="button"
            >
              Acknowledge &amp; Close
            </button>

            {notification.actionUrl && (
              <button
                onClick={() => {
                  if (onTakeAction && notification.actionUrl) {
                    onTakeAction(notification.actionUrl);
                  }
                  onClose();
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-artisan-glow transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                  isAlert
                    ? "bg-caramel-600 hover:bg-caramel-700"
                    : "bg-culinary-600 hover:bg-culinary-700"
                }`}
                type="button"
              >
                <span>{notification.actionLabel || "Take Action"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

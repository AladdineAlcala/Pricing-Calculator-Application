import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  CheckCheck,
  X,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useApp, type AppNotification } from "@/context/AppContext";
import { NotificationDetailModal } from "@/components/NotificationDetailModal";

interface NotificationCenterProps {
  unpricedCount?: number;
}

export function NotificationCenter({ unpricedCount = 0 }: NotificationCenterProps) {
  const {
    state,
    dismissNotification,
    clearAllNotifications,
    addNotification,
    unreadCount,
    unreadAlertsCount,
    unreadNotificationsCount,
  } = useApp();

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "alerts" | "notifications">("all");
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-sync unpriced items alert with live database count
  const prevUnpricedRef = useRef<number>(0);
  useEffect(() => {
    if (unpricedCount > 0 && prevUnpricedRef.current === 0) {
      const exists = state.notifications.some((n) => n.id === "alert-unpriced-pantry-items");
      if (!exists) {
        addNotification({
          id: "alert-unpriced-pantry-items",
          type: "alert",
          severity: "warning",
          title: "Immediate Action: Unpriced Pantry Ingredients Detected",
          message: `${unpricedCount} pantry item(s) are missing unit purchase costs.`,
          details:
            "Without purchase costs, recipes using these ingredients cannot compute accurate batch costs, target markups, or gross margins. Review and set purchase prices in the ingredients master list to prevent margin leakage.",
          actionLabel: "Price Ingredients in Pantry",
          actionUrl: "/ingredients",
        });
      }
    }
    prevUnpricedRef.current = unpricedCount;
  }, [unpricedCount, state.notifications, addNotification]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Hierarchical separation & sorting:
  // 1. Alerts (Immediate Action Required)
  // 2. Notifications (Activity Updates)
  // Sorted chronologically descending (newest first)
  const { sortedAlerts, sortedNotifications } = useMemo(() => {
    const alerts = state.notifications
      .filter((n) => n.type === "alert")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const notifs = state.notifications
      .filter((n) => n.type === "notification")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { sortedAlerts: alerts, sortedNotifications: notifs };
  }, [state.notifications]);

  const displayedAlerts = activeFilter === "notifications" ? [] : sortedAlerts;
  const displayedNotifications = activeFilter === "alerts" ? [] : sortedNotifications;
  const totalDisplayed = displayedAlerts.length + displayedNotifications.length;

  const handleSelectNotification = (item: AppNotification) => {
    setSelectedNotification(item);
    setIsOpen(false);
  };

  const handleCloseDetailModal = () => {
    if (selectedNotification) {
      // Auto-remove when closed per explicit user mandate
      dismissNotification(selectedNotification.id);
      setSelectedNotification(null);
    }
  };

  const handleTakeAction = (actionUrl: string) => {
    navigate(actionUrl);
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 relative flex items-center justify-center text-espresso-600 dark:text-slate-300 hover:text-espresso-900 dark:hover:text-white bg-white dark:bg-[#141b2c] hover:bg-flour-100 dark:hover:bg-slate-800 border border-stoneBorder dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
        title={
          unreadCount > 0
            ? `${unreadCount} active notification(s) • ${unreadAlertsCount} action alert(s)`
            : "All notices acknowledged"
        }
        aria-label="Alerts and Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
        id="theme-toggle-btn-bell"
        data-purpose="notification-bell-trigger"
      >
        <Bell className="w-4 h-4" />

        {/* Dynamic Badge */}
        {unreadAlertsCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center bg-caramel-500 text-white text-[10px] font-bold font-mono rounded-full ring-2 ring-white dark:ring-[#0c101a] animate-pulse"
            data-purpose="unread-alert-badge"
          >
            {unreadCount}
          </span>
        ) : unreadNotificationsCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center bg-culinary-600 text-white text-[10px] font-bold font-mono rounded-full ring-2 ring-white dark:ring-[#0c101a]"
            data-purpose="unread-notification-badge"
          >
            {unreadNotificationsCount}
          </span>
        ) : null}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] z-50 rounded-2xl border border-stoneBorder dark:border-slate-800 bg-white/98 dark:bg-[#0c101a]/98 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          data-purpose="notification-popover"
        >
          {/* Header */}
          <div className="p-4 border-b border-stoneBorder dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-espresso-900 dark:text-white">
                Notifications &amp; Alerts
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-culinary-50 dark:bg-emerald-950/70 text-culinary-700 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/60">
                  {unreadCount} active
                </span>
              )}
            </div>

            {state.notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[11px] font-medium text-espresso-500 hover:text-espresso-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                type="button"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2.5 pb-2 border-b border-stoneBorder dark:border-slate-800 flex items-center gap-1.5 text-xs bg-flour-100/50 dark:bg-[#141b2c]/40">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-espresso-800 text-white dark:bg-slate-700 shadow-2xs"
                  : "text-espresso-600 dark:text-slate-400 hover:bg-flour-100 dark:hover:bg-slate-800"
              }`}
              type="button"
            >
              All ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter("alerts")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === "alerts"
                  ? "bg-caramel-600 text-white dark:bg-amber-700 shadow-2xs"
                  : "text-caramel-700 dark:text-amber-400 hover:bg-caramel-50 dark:hover:bg-amber-950/50"
              }`}
              type="button"
            >
              <span>🚨 Action Required</span>
              <span>({unreadAlertsCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter("notifications")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === "notifications"
                  ? "bg-culinary-600 text-white dark:bg-emerald-700 shadow-2xs"
                  : "text-espresso-600 dark:text-slate-400 hover:bg-flour-100 dark:hover:bg-slate-800"
              }`}
              type="button"
            >
              <span>📋 Updates</span>
              <span>({unreadNotificationsCount})</span>
            </button>
          </div>

          {/* Hierarchical Scrollable List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-stoneBorder dark:divide-slate-800">
            {totalDisplayed === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-espresso-400 dark:text-slate-500">
                <CheckCheck className="w-8 h-8 text-culinary-500 dark:text-emerald-400 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-espresso-800 dark:text-slate-200">
                  All caught up!
                </p>
                <p className="text-[11px] text-espresso-400 dark:text-slate-500 mt-0.5">
                  No unread alerts or notifications.
                </p>
              </div>
            ) : (
              <>
                {/* ── SECTION 1: 🚨 Immediate Action Required Alerts ── */}
                {displayedAlerts.length > 0 && (
                  <div className="p-2 space-y-1 bg-caramel-50/20 dark:bg-amber-950/10">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-caramel-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-caramel-600 dark:text-amber-400" />
                      <span>Immediate Action Required ({displayedAlerts.length})</span>
                    </div>

                    {displayedAlerts.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectNotification(item)}
                        className="p-3 rounded-xl border border-caramel-200 dark:border-amber-900/50 bg-white dark:bg-[#141b2c] hover:border-caramel-400 dark:hover:border-amber-700/80 transition-all cursor-pointer group shadow-2xs space-y-1.5"
                        data-purpose="notification-card-alert"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                              Immediate Action
                            </span>
                            <span className="text-[10px] text-espresso-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRelativeTime(item.created_at)}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-caramel-500 group-hover:translate-x-0.5 transition-transform" />
                        </div>

                        <p className="text-xs font-bold text-espresso-900 dark:text-white leading-tight">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-espresso-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── SECTION 2: 📋 Action & System Activity Notifications ── */}
                {displayedNotifications.length > 0 && (
                  <div className="p-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-espresso-500 dark:text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-culinary-600 dark:text-emerald-400" />
                      <span>Activity &amp; Updates ({displayedNotifications.length})</span>
                    </div>

                    {displayedNotifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectNotification(item)}
                        className="p-3 rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100/50 dark:bg-[#141b2c]/60 hover:bg-flour-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group shadow-2xs space-y-1.5"
                        data-purpose="notification-card-item"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-culinary-50 dark:bg-emerald-950 text-culinary-700 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/40">
                              Notification
                            </span>
                            <span className="text-[10px] text-espresso-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRelativeTime(item.created_at)}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-espresso-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>

                        <p className="text-xs font-bold text-espresso-900 dark:text-white leading-tight">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-espresso-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Notification Detail Modal with Auto-Dismiss on Close */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={Boolean(selectedNotification)}
        onClose={handleCloseDetailModal}
        onTakeAction={handleTakeAction}
      />
    </div>
  );
}

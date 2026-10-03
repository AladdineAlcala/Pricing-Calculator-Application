// App-wide state management via React Context + useReducer
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getSettings,
  setSetting,
  type AppSetting,
  getActiveNotifications,
  createDbNotification,
  dismissDbNotification,
  clearAllDbNotifications,
  type DbNotification,
} from "@/lib/api";

export type NotificationType = "alert" | "notification";
export type NotificationSeverity = "critical" | "warning" | "info" | "success";

export interface AppNotification {
  id: string;
  type: NotificationType; // 'alert' = needs immediate action; 'notification' = action update
  severity: NotificationSeverity;
  title: string;
  message: string;
  details?: string;
  actionLabel?: string;
  actionUrl?: string; // route shortcut e.g. '/ingredients'
  created_at: string; // ISO date string
  read: boolean;
  metadata?: Record<string, any>;
}

interface AppSettings {
  theme: "light" | "dark";
  auto_backup_enabled: boolean;
  backup_path: string;
  currency_symbol: string;
  last_backup: string;
}

interface AppState {
  settings: AppSettings;
  settingsLoaded: boolean;
  notifications: AppNotification[];
}

type AppAction =
  | { type: "SETTINGS_LOADED"; payload: AppSettings }
  | { type: "SET_THEME"; payload: "light" | "dark" }
  | { type: "SET_SETTING"; key: keyof AppSettings; value: string }
  | { type: "ADD_NOTIFICATION"; payload: AppNotification }
  | { type: "DISMISS_NOTIFICATION"; payload: string }
  | { type: "CLEAR_ALL_NOTIFICATIONS" }
  | { type: "SET_NOTIFICATIONS"; payload: AppNotification[] };

const defaultSettings: AppSettings = {
  theme: "light",
  auto_backup_enabled: true,
  backup_path: "",
  currency_symbol: "₱",
  last_backup: "",
};

function getDefaultNotifications(): AppNotification[] {
  return [
    {
      id: "alert-unpriced-pantry-items",
      type: "alert",
      severity: "warning",
      title: "Immediate Action: Unpriced Pantry Ingredients Detected",
      message: "Pantry ingredients lack purchase pricing, causing inaccurate batch costing.",
      details:
        "Without purchase costs, recipes using these ingredients cannot compute accurate batch costs, target markups, or gross margins. Review and set purchase prices in the ingredients master list to prevent margin leakage.",
      actionLabel: "Price Ingredients in Pantry",
      actionUrl: "/ingredients",
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      read: false,
    },
    {
      id: "notif-new-ingredient-created",
      type: "notification",
      severity: "success",
      title: "New Ingredient Added",
      message: "A new ingredient 'Organic Madagascar Vanilla' has been created.",
      details:
        "Registered in pantry master catalog with unit of measure (ml), storage location, and initial packaging specifications.",
      actionLabel: "View in Pantry",
      actionUrl: "/ingredients",
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
    },
    {
      id: "notif-recipe-formula-updated",
      type: "notification",
      severity: "info",
      title: "Recipe Formula Synchronized",
      message: "Formula for 'Artisan Croissant' has updated ingredient proportions.",
      details:
        "Yield of 24 units with target retail markup of 60.0% has been recalculated using live FIFO ingredient purchase rates.",
      actionLabel: "View Recipes",
      actionUrl: "/recipes",
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      read: false,
    },
  ];
}

function mapDbToAppNotification(db: DbNotification): AppNotification {
  return {
    id: db.id,
    type: db.notification_type,
    severity: db.severity,
    title: db.title,
    message: db.message,
    details: db.details || undefined,
    actionLabel: db.action_label || undefined,
    actionUrl: db.action_url || undefined,
    created_at: db.created_at,
    read: db.is_read,
  };
}

function loadInitialNotifications(): AppNotification[] {
  return getDefaultNotifications();
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SETTINGS_LOADED":
      return { ...state, settings: action.payload, settingsLoaded: true };
    case "SET_THEME":
      return {
        ...state,
        settings: { ...state.settings, theme: action.payload },
      };
    case "SET_SETTING":
      return {
        ...state,
        settings: { ...state.settings, [action.key]: action.value },
      };
    case "ADD_NOTIFICATION": {
      // Prepend so newest is first
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.filter((n) => n.id !== action.payload.id)],
      };
    }
    case "DISMISS_NOTIFICATION": {
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    }
    case "CLEAR_ALL_NOTIFICATIONS": {
      return {
        ...state,
        notifications: [],
      };
    }
    case "SET_NOTIFICATIONS": {
      return {
        ...state,
        notifications: action.payload,
      };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setTheme: (theme: "light" | "dark") => void;
  updateSetting: (key: keyof AppSettings, value: string) => void;
  fmt: (value: number) => string;
  addNotification: (item: Omit<AppNotification, "id" | "created_at" | "read"> & { id?: string }) => string;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
  unreadAlertsCount: number;
  unreadNotificationsCount: number;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    settings: defaultSettings,
    settingsLoaded: false,
    notifications: loadInitialNotifications(),
  });

  // Load settings from DB on mount
  useEffect(() => {
    getSettings()
      .then((rows: AppSetting[]) => {
        if (!rows) return;
        const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
        dispatch({
          type: "SETTINGS_LOADED",
          payload: {
            theme: (map.theme as "light" | "dark") || "light",
            auto_backup_enabled: map.auto_backup_enabled === "true",
            backup_path: map.backup_path || "",
            currency_symbol: map.currency_symbol || "₱",
            last_backup: map.last_backup || "",
          },
        });
      })
      .catch(() => {});
  }, []);

  // Sync theme to <html> class
  useEffect(() => {
    if (state.settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [state.settings.theme]);

  // Load notifications from SQLite DB on mount
  useEffect(() => {
    getActiveNotifications()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          dispatch({
            type: "SET_NOTIFICATIONS",
            payload: rows.map(mapDbToAppNotification),
          });
        }
      })
      .catch(() => {});

    // Clean up any legacy localStorage entry
    try {
      localStorage.removeItem("bakeiq_notifications");
    } catch {}
  }, []);

  const setTheme = useCallback((theme: "light" | "dark") => {
    dispatch({ type: "SET_THEME", payload: theme });
    setSetting("theme", theme).catch(() => {});
  }, []);

  const updateSetting = useCallback((key: keyof AppSettings, value: string) => {
    dispatch({ type: "SET_SETTING", key, value });
    setSetting(key, value).catch(() => {});
  }, []);

  const addNotification = useCallback(
    (item: Omit<AppNotification, "id" | "created_at" | "read"> & { id?: string }) => {
      const id = item.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newNotif: AppNotification = {
        ...item,
        id,
        created_at: new Date().toISOString(),
        read: false,
      };
      // Optimistic local state update
      dispatch({ type: "ADD_NOTIFICATION", payload: newNotif });

      // Persist to SQLite via Tauri IPC
      createDbNotification({
        id,
        notification_type: item.type,
        severity: item.severity,
        title: item.title,
        message: item.message,
        details: item.details,
        action_label: item.actionLabel,
        action_url: item.actionUrl,
      }).catch(() => {});

      return newNotif.id;
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    // Optimistic local state update
    dispatch({ type: "DISMISS_NOTIFICATION", payload: id });
    // Persist to SQLite
    dismissDbNotification(id).catch(() => {});
  }, []);

  const clearAllNotifications = useCallback(() => {
    // Optimistic local state update
    dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" });
    // Persist to SQLite
    clearAllDbNotifications().catch(() => {});
  }, []);

  // Currency formatter: half-up rounding to 2dp
  const fmt = useCallback(
    (value: number) => {
      const symbol = state.settings.currency_symbol;
      const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
      return `${symbol}${rounded.toFixed(2)}`;
    },
    [state.settings.currency_symbol]
  );

  const unreadAlertsCount = state.notifications.filter((n) => !n.read && n.type === "alert").length;
  const unreadNotificationsCount = state.notifications.filter((n) => !n.read && n.type === "notification").length;
  const unreadCount = unreadAlertsCount + unreadNotificationsCount;

  return (
    <AppContext.Provider
      value={{
        state,
        setTheme,
        updateSetting,
        fmt,
        addNotification,
        dismissNotification,
        clearAllNotifications,
        unreadCount,
        unreadAlertsCount,
        unreadNotificationsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

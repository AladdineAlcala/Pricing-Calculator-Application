// App-wide state management via React Context + useReducer
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getSettings, setSetting, type AppSetting } from "@/lib/api";

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
}

type AppAction =
  | { type: "SETTINGS_LOADED"; payload: AppSettings }
  | { type: "SET_THEME"; payload: "light" | "dark" }
  | { type: "SET_SETTING"; key: keyof AppSettings; value: string };

const defaultSettings: AppSettings = {
  theme: "light",
  auto_backup_enabled: true,
  backup_path: "",
  currency_symbol: "₱",
  last_backup: "",
};

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
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setTheme: (theme: "light" | "dark") => void;
  updateSetting: (key: keyof AppSettings, value: string) => void;
  fmt: (value: number) => string;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    settings: defaultSettings,
    settingsLoaded: false,
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

  const setTheme = useCallback((theme: "light" | "dark") => {
    dispatch({ type: "SET_THEME", payload: theme });
    setSetting("theme", theme).catch(() => {});
  }, []);

  const updateSetting = useCallback((key: keyof AppSettings, value: string) => {
    dispatch({ type: "SET_SETTING", key, value });
    setSetting(key, value).catch(() => {});
  }, []);

  // Currency formatter: half-up rounding to 2dp
  const fmt = useCallback(
    (value: number) => {
      const symbol = state.settings.currency_symbol;
      // Half-up rounding
      const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
      return `${symbol}${rounded.toFixed(2)}`;
    },
    [state.settings.currency_symbol]
  );

  return (
    <AppContext.Provider value={{ state, setTheme, updateSetting, fmt }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

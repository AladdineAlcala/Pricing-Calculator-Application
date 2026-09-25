// Left-side navigation sidebar
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/ingredients", label: "Ingredients", icon: "🧂" },
  { to: "/recipes", label: "Recipes", icon: "📋" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const { state, setTheme } = useApp();
  const location = useLocation();

  return (
    <aside
      className="flex flex-col h-full border-r border-[hsl(var(--border))]
        bg-[hsl(var(--card))] w-[var(--sidebar-width)] shrink-0"
    >
      {/* Logo / brand */}
      <div className="px-5 py-5 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base
              bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
          >
            🧁
          </div>
          <div>
            <p className="text-sm font-bold text-[hsl(var(--foreground))] leading-tight">
              Pricing Calc
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">v0.1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-150 group
              ${
                isActive
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
              }`
            }
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-4 border-t border-[hsl(var(--border))]">
        <button
          onClick={() =>
            setTheme(state.settings.theme === "dark" ? "light" : "dark")
          }
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm
            text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]
            hover:text-[hsl(var(--foreground))] transition-all duration-150"
          id="theme-toggle-btn"
        >
          <span className="text-base leading-none">
            {state.settings.theme === "dark" ? "☀️" : "🌙"}
          </span>
          <span>{state.settings.theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>
    </aside>
  );
}

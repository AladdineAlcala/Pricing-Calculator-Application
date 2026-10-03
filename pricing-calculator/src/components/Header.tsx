// Top navigation header bar matching Stitch design specification
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Search, Package, Plus, Sun, Moon } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";

interface HeaderProps {
  unpricedCount?: number;
  onOpenNewRecipe?: () => void;
}

export function Header({ unpricedCount = 0, onOpenNewRecipe }: HeaderProps) {
  const { state, setTheme } = useApp();
  const isDark = state.settings.theme === "dark";
  const navigate = useNavigate();
  const currencySymbol = state.settings.currency_symbol || "₱";

  return (
    <header
      className="sticky top-0 z-50 print:hidden bg-flour-100/90 backdrop-blur-md border-b border-stoneBorder px-6 h-20 flex items-center justify-between gap-4 shrink-0"
      data-purpose="top-navigation"
    >
      {/* Left: Breadcrumb & Operational Mode Indicators */}
      <div className="flex items-center gap-3 text-xs shrink-0">
        <div className="inline-flex items-center gap-1.5 bg-culinary-50 dark:bg-emerald-950/60 text-culinary-700 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-culinary-500 animate-pulse" />
          <span>Inventory &amp; Costing</span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-flour-200 text-espresso-700 border border-stoneBorder px-2.5 py-1 rounded-full font-medium">
          <span className="text-culinary-600 font-bold">{currencySymbol}</span>
          <span>PHP ({currencySymbol}) Currency Active</span>
        </div>
      </div>

      {/* Right: Actions, Search, Quick Buttons & Profile */}
      <div className="flex items-center gap-3">
        {/* Command Palette Hint */}
        <button
          onClick={() => navigate("/ingredients")}
          className="hidden 2xl:flex items-center gap-2 bg-flour-100 border border-stoneBorder hover:border-espresso-300 rounded-lg px-2.5 py-1 text-xs text-espresso-500 transition-colors cursor-pointer"
          title="Search pantry ingredients (⌘K)"
          type="button"
        >
          <Search className="w-3.5 h-3.5 text-espresso-400" />
          <span>Search pantry items...</span>
          <kbd className="bg-white border border-stoneBorder rounded px-1 text-[10px] font-mono text-espresso-600">
            ⌘K
          </kbd>
        </button>

        {/* Secondary Action: Manage Ingredients */}
        <Link
          to="/ingredients"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-espresso-800 bg-white hover:bg-flour-100 border border-stoneBorder rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Package className="w-3.5 h-3.5 text-espresso-600 dark:text-slate-400" />
          <span>Manage Ingredients</span>
        </Link>

        {/* Primary Action: + New Recipe */}
        {onOpenNewRecipe ? (
          <button
            onClick={onOpenNewRecipe}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-culinary-600 hover:bg-culinary-700 rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Recipe</span>
          </button>
        ) : (
          <Link
            to="/recipes"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-culinary-600 hover:bg-culinary-700 rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Recipe</span>
          </Link>
        )}

        {/* Alert / Bell Notification Center */}
        <NotificationCenter unpricedCount={unpricedCount} />

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="p-2 flex items-center justify-center text-espresso-600 hover:text-espresso-900 bg-white hover:bg-flour-100 border border-stoneBorder rounded-lg transition-colors cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          type="button"
          id="theme-toggle-btn"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-espresso-600 dark:text-slate-300" />
          )}
        </button>

        {/* User & Branch Profile Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-stoneBorder">
          <div className="w-8 h-8 rounded-full bg-espresso-800 dark:bg-slate-800 text-amber-100 flex items-center justify-center font-bold text-xs shadow-sm">
            GB
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-espresso-900 dark:text-white">Glenz Bakeshop</span>
            <span className="text-[10px] text-espresso-400 dark:text-slate-400">Metro Kitchen #1</span>
          </div>
        </div>
      </div>
    </header>
  );
}

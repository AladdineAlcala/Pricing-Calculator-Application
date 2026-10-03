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
      className="sticky top-0 z-20 print:hidden bg-white/95 backdrop-blur border-b border-[#E5E3DF] px-6 h-20 flex items-center justify-between gap-4 shrink-0"
      data-purpose="top-navigation"
    >
      {/* Left: Breadcrumb & Operational Mode Indicators */}
      <div className="flex items-center gap-3 text-xs shrink-0">
        <div className="inline-flex items-center gap-1.5 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 px-2.5 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
          <span>Inventory &amp; Costing</span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[#F9F8F6] text-[#0F0F0F] border border-[#E5E3DF] px-2.5 py-1 rounded-full font-medium">
          <span className="text-[#D97A34] font-bold font-mono">{currencySymbol}</span>
          <span>PHP ({currencySymbol}) Currency Active</span>
        </div>
      </div>

      {/* Right: Actions, Search, Quick Buttons & Profile */}
      <div className="flex items-center gap-3">
        {/* Command Palette Hint */}
        <button
          onClick={() => navigate("/ingredients")}
          className="hidden 2xl:flex items-center gap-2 bg-[#F9F8F6] border border-[#E5E3DF] hover:border-[#0F0F0F]/30 rounded-lg px-2.5 py-1 text-xs text-[#6B6B6B] transition-colors cursor-pointer"
          title="Search pantry ingredients (⌘K)"
          type="button"
        >
          <Search className="w-3.5 h-3.5 text-[#6B6B6B]" />
          <span>Search pantry items...</span>
          <kbd className="bg-white border border-[#E5E3DF] rounded px-1 text-[10px] font-mono text-[#0F0F0F]">
            ⌘K
          </kbd>
        </button>

        {/* Secondary Action: Manage Ingredients */}
        <Link
          to="/ingredients"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#0F0F0F] bg-white hover:bg-[#F9F8F6] border border-[#E5E3DF] rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Package className="w-3.5 h-3.5 text-[#0F0F0F]" />
          <span>Manage Ingredients</span>
        </Link>

        {/* Primary Action: + New Recipe */}
        {onOpenNewRecipe ? (
          <button
            onClick={onOpenNewRecipe}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Recipe</span>
          </button>
        ) : (
          <Link
            to="/recipes"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
          className="p-2 flex items-center justify-center text-[#0F0F0F] bg-white hover:bg-[#F9F8F6] border border-[#E5E3DF] rounded-lg transition-colors cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          type="button"
          id="theme-toggle-btn"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-[#0F0F0F]" />
          )}
        </button>

        {/* User & Branch Profile Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E5E3DF]">
          <div className="w-8 h-8 rounded-full bg-[#0F0F0F] text-[#F9F8F6] flex items-center justify-center font-bold text-xs shadow-sm">
            GB
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-[#0F0F0F]">Glenz Bakeshop</span>
            <span className="text-[10px] text-[#6B6B6B]">Metro Kitchen #1</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// Top navigation header bar matching Stitch design specification
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Search, Package, Plus, Bell, RefreshCw } from "lucide-react";

interface HeaderProps {
  unpricedCount?: number;
  onOpenNewRecipe?: () => void;
}

export function Header({ unpricedCount = 0, onOpenNewRecipe }: HeaderProps) {
  const { state } = useApp();
  const navigate = useNavigate();
  const currencySymbol = state.settings.currency_symbol || "₱";

  return (
    <header
      className="sticky top-0 z-20 bg-artisan-surface/95 dark:bg-[#0c101a]/95 backdrop-blur border-b border-artisan-border dark:border-slate-800 px-6 py-3.5 flex items-center justify-between gap-4"
      data-purpose="top-navigation"
    >
      {/* Left: Breadcrumb & Operational Mode Indicators */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        <div className="inline-flex items-center gap-1.5 bg-culinary-50 dark:bg-emerald-950/60 text-culinary-700 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-culinary-500 animate-pulse" />
          <span>Inventory &amp; Costing</span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-artisan-subtle dark:bg-[#141b2c] text-espresso-700 dark:text-slate-200 border border-artisan-border dark:border-slate-800 px-2.5 py-1 rounded-full font-medium">
          <span className="text-culinary-600 dark:text-emerald-400 font-bold">{currencySymbol}</span>
          <span>PHP ({currencySymbol}) Currency Active</span>
        </div>

        <div className="hidden lg:inline-flex items-center gap-1.5 text-espresso-400 dark:text-slate-400 font-mono text-[11px]">
          <RefreshCw className="w-3.5 h-3.5 text-culinary-600 dark:text-emerald-400" />
          <span>Yield auto-sync active</span>
        </div>
      </div>

      {/* Right: Actions, Search, Quick Buttons & Profile */}
      <div className="flex items-center gap-3">
        {/* Command Palette Hint */}
        <button
          onClick={() => navigate("/ingredients")}
          className="hidden xl:flex items-center gap-2 bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 hover:border-espresso-300 dark:hover:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-espresso-400 dark:text-slate-400 transition-colors cursor-pointer"
          title="Search pantry ingredients (⌘K)"
          type="button"
        >
          <Search className="w-3.5 h-3.5 text-espresso-400 dark:text-slate-400" />
          <span>Search pantry items...</span>
          <kbd className="bg-artisan-surface dark:bg-slate-800 border border-artisan-border dark:border-slate-700 rounded px-1 text-[10px] font-mono text-espresso-600 dark:text-slate-300">
            ⌘K
          </kbd>
        </button>

        {/* Secondary Action: Manage Ingredients */}
        <Link
          to="/ingredients"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-espresso-800 dark:text-slate-200 bg-artisan-surface dark:bg-[#141b2c] hover:bg-artisan-subtle dark:hover:bg-slate-800 border border-artisan-border dark:border-slate-800 rounded-lg shadow-artisan-subtle transition-colors cursor-pointer"
        >
          <Package className="w-3.5 h-3.5 text-espresso-600 dark:text-slate-400" />
          <span>Manage Ingredients</span>
        </Link>

        {/* Primary Action: + New Recipe */}
        {onOpenNewRecipe ? (
          <button
            onClick={onOpenNewRecipe}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-culinary-600 hover:bg-culinary-700 rounded-lg shadow-artisan-glow transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            type="button"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Recipe</span>
          </button>
        ) : (
          <Link
            to="/recipes"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-culinary-600 hover:bg-culinary-700 rounded-lg shadow-artisan-glow transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>New Recipe</span>
          </Link>
        )}

        {/* Alert / Bell Notification */}
        <div className="relative">
          <Link
            to="/ingredients"
            className="p-2 flex items-center justify-center text-espresso-600 dark:text-slate-300 hover:text-espresso-900 dark:hover:text-white bg-artisan-surface dark:bg-[#141b2c] hover:bg-artisan-subtle dark:hover:bg-slate-800 border border-artisan-border dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
            title={unpricedCount > 0 ? `${unpricedCount} pending price notice(s)` : "All pantry items costed"}
          >
            <Bell className="w-4 h-4" />
            {unpricedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-caramel-500 rounded-full ring-2 ring-white dark:ring-[#0c101a]" />
            )}
          </Link>
        </div>

        {/* User & Branch Profile Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-artisan-border dark:border-slate-800">
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

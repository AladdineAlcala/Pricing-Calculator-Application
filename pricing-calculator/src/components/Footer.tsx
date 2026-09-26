// System status footer matching Stitch design specification
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@/components/ui";
import { Command, Scale, FileSpreadsheet, X } from "lucide-react";

export function Footer() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showYieldTables, setShowYieldTables] = useState(false);

  return (
    <>
      <footer
        className="bg-artisan-surface dark:bg-[#0c101a] border-t border-artisan-border dark:border-slate-800 px-6 py-3 text-xs text-espresso-400 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto"
        data-purpose="system-status-footer"
      >
        <div className="flex items-center gap-2">
          {/* Logo micro indicator */}
          <span className="w-2 h-2 rounded-full bg-culinary-500 animate-pulse" />
          <span className="font-medium text-espresso-600 dark:text-slate-300">
            BakeIQ Telemetry Engine v3.2.0
          </span>
          <span className="text-espresso-300 dark:text-slate-600">|</span>
          <span>FIFO Inventory Valuation Active</span>
        </div>

        <div className="flex items-center gap-4 text-espresso-500 dark:text-slate-400">
          <button
            onClick={() => setShowShortcuts(true)}
            className="hover:text-espresso-800 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            type="button"
          >
            <kbd className="font-mono bg-artisan-subtle dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 px-1 rounded text-[10px] text-espresso-700 dark:text-slate-300">
              ⌘
            </kbd>{" "}
            Shortcuts
          </button>

          <button
            onClick={() => setShowYieldTables(true)}
            className="hover:text-espresso-800 dark:hover:text-white transition-colors cursor-pointer"
            type="button"
          >
            Yield Conversion Tables
          </button>

          <Link
            to="/ingredients"
            className="hover:text-espresso-800 dark:hover:text-white transition-colors"
          >
            Export Master Specs
          </Link>
        </div>
      </footer>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <Modal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          title="Keyboard Shortcuts & Ergonomics"
          size="md"
        >
          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800">
              <span className="font-medium text-espresso-800 dark:text-slate-200">
                Pantry Quick Search
              </span>
              <kbd className="px-2 py-0.5 rounded bg-artisan-surface dark:bg-slate-800 border border-artisan-border dark:border-slate-700 font-mono text-[11px] font-bold">
                ⌘K
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800">
              <span className="font-medium text-espresso-800 dark:text-slate-200">
                Close Active Modal / Drawer
              </span>
              <kbd className="px-2 py-0.5 rounded bg-artisan-surface dark:bg-slate-800 border border-artisan-border dark:border-slate-700 font-mono text-[11px] font-bold">
                Esc
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800">
              <span className="font-medium text-espresso-800 dark:text-slate-200">
                Form Field Navigation
              </span>
              <kbd className="px-2 py-0.5 rounded bg-artisan-surface dark:bg-slate-800 border border-artisan-border dark:border-slate-700 font-mono text-[11px] font-bold">
                Tab / Shift+Tab
              </kbd>
            </div>
          </div>
        </Modal>
      )}

      {/* Yield Conversion Reference Modal */}
      {showYieldTables && (
        <Modal
          isOpen={showYieldTables}
          onClose={() => setShowYieldTables(false)}
          title="Artisan Yield & Density Reference"
          size="lg"
        >
          <div className="space-y-4 py-2 text-xs">
            <p className="text-espresso-600 dark:text-slate-400">
              Standard culinary cup-to-weight conversions applied in BakeIQ recipe formulas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-culinary-700 dark:text-emerald-400 block">
                  All-Purpose / Bread Flour
                </span>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>1 Cup</span>
                  <span className="font-bold">120 grams</span>
                </div>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>25kg Sack Yield</span>
                  <span className="font-bold">208.25 cups</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-caramel-700 dark:text-amber-400 block">
                  Unsalted Butter
                </span>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>1 Cup</span>
                  <span className="font-bold">227 grams (2 sticks)</span>
                </div>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>225g Box Yield</span>
                  <span className="font-bold">0.9912 cups</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-espresso-700 dark:text-slate-300 block">
                  Granulated Cane Sugar
                </span>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>1 Cup</span>
                  <span className="font-bold">200 grams</span>
                </div>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>1kg Bag Yield</span>
                  <span className="font-bold">5.00 cups</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-artisan-canvas dark:bg-[#141b2c] border border-artisan-border dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-culinary-700 dark:text-emerald-400 block">
                  Fresh Whole Milk
                </span>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>1 Cup</span>
                  <span className="font-bold">240 ml</span>
                </div>
                <div className="flex justify-between text-espresso-800 dark:text-slate-200">
                  <span>1 Liter Bottle</span>
                  <span className="font-bold">4.1667 cups</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

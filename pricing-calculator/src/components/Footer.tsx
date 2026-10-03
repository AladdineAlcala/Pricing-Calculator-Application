// System status sticky footer matching Stitch design specification
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui";
import {
  Scale,
  Command,
  Database,
  Info,
  Layers,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function Footer() {
  const { state } = useApp();
  const currencySymbol = state.settings.currency_symbol || "₱";
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showYieldTables, setShowYieldTables] = useState(false);

  // Global keyboard shortcut listener: Pressing '?' toggles shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <footer
        className="sticky bottom-0 z-30 shrink-0 w-full h-12 bg-white/95 backdrop-blur-md border-t border-[#E5E3DF] px-4 sm:px-6 text-xs text-[#6B6B6B] flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
        data-purpose="system-status-sticky-footer"
      >
        {/* Left: Engine Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
            <span>BakeIQ v3.2.0</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 text-[#6B6B6B] font-medium">
            <Database className="w-3.5 h-3.5 text-[#4A7C59]" />
            <span>Local SQLite Database</span>
          </div>
        </div>

        {/* Right: Interactive Utilities & Modals */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Shortcuts Trigger */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0F0F0F] bg-white hover:bg-[#F9F8F6] border border-[#E5E3DF] hover:border-[#0F0F0F]/30 transition-all cursor-pointer active:scale-[0.98]"
            title="Keyboard Shortcuts (?)"
            type="button"
          >
            <kbd className="font-mono bg-[#F9F8F6] border border-[#E5E3DF] px-1.5 py-0.2 rounded text-[10px] text-[#0F0F0F] font-bold">
              ⌘
            </kbd>
            <span>Shortcuts</span>
          </button>

          {/* Yield Conversion Reference */}
          <button
            onClick={() => setShowYieldTables(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#0F0F0F] bg-white hover:bg-[#F9F8F6] border border-[#E5E3DF] hover:border-[#0F0F0F]/30 transition-all cursor-pointer active:scale-[0.98]"
            type="button"
          >
            <Scale className="w-3.5 h-3.5 text-[#D97A34]" />
            <span className="hidden sm:inline">Yield Conversion Tables</span>
            <span className="sm:hidden">Yields</span>
          </button>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <Modal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          title="Keyboard Shortcuts & Navigation"
          size="md"
        >
          <div className="space-y-2.5 py-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF]">
              <span className="font-semibold text-[#0F0F0F]">
                Pantry Quick Search
              </span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E3DF] font-mono text-[11px] font-bold text-[#0F0F0F] shadow-2xs">
                ⌘K
              </kbd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF]">
              <span className="font-semibold text-[#0F0F0F]">
                Close Active Modal / Drawer
              </span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E3DF] font-mono text-[11px] font-bold text-[#0F0F0F] shadow-2xs">
                Esc
              </kbd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF]">
              <span className="font-semibold text-[#0F0F0F]">
                Form Field Navigation
              </span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E3DF] font-mono text-[11px] font-bold text-[#0F0F0F] shadow-2xs">
                Tab / Shift+Tab
              </kbd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF]">
              <span className="font-semibold text-[#0F0F0F]">
                Toggle Shortcuts Modal
              </span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E3DF] font-mono text-[11px] font-bold text-[#0F0F0F] shadow-2xs">
                ?
              </kbd>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF]">
              <span className="font-semibold text-[#0F0F0F]">
                Submit Modal / Confirm Action
              </span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E3DF] font-mono text-[11px] font-bold text-[#0F0F0F] shadow-2xs">
                Enter
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
          title="Artisan Culinary Yield & Density Reference"
          size="lg"
        >
          <div className="space-y-4 py-2 text-xs">
            <p className="text-[#6B6B6B] leading-relaxed">
              Standard commercial volume-to-weight conversions applied in BakeIQ recipe formulas and UOM normalizers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono">
              <div className="p-3.5 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A7C59] block font-sans">
                  All-Purpose / Bread Flour
                </span>
                <div className="flex justify-between text-[#0F0F0F]">
                  <span>1 Cup</span>
                  <span className="font-bold">120 grams</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B] text-[11px]">
                  <span>25kg Sack Yield</span>
                  <span className="font-semibold">208.33 Cups</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97A34] block font-sans">
                  Unsalted Butter
                </span>
                <div className="flex justify-between text-[#0F0F0F]">
                  <span>1 Cup</span>
                  <span className="font-bold">227 grams (2 sticks)</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B] text-[11px]">
                  <span>225g Box Content</span>
                  <span className="font-semibold">0.9912 Cups</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F0F] block font-sans">
                  Granulated Cane Sugar
                </span>
                <div className="flex justify-between text-[#0F0F0F]">
                  <span>1 Cup</span>
                  <span className="font-bold">200 grams</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B] text-[11px]">
                  <span>1kg Pack Yield</span>
                  <span className="font-semibold">5.00 Cups</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A7C59] block font-sans">
                  Fresh Whole Milk
                </span>
                <div className="flex justify-between text-[#0F0F0F]">
                  <span>1 Cup</span>
                  <span className="font-bold">240 ml</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B] text-[11px]">
                  <span>1 Liter Bottle</span>
                  <span className="font-semibold">4.1667 Cups</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97A34] block font-sans">
                  Cocoa Powder
                </span>
                <div className="flex justify-between text-[#0F0F0F]">
                  <span>1 Cup</span>
                  <span className="font-bold">100 grams</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B] text-[11px]">
                  <span>1kg Can Yield</span>
                  <span className="font-semibold">10.00 Cups</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F0F0F] block font-sans">
                  Large Fresh Eggs
                </span>
                <div className="flex justify-between text-[#0F0F0F]">
                  <span>1 Tray</span>
                  <span className="font-bold">12 pcs (~600g)</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B] text-[11px]">
                  <span>1 Egg Net Content</span>
                  <span className="font-semibold">~50 grams liquid</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

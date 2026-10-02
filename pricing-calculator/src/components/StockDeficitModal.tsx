import React from "react";
import { AlertOctagon, X, Truck, ShieldAlert, ArrowUpRight, Box, Layers } from "lucide-react";
import type { StockDeficit } from "@/lib/api";

export interface StockDeficitModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeName: string;
  batches: number;
  deficits: StockDeficit[];
  onQuickReceive?: (ingredientName: string, itemType?: string) => void;
}

export function StockDeficitModal({
  isOpen,
  onClose,
  recipeName,
  batches,
  deficits,
  onQuickReceive,
}: StockDeficitModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deficit-modal-title"
    >
      <div
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-artisan-surface dark:bg-[#0f1422] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 dark:border-rose-950/60 bg-rose-50/80 dark:bg-rose-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="deficit-modal-title" className="text-base font-bold text-rose-950 dark:text-rose-100">
                Production Hard Stop — Stock Deficit Detected
              </h2>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                BakeIQ ledger validation blocked {batches} batch(es) of &quot;{recipeName}&quot;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 dark:text-rose-400 dark:hover:text-white hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
            aria-label="Close deficit alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Explanation Callout */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Transaction Aborted:</span> Perpetual stock levels are below required recipe quantities. Zero stock has been deducted from your inventory, and financial recipe cost baselines remain completely unchanged.
            </div>
          </div>

          {/* Missing Ingredients Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-espresso-600 dark:text-slate-400">
              <span>Shortfall Analysis ({deficits.length} item{deficits.length > 1 ? "s" : ""})</span>
              <span className="text-[11px] font-normal normal-case text-espresso-400 dark:text-slate-500">
                Normalized to bulk purchase units
              </span>
            </div>

            <div className="rounded-xl border border-artisan-border dark:border-slate-800 overflow-hidden bg-artisan-canvas/50 dark:bg-[#141b2c]/50">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-artisan-border dark:border-slate-800 bg-artisan-subtle/60 dark:bg-slate-800/40 text-[11px] font-semibold text-espresso-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Material / Item</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Required</th>
                    <th className="py-2.5 px-3 text-right">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Deficit</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-artisan-border dark:divide-slate-800/60 font-mono">
                  {deficits.map((d, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-espresso-900 dark:text-white">
                        {d.ingredient_name}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        {d.item_type === "packaging" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                            <Box className="w-3 h-3" />
                            <span>Packaging</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                            <Layers className="w-3 h-3" />
                            <span>Ingredient</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-espresso-700 dark:text-slate-300">
                        {d.required_bulk_qty.toFixed(2)} {d.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-espresso-500 dark:text-slate-400">
                        {d.current_bulk_qty.toFixed(2)} {d.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        -{d.deficit_qty.toFixed(2)} {d.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {onQuickReceive && (
                          <button
                            type="button"
                            onClick={() => onQuickReceive(d.ingredient_name, d.item_type)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-culinary-700 dark:text-culinary-300 bg-culinary-50 dark:bg-culinary-950/70 hover:bg-culinary-100 dark:hover:bg-culinary-900/90 border border-culinary-200 dark:border-culinary-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Receive</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-[#141b2c]/50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-espresso-500 dark:text-slate-400">
            Log inventory delivery intake to fulfill recipe requirement.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-espresso-700 dark:text-slate-200 bg-artisan-surface dark:bg-slate-800 hover:bg-artisan-subtle dark:hover:bg-slate-700 border border-artisan-border dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
}

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
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-rose-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="deficit-modal-title" className="text-base font-bold text-rose-950">
                Production Hard Stop — Stock Deficit Detected
              </h2>
              <p className="text-xs text-rose-700/80">
                BakeIQ ledger validation blocked {batches} batch(es) of &quot;{recipeName}&quot;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            aria-label="Close deficit alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Explanation Callout */}
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/50 text-xs text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Transaction Aborted:</span> Perpetual stock levels are below required recipe quantities. Zero stock has been deducted from your inventory, and financial recipe cost baselines remain completely unchanged.
            </div>
          </div>

          {/* Missing Ingredients Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <span>Shortfall Analysis ({deficits.length} item{deficits.length > 1 ? "s" : ""})</span>
              <span className="text-[11px] font-normal normal-case text-[#6B6B6B]">
                Normalized to bulk purchase units
              </span>
            </div>

            <div className="rounded-lg border border-[#E5E3DF] overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[11px] font-semibold text-[#6B6B6B]">
                    <th className="py-2.5 px-4">Material / Item</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Required</th>
                    <th className="py-2.5 px-3 text-right">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Deficit</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF] font-mono">
                  {deficits.map((d, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-[#0F0F0F]">
                        {d.ingredient_name}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        {d.item_type === "packaging" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30">
                            <Box className="w-3 h-3" />
                            <span>Packaging</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30">
                            <Layers className="w-3 h-3" />
                            <span>Ingredient</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-[#0F0F0F]">
                        {d.required_bulk_qty.toFixed(2)} {d.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-[#6B6B6B]">
                        {d.current_bulk_qty.toFixed(2)} {d.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        -{d.deficit_qty.toFixed(2)} {d.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {onQuickReceive && (
                          <button
                            type="button"
                            onClick={() => onQuickReceive(d.ingredient_name, d.item_type)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#D97A34] bg-[#D97A34]/10 hover:bg-[#D97A34]/20 border border-[#D97A34]/30 rounded-lg transition-colors cursor-pointer"
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
        <div className="p-4 border-t border-[#E5E3DF] bg-[#F9F8F6] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#6B6B6B]">
            Log inventory delivery intake to fulfill recipe requirement.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#0F0F0F] bg-white hover:bg-[#F9F8F6] border border-[#0F0F0F] rounded-lg transition-colors cursor-pointer"
          >
            Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
}

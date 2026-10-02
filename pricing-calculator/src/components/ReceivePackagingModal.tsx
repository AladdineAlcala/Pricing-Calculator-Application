import React, { useState, useEffect, useMemo } from "react";
import { X, Truck, AlertTriangle, Check, Search, PackageCheck, Box } from "lucide-react";
import {
  getPackagingList,
  receivePackagingInventory,
  type Packaging,
} from "@/lib/api";
import { Spinner } from "@/components/ui";
import { useApp } from "@/context/AppContext";

interface ReceivePackagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedPackagingId?: number | null;
}

export function ReceivePackagingModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPackagingId,
}: ReceivePackagingModalProps) {
  const { state } = useApp();
  const currency = state.settings.currency_symbol || "₱";

  const [packagingList, setPackagingList] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(preselectedPackagingId || null);
  const [addedQty, setAddedQty] = useState<string>("");
  const [newUnitCost, setNewUnitCost] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMsg(null);
      getPackagingList()
        .then((items) => {
          setPackagingList(items);
          if (preselectedPackagingId) {
            setSelectedId(preselectedPackagingId);
            const found = items.find((p) => p.packaging_id === preselectedPackagingId);
            if (found) {
              setNewUnitCost(found.current_unit_cost.toString());
            }
          } else if (items.length > 0 && !selectedId) {
            setSelectedId(items[0].packaging_id);
            setNewUnitCost(items[0].current_unit_cost.toString());
          }
        })
        .catch((err) => {
          setErrorMsg(typeof err === "string" ? err : "Failed to load packaging catalog");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setAddedQty("");
      setSearchFilter("");
      setErrorMsg(null);
    }
  }, [isOpen, preselectedPackagingId]);

  const selectedPackaging = useMemo(() => {
    return packagingList.find((p) => p.packaging_id === selectedId) || null;
  }, [packagingList, selectedId]);

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return packagingList;
    const query = searchFilter.toLowerCase();
    return packagingList.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.packaging_code.toLowerCase().includes(query) ||
        p.packaging_type.toLowerCase().includes(query)
    );
  }, [packagingList, searchFilter]);

  const handleSelectPackaging = (p: Packaging) => {
    setSelectedId(p.packaging_id);
    setNewUnitCost(p.current_unit_cost.toString());
    setErrorMsg(null);
  };

  const parsedQty = parseFloat(addedQty) || 0;
  const parsedCost = parseFloat(newUnitCost) || 0;
  const totalInvoiceValue = parsedQty * parsedCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setErrorMsg("Please select a packaging item");
      return;
    }

    if (parsedQty <= 0) {
      setErrorMsg("Quantity received must be a positive number greater than 0");
      return;
    }

    if (parsedCost < 0) {
      setErrorMsg("Unit cost cannot be negative");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await receivePackagingInventory({
        packaging_id: selectedId,
        added_qty: parsedQty,
        new_unit_cost: parsedCost,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      if (typeof err === "string") {
        setErrorMsg(err);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to record packaging inventory delivery");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="packaging-delivery-modal-title"
    >
      <div
        className="relative z-10 w-full max-w-xl rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0c101a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-artisan-border/80 dark:border-slate-800/80 bg-artisan-subtle/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 id="packaging-delivery-modal-title" className="text-base font-bold text-espresso-900 dark:text-white">
                Receive Packaging Delivery
              </h2>
              <p className="text-xs text-espresso-500 dark:text-slate-400">
                Stock intake for bakery containers, boxes, liners, and sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-espresso-400 hover:text-espresso-700 dark:text-slate-400 dark:hover:text-white hover:bg-artisan-subtle dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Selector / Search */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-espresso-800 dark:text-slate-200 flex items-center justify-between">
              <span>Select Packaging Material</span>
              <span className="text-[11px] font-normal text-espresso-400 dark:text-slate-400">
                {filteredItems.length} available
              </span>
            </label>

            {loading ? (
              <div className="py-6 flex items-center justify-center">
                <Spinner className="w-5 h-5 text-amber-600" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search packaging code or name..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-slate-900/60 text-espresso-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-artisan-border dark:border-slate-800 divide-y divide-artisan-border/60 dark:divide-slate-800/60 bg-artisan-canvas/30 dark:bg-slate-900/30">
                  {filteredItems.map((p) => {
                    const isSelected = p.packaging_id === selectedId;
                    return (
                      <button
                        key={p.packaging_id}
                        type="button"
                        onClick={() => handleSelectPackaging(p)}
                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
                            : "hover:bg-artisan-subtle/80 dark:hover:bg-slate-800/40 text-espresso-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40">
                            {p.packaging_code}
                          </span>
                          <span>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-espresso-400 dark:text-slate-400">
                            {p.current_stock_qty} {p.unit}s on hand
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Item Summary Card */}
          {selectedPackaging && (
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-950 dark:text-amber-200">
                  {selectedPackaging.name}
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Type: {selectedPackaging.packaging_type} · Unit: {selectedPackaging.unit}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium">
                  Current Stock
                </span>
                <span className="font-mono font-bold text-amber-950 dark:text-amber-200 text-sm">
                  {selectedPackaging.current_stock_qty} {selectedPackaging.unit}s
                </span>
              </div>
            </div>
          )}

          {/* Input Grid: Quantity + Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="pkg-added-qty" className="text-xs font-bold text-espresso-800 dark:text-slate-200">
                Quantity Received ({selectedPackaging?.unit || "units"})
              </label>
              <input
                id="pkg-added-qty"
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g. 50"
                value={addedQty}
                onChange={(e) => setAddedQty(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-slate-900/60 text-espresso-900 dark:text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pkg-unit-cost" className="text-xs font-bold text-espresso-800 dark:text-slate-200">
                Unit Cost ({currency} / {selectedPackaging?.unit || "unit"})
              </label>
              <input
                id="pkg-unit-cost"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 2.50"
                value={newUnitCost}
                onChange={(e) => setNewUnitCost(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-slate-900/60 text-espresso-900 dark:text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Real-time Calculation Hero Banner */}
          <div className="p-4 rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-espresso-600 dark:text-slate-300">
                Total Invoice Value:
              </span>
            </div>
            <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-base">
              {currency}{totalInvoiceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 border-t border-artisan-border/80 dark:border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-espresso-700 dark:text-slate-300 bg-artisan-surface dark:bg-slate-800 hover:bg-artisan-subtle dark:hover:bg-slate-700 border border-artisan-border dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedId || parsedQty <= 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-white" />
                  <span>Recording Delivery...</span>
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5 text-white" />
                  <span>Commit Stock-In</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

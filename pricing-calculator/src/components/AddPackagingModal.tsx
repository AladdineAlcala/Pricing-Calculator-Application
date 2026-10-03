import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Box, Search, Plus, Check, AlertTriangle, Tag, Sparkles } from "lucide-react";
import {
  getPackagingList,
  upsertRecipePackaging,
  type Packaging,
} from "@/lib/api";
import { Spinner } from "@/components/ui";
import { useApp } from "@/context/AppContext";

export interface AddPackagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: number;
  onSuccess: () => void;
}

export function AddPackagingModal({
  isOpen,
  onClose,
  recipeId,
  onSuccess,
}: AddPackagingModalProps) {
  const { state } = useApp();
  const currency = state.settings.currency_symbol || "₱";

  const [packagingList, setPackagingList] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [batchQty, setBatchQty] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMsg(null);
      getPackagingList()
        .then((items) => {
          setPackagingList(items);
          if (items.length > 0) {
            setSelectedId(items[0].packaging_id);
          }
        })
        .catch((err) => {
          setErrorMsg(typeof err === "string" ? err : "Failed to load packaging items");
        })
        .finally(() => {
          setLoading(false);
          setTimeout(() => searchInputRef.current?.focus(), 150);
        });
    } else {
      setSearch("");
      setTypeFilter("all");
      setBatchQty(1);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const packagingTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of packagingList) {
      if (p.packaging_type) set.add(p.packaging_type);
    }
    return Array.from(set).sort();
  }, [packagingList]);

  const filteredItems = useMemo(() => {
    return packagingList.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.packaging_code.toLowerCase().includes(search.toLowerCase()) ||
        p.packaging_type.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (typeFilter !== "all" && p.packaging_type !== typeFilter) return false;
      return true;
    });
  }, [packagingList, search, typeFilter]);

  const selectedItem = useMemo(() => {
    return packagingList.find((p) => p.packaging_id === selectedId) || null;
  }, [packagingList, selectedId]);

  const lineItemCost = (selectedItem?.current_unit_cost || 0) * (batchQty || 0);

  const handleStepQty = (delta: number) => {
    setBatchQty((prev) => {
      const next = prev + delta;
      return next <= 0 ? 0.5 : Number(next.toFixed(2));
    });
  };

  const handlePreset = (qty: number) => {
    setBatchQty(qty);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setErrorMsg("Please select a packaging material");
      return;
    }

    if (batchQty <= 0) {
      setErrorMsg("Batch quantity must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await upsertRecipePackaging({
        recipe_id: recipeId,
        packaging_id: selectedId,
        batch_qty: batchQty,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (typeof err === "string") {
        setErrorMsg(err);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to add packaging to recipe");
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
      aria-labelledby="add-packaging-modal-title"
    >
      <div
        className="relative z-10 w-full max-w-xl rounded-3xl border border-stoneBorder dark:border-slate-800 bg-white dark:bg-[#0c101a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stoneBorder/80 dark:border-slate-800/80 bg-flour-100/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-packaging-modal-title" className="text-base font-bold text-espresso-900 dark:text-white">
                Add Recipe Packaging
              </h2>
              <p className="text-xs text-espresso-500 dark:text-slate-400">
                Liners, boxes, containers, and wrappers allocated per batch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-espresso-400 hover:text-espresso-700 dark:text-slate-400 dark:hover:text-white hover:bg-flour-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400 dark:text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search packaging material or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100/50 dark:bg-slate-900/60 text-espresso-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  typeFilter === "all"
                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60"
                    : "text-espresso-500 dark:text-slate-400 hover:text-espresso-800 dark:hover:text-white"
                }`}
              >
                All ({packagingList.length})
              </button>
              {packagingTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    typeFilter === type
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60"
                      : "text-espresso-500 dark:text-slate-400 hover:text-espresso-800 dark:hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Items List */}
            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <Spinner className="w-5 h-5 text-amber-600" />
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-stoneBorder dark:border-slate-800 divide-y divide-stoneBorder/60 dark:divide-slate-800/60 bg-flour-100/30 dark:bg-slate-900/30">
                {filteredItems.map((p) => {
                  const isSelected = p.packaging_id === selectedId;
                  return (
                    <button
                      key={p.packaging_id}
                      type="button"
                      onClick={() => {
                        setSelectedId(p.packaging_id);
                        setErrorMsg(null);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
                          : "hover:bg-flour-100/80 dark:hover:bg-slate-800/40 text-espresso-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40">
                          {p.packaging_code}
                        </span>
                        <span>{p.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-flour-100 dark:bg-slate-800 text-espresso-500 dark:text-slate-400">
                          {p.packaging_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-espresso-900 dark:text-white">
                          {currency}{p.current_unit_cost.toFixed(2)} / {p.unit}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity Controls & Quick Presets */}
          <div className="space-y-2 pt-2 border-t border-stoneBorder dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="pkg-batch-qty-input" className="font-bold text-espresso-800 dark:text-slate-200">
                Batch Allocation ({selectedItem?.unit || "unit"}s per batch)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 6, 12, 24].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      batchQty === preset
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-flour-100 dark:bg-slate-800 text-espresso-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/60"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepQty(-1)}
                className="w-10 h-10 rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-700 dark:text-slate-300 hover:bg-flour-100 dark:hover:bg-slate-800 font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
              >
                -
              </button>
              <input
                id="pkg-batch-qty-input"
                type="number"
                min="0.1"
                step="any"
                value={batchQty}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBatchQty(isNaN(val) ? 0 : val);
                }}
                className="flex-1 px-4 py-2.5 text-center font-mono font-bold text-base rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-900 dark:text-white focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => handleStepQty(1)}
                className="w-10 h-10 rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-700 dark:text-slate-300 hover:bg-flour-100 dark:hover:bg-slate-800 font-bold text-base flex items-center justify-center cursor-pointer transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Real-time Line Cost Hero Preview */}
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block">
                Calculated Line Cost
              </span>
              <span className="font-bold text-espresso-900 dark:text-white">
                {batchQty} {selectedItem?.unit || "unit"}{batchQty > 1 ? "s" : ""} × {currency}
                {(selectedItem?.current_unit_cost || 0).toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-lg">
                {currency}{lineItemCost.toFixed(2)}
              </span>
              <span className="text-[10px] text-espresso-400 dark:text-slate-500 block">
                per batch
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-stoneBorder/80 dark:border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-espresso-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-flour-100 dark:hover:bg-slate-700 border border-stoneBorder dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedId || batchQty <= 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Assign to Recipe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

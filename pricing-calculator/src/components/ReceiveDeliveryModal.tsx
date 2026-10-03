import React, { useState, useEffect, useMemo } from "react";
import { X, Truck, AlertTriangle, Check, Search, PackageCheck } from "lucide-react";
import { getIngredients, receiveInventory, type Ingredient, type InventoryLedgerItem } from "@/lib/api";
import { Spinner } from "@/components/ui";
import { useApp } from "@/context/AppContext";

interface ReceiveDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: InventoryLedgerItem) => void;
  preselectedIngredientId?: number | null;
}

export function ReceiveDeliveryModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedIngredientId,
}: ReceiveDeliveryModalProps) {
  const { state } = useApp();
  const currency = state.settings.currency_symbol || "₱";

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(preselectedIngredientId || null);
  const [addedQty, setAddedQty] = useState<string>("");
  const [newInvoicePrice, setNewInvoicePrice] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingIngredients(true);
      setErrorMsg(null);
      getIngredients()
        .then((items) => {
          setIngredients(items);
          if (preselectedIngredientId) {
            setSelectedId(preselectedIngredientId);
            const found = items.find((i) => i.ingredient_id === preselectedIngredientId);
            if (found) {
              setNewInvoicePrice(found.purchase_price.toString());
            }
          } else if (items.length > 0 && !selectedId) {
            setSelectedId(items[0].ingredient_id);
            setNewInvoicePrice(items[0].purchase_price.toString());
          }
        })
        .catch((err) => {
          setErrorMsg(typeof err === "string" ? err : "Failed to load ingredients catalog");
        })
        .finally(() => {
          setLoadingIngredients(false);
        });
    } else {
      setAddedQty("");
      setSearchFilter("");
      setErrorMsg(null);
    }
  }, [isOpen, preselectedIngredientId]);

  const selectedIngredient = useMemo(() => {
    return ingredients.find((i) => i.ingredient_id === selectedId) || null;
  }, [ingredients, selectedId]);

  const filteredIngredients = useMemo(() => {
    if (!searchFilter.trim()) return ingredients;
    const query = searchFilter.toLowerCase();
    return ingredients.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.purchase_unit.toLowerCase().includes(query)
    );
  }, [ingredients, searchFilter]);

  const handleSelectIngredient = (ing: Ingredient) => {
    setSelectedId(ing.ingredient_id);
    setNewInvoicePrice(ing.purchase_price.toString());
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setErrorMsg("Please select an ingredient");
      return;
    }

    const qty = parseFloat(addedQty);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Quantity received must be a positive number greater than 0");
      return;
    }

    const price = parseFloat(newInvoicePrice);
    if (isNaN(price) || price < 0) {
      setErrorMsg("New invoice price cannot be negative");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const updatedItem = await receiveInventory({
        ingredient_id: selectedId,
        added_qty: qty,
        new_invoice_price: price,
      });
      onSuccess?.(updatedItem);
      onClose();
    } catch (err: unknown) {
      if (typeof err === "string") {
        setErrorMsg(err);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to log inventory intake");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-xl rounded-2xl border border-stoneBorder dark:border-slate-800 bg-white dark:bg-[#0f1422] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stoneBorder dark:border-slate-800 bg-flour-100/50 dark:bg-[#141b2c]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-culinary-100 dark:bg-culinary-950/80 border border-culinary-200 dark:border-culinary-800/80 flex items-center justify-center text-culinary-700 dark:text-culinary-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-espresso-900 dark:text-white">
                Receive Delivery & Update LRC
              </h2>
              <p className="text-xs text-espresso-500 dark:text-slate-400">
                Log physical delivery intake and set active replacement cost basis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-espresso-400 hover:text-espresso-700 dark:text-slate-400 dark:hover:text-white hover:bg-flour-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Ingredient Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-espresso-700 dark:text-slate-300 uppercase tracking-wide">
              Select Bulk Ingredient
            </label>

            {loadingIngredients ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-espresso-500 dark:text-slate-400">
                <Spinner className="w-4 h-4" />
                <span>Loading ingredients...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search ingredient by name or unit..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-900 dark:text-white focus:outline-none focus:border-culinary-500 transition-colors"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100/30 dark:bg-[#141b2c]/30 divide-y divide-stoneBorder dark:divide-slate-800/60">
                  {filteredIngredients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-espresso-400 dark:text-slate-500">
                      No matching ingredients found
                    </div>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isSelected = ing.ingredient_id === selectedId;
                      return (
                        <button
                          key={ing.ingredient_id}
                          type="button"
                          onClick={() => handleSelectIngredient(ing)}
                          className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-culinary-50 dark:bg-culinary-950/60 text-culinary-900 dark:text-culinary-200 font-semibold"
                              : "hover:bg-flour-100 dark:hover:bg-slate-800/60 text-espresso-800 dark:text-slate-200"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{ing.name}</span>
                            <span className="text-[11px] text-espresso-500 dark:text-slate-400">
                              Unit: {ing.purchase_unit} • Current LRC: {currency}{ing.purchase_price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-flour-100 dark:bg-slate-800 text-espresso-700 dark:text-slate-300">
                              Stock: {ing.current_stock_qty || 0}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-culinary-600 dark:text-culinary-400" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Selection Details Card */}
          {selectedIngredient && (
            <div className="p-3 rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100/50 dark:bg-[#141b2c]/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-espresso-400 dark:text-slate-400">Target Item:</span>{" "}
                <span className="font-bold text-espresso-900 dark:text-white">
                  {selectedIngredient.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Unit:{" "}
                  <span className="font-semibold text-espresso-700 dark:text-slate-300">
                    {selectedIngredient.purchase_unit}
                  </span>
                </span>
                <span>
                  Current Stock:{" "}
                  <span className="font-bold text-culinary-700 dark:text-culinary-400 font-mono">
                    {selectedIngredient.current_stock_qty || 0}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Quantities & Pricing Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-espresso-700 dark:text-slate-300 uppercase tracking-wide">
                Quantity Received
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder="0.00"
                  value={addedQty}
                  onChange={(e) => setAddedQty(e.target.value)}
                  className="w-full pl-3.5 pr-20 py-2.5 text-sm font-semibold rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-900 dark:text-white focus:outline-none focus:border-culinary-500 focus:ring-4 focus:ring-culinary-500/10 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-espresso-400 dark:text-slate-500 pointer-events-none truncate max-w-[70px]">
                  {selectedIngredient ? selectedIngredient.purchase_unit : "units"}
                </span>
              </div>
              <p className="text-[11px] text-espresso-400 dark:text-slate-500">
                Adds perpetually to current stock level
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-espresso-700 dark:text-slate-300 uppercase tracking-wide">
                New Invoice Price (LRC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-espresso-400 dark:text-slate-500 pointer-events-none">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={newInvoicePrice}
                  onChange={(e) => setNewInvoicePrice(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-900 dark:text-white focus:outline-none focus:border-culinary-500 focus:ring-4 focus:ring-culinary-500/10 font-mono"
                />
              </div>
              <p className="text-[11px] text-espresso-400 dark:text-slate-500">
                Current cost per {selectedIngredient?.purchase_unit || "bulk unit"}
              </p>
            </div>
          </div>

          {/* LRC Overwrite Warning Callout */}
          <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="leading-relaxed">
              <strong className="font-bold">LRC Inflation Shield:</strong> Updating the invoice price will immediately recalculate the active cost basis of all recipes utilizing this ingredient to protect margins against supplier inflation.
            </div>
          </div>

          {/* Preview Post-Intake Balances */}
          {selectedIngredient && addedQty && !isNaN(parseFloat(addedQty)) && parseFloat(addedQty) > 0 && (
            <div className="p-3 rounded-xl border border-culinary-200 dark:border-culinary-800/80 bg-culinary-50/60 dark:bg-culinary-950/40 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-culinary-600 dark:text-culinary-400" />
                <span className="text-espresso-700 dark:text-slate-300">
                  New Expected Stock:
                </span>
                <span className="font-bold font-mono text-culinary-800 dark:text-culinary-300">
                  {((selectedIngredient.current_stock_qty || 0) + parseFloat(addedQty)).toFixed(2)} {selectedIngredient.purchase_unit}
                </span>
              </div>
              {newInvoicePrice && !isNaN(parseFloat(newInvoicePrice)) && (
                <div className="text-espresso-600 dark:text-slate-400 font-mono">
                  Valuation: {currency}{(((selectedIngredient.current_stock_qty || 0) + parseFloat(addedQty)) * parseFloat(newInvoicePrice)).toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-stoneBorder dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-espresso-700 dark:text-slate-300 hover:bg-flour-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedId || !addedQty}
              className="px-5 py-2 text-xs font-bold text-white bg-culinary-600 hover:bg-culinary-700 active:scale-[0.98] rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-white" />
                  <span>Recording Delivery...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Delivery & Update Pricing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

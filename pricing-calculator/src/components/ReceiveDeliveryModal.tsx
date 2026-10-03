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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0F0F]/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-xl rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DF] bg-[#F9F8F6]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#D97A34]/10 border border-[#D97A34]/20 flex items-center justify-center text-[#D97A34]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F0F0F]">
                Receive Delivery &amp; Update LRC
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Log physical delivery intake and set active replacement cost basis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Ingredient Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
              Select Bulk Ingredient
            </label>

            {loadingIngredients ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-[#6B6B6B]">
                <Spinner className="w-4 h-4 text-[#D97A34]" />
                <span>Loading ingredients...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search ingredient by name or unit..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] transition-colors"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-[#E5E3DF] bg-[#F9F8F6] divide-y divide-[#E5E3DF]">
                  {filteredIngredients.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[#6B6B6B]">
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
                              ? "bg-[#D97A34]/10 text-[#0F0F0F] font-bold"
                              : "hover:bg-white text-[#0F0F0F]"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{ing.name}</span>
                            <span className="text-[11px] text-[#6B6B6B] font-mono">
                              Unit: {ing.purchase_unit} • Current LRC: {currency}{ing.purchase_price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#E5E3DF] text-[#0F0F0F]">
                              Stock: {ing.current_stock_qty || 0}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-[#D97A34]" />}
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
            <div className="p-3 rounded-lg border border-[#E5E3DF] bg-[#F9F8F6] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#6B6B6B]">Target Item:</span>{" "}
                <span className="font-bold text-[#0F0F0F]">
                  {selectedIngredient.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Unit:{" "}
                  <span className="font-semibold text-[#0F0F0F]">
                    {selectedIngredient.purchase_unit}
                  </span>
                </span>
                <span>
                  Current Stock:{" "}
                  <span className="font-bold text-[#4A7C59] font-mono">
                    {selectedIngredient.current_stock_qty || 0}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Quantities & Pricing Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
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
                  className="w-full pl-3.5 pr-20 py-2.5 text-sm font-semibold rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6B6B6B] pointer-events-none truncate max-w-[70px]">
                  {selectedIngredient ? selectedIngredient.purchase_unit : "units"}
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B6B]">
                Adds perpetually to current stock level
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
                New Invoice Price (LRC)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B6B6B] pointer-events-none">
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
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-mono"
                />
              </div>
              <p className="text-[11px] text-[#6B6B6B]">
                Current cost per {selectedIngredient?.purchase_unit || "bulk unit"}
              </p>
            </div>
          </div>

          {/* LRC Overwrite Warning Callout */}
          <div className="p-3.5 rounded-lg border border-[#D97A34]/30 bg-[#D97A34]/5 text-[#0F0F0F] text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97A34]" />
            <div className="leading-relaxed">
              <strong className="font-bold text-[#0F0F0F]">LRC Inflation Shield:</strong> Updating the invoice price will immediately recalculate the active cost basis of all recipes utilizing this ingredient to protect margins against supplier inflation.
            </div>
          </div>

          {/* Preview Post-Intake Balances */}
          {selectedIngredient && addedQty && !isNaN(parseFloat(addedQty)) && parseFloat(addedQty) > 0 && (
            <div className="p-3 rounded-lg border border-[#E5E3DF] bg-[#F9F8F6] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-[#4A7C59]" />
                <span className="text-[#6B6B6B]">
                  New Expected Stock:
                </span>
                <span className="font-bold font-mono text-[#4A7C59]">
                  {((selectedIngredient.current_stock_qty || 0) + parseFloat(addedQty)).toFixed(2)} {selectedIngredient.purchase_unit}
                </span>
              </div>
              {newInvoicePrice && !isNaN(parseFloat(newInvoicePrice)) && (
                <div className="text-[#6B6B6B] font-mono">
                  Valuation: {currency}{(((selectedIngredient.current_stock_qty || 0) + parseFloat(addedQty)) * parseFloat(newInvoicePrice)).toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-[#E5E3DF] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#0F0F0F] border border-[#0F0F0F] hover:bg-[#0F0F0F]/5 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedId || !addedQty}
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-white" />
                  <span>Recording Delivery...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Delivery &amp; Update Pricing</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

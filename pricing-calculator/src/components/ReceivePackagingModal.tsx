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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0F0F]/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="packaging-delivery-modal-title"
    >
      <div
        className="relative z-10 w-full max-w-xl rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DF] bg-[#F9F8F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D97A34]/10 border border-[#D97A34]/20 flex items-center justify-center text-[#D97A34] shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 id="packaging-delivery-modal-title" className="text-base font-bold text-[#0F0F0F]">
                Receive Packaging Delivery
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Stock intake for bakery containers, boxes, liners, and sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Selector / Search */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0F0F0F] flex items-center justify-between">
              <span>Select Packaging Material</span>
              <span className="text-[11px] font-normal text-[#6B6B6B]">
                {filteredItems.length} available
              </span>
            </label>

            {loading ? (
              <div className="py-6 flex items-center justify-center">
                <Spinner className="w-5 h-5 text-[#D97A34]" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
                  <input
                    type="text"
                    placeholder="Search packaging code or name..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34]"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-lg border border-[#E5E3DF] divide-y divide-[#E5E3DF] bg-[#F9F8F6]">
                  {filteredItems.map((p) => {
                    const isSelected = p.packaging_id === selectedId;
                    return (
                      <button
                        key={p.packaging_id}
                        type="button"
                        onClick={() => handleSelectPackaging(p)}
                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#D97A34]/10 text-[#0F0F0F] font-bold"
                            : "hover:bg-white text-[#0F0F0F]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-white text-[#0F0F0F] font-bold border border-[#E5E3DF]">
                            {p.packaging_code}
                          </span>
                          <span>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#6B6B6B]">
                            {p.current_stock_qty} {p.unit}s on hand
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#D97A34]" />}
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
            <div className="p-3 rounded-lg border border-[#E5E3DF] bg-[#F9F8F6] flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-[#0F0F0F]">
                  {selectedPackaging.name}
                </span>
                <p className="text-[11px] text-[#6B6B6B]">
                  Type: {selectedPackaging.packaging_type} · Unit: {selectedPackaging.unit}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#6B6B6B] block font-medium">
                  Current Stock
                </span>
                <span className="font-mono font-bold text-[#4A7C59] text-sm">
                  {selectedPackaging.current_stock_qty} {selectedPackaging.unit}s
                </span>
              </div>
            </div>
          )}

          {/* Input Grid: Quantity + Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="pkg-added-qty" className="text-xs font-bold text-[#0F0F0F]">
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
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pkg-unit-cost" className="text-xs font-bold text-[#0F0F0F]">
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
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34]"
                required
              />
            </div>
          </div>

          {/* Real-time Calculation Hero Banner */}
          <div className="p-4 rounded-lg border border-[#E5E3DF] bg-[#F9F8F6] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-[#4A7C59]" />
              <span className="font-semibold text-[#6B6B6B]">
                Total Invoice Value:
              </span>
            </div>
            <span className="font-mono font-bold text-[#4A7C59] text-base">
              {currency}{totalInvoiceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 border-t border-[#E5E3DF] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#0F0F0F] bg-transparent hover:bg-[#0F0F0F]/5 border border-[#0F0F0F] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedId || parsedQty <= 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Boxes,
  Truck,
  AlertTriangle,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  ShieldCheck,
  Package,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { getInventoryLedger, type InventoryLedgerItem } from "@/lib/api";
import { Header } from "@/components/Header";
import { ReceiveDeliveryModal } from "@/components/ReceiveDeliveryModal";
import { Spinner } from "@/components/ui";
import { useApp } from "@/context/AppContext";

export default function Inventory() {
  const { state } = useApp();
  const currency = state.settings.currency_symbol || "₱";

  const [ledger, setLedger] = useState<InventoryLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "healthy">("all");
  const [sortBy, setSortBy] = useState<"status" | "name" | "stock" | "value">("status");
  const [sortAsc, setSortAsc] = useState(false);

  // Delivery Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventoryLedger();
      setLedger(data);
    } catch (err: unknown) {
      if (typeof err === "string") {
        setError(err);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load inventory ledger");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Aggregate Executive KPIs
  const kpis = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    for (const item of ledger) {
      totalValue += item.total_value;
      if (item.is_low_stock) {
        lowStockCount++;
      }
    }
    return {
      totalValue,
      lowStockCount,
      totalCount: ledger.length,
    };
  }, [ledger]);

  const unpricedCount = useMemo(
    () => ledger.filter((i) => i.purchase_price <= 0).length,
    [ledger]
  );

  // Filtered & Sorted Ledger Items
  const displayedItems = useMemo(() => {
    let result = ledger.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.purchase_unit.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === "low") return item.is_low_stock;
      if (statusFilter === "healthy") return !item.is_low_stock;
      return true;
    });

    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === "status") {
        // Low stock first by default
        comp = (a.is_low_stock === b.is_low_stock ? 0 : a.is_low_stock ? -1 : 1);
        if (comp === 0) comp = a.name.localeCompare(b.name);
      } else if (sortBy === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === "stock") {
        comp = a.current_stock_qty - b.current_stock_qty;
      } else if (sortBy === "value") {
        comp = a.total_value - b.total_value;
      }
      return sortAsc ? comp : -comp;
    });

    return result;
  }, [ledger, search, statusFilter, sortBy, sortAsc]);

  const handleOpenReceiveModal = (ingredientId?: number) => {
    setSelectedIngredientId(ingredientId || null);
    setModalOpen(true);
  };

  const handleDeliverySuccess = (updatedItem: InventoryLedgerItem) => {
    loadLedger();
    setToastMessage(
      `Delivery recorded! ${updatedItem.name} stock incremented to ${updatedItem.current_stock_qty} ${updatedItem.purchase_unit}. Active LRC price updated to ${currency}${updatedItem.purchase_price.toFixed(2)}.`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-artisan-canvas dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 transition-colors">
      <Header unpricedCount={unpricedCount} />
      <main className="flex-1 p-6 md:p-8 space-y-6 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-culinary-600 dark:text-culinary-400 uppercase tracking-widest">
                Perpetual Stock & Cost Control
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-culinary-100 dark:bg-culinary-950/80 text-culinary-800 dark:text-culinary-300 font-bold border border-culinary-200 dark:border-culinary-800">
                LRC Mode Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-espresso-900 dark:text-white tracking-tight mt-1">
              Inventory Ledger
            </h1>
            <p className="text-xs md:text-sm text-espresso-500 dark:text-slate-400 mt-1">
              Physical bulk ledger decoupled from recipe margins with automatic inflation protection
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadLedger()}
              disabled={loading}
              className="p-2.5 rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#141b2c] text-espresso-600 dark:text-slate-300 hover:bg-artisan-subtle dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => handleOpenReceiveModal()}
              className="px-4 py-2.5 rounded-xl bg-culinary-600 hover:bg-culinary-700 active:scale-[0.98] text-white font-bold text-xs shadow-artisan-glow flex items-center gap-2 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>+ Receive Delivery</span>
            </button>
          </div>
        </div>

        {/* Success Toast Banner */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-500 hover:text-emerald-800 dark:hover:text-white ml-2 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadLedger()}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Executive KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Inventory Value */}
          <div className="p-5 rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0f1422] shadow-artisan-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-espresso-500 dark:text-slate-400 uppercase tracking-wider">
                Total Inventory Value
              </span>
              <div className="w-8 h-8 rounded-xl bg-culinary-100 dark:bg-culinary-950/80 border border-culinary-200 dark:border-culinary-800 flex items-center justify-center text-culinary-700 dark:text-culinary-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-espresso-900 dark:text-white font-mono tabular-nums tracking-tight">
                {currency}{kpis.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-espresso-400 dark:text-slate-500 mt-1">
                Capital tied up in raw bakery stock
              </p>
            </div>
          </div>

          {/* KPI 2: Low Stock Alerts */}
          <div
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-artisan-subtle ${
              kpis.lowStockCount > 0
                ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30"
                : "border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0f1422]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-espresso-500 dark:text-slate-400 uppercase tracking-wider">
                Low Stock Alerts
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  kpis.lowStockCount > 0
                    ? "bg-rose-200 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div
                className={`text-2xl font-black font-mono tabular-nums tracking-tight ${
                  kpis.lowStockCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {kpis.lowStockCount}
              </div>
              <p className="text-[11px] text-espresso-400 dark:text-slate-500 mt-1">
                {kpis.lowStockCount > 0 ? "Items at or below reorder floor" : "All tracked stock levels healthy"}
              </p>
            </div>
          </div>

          {/* KPI 3: Monitored Bulk Items */}
          <div className="p-5 rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0f1422] shadow-artisan-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-espresso-500 dark:text-slate-400 uppercase tracking-wider">
                Tracked Bulk Items
              </span>
              <div className="w-8 h-8 rounded-xl bg-artisan-subtle dark:bg-slate-800 flex items-center justify-center text-espresso-600 dark:text-slate-300">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-espresso-900 dark:text-white font-mono tabular-nums tracking-tight">
                {kpis.totalCount}
              </div>
              <p className="text-[11px] text-espresso-400 dark:text-slate-500 mt-1">
                Active catalog commodities
              </p>
            </div>
          </div>

          {/* KPI 4: LRC Inflation Shield */}
          <div className="p-5 rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0f1422] shadow-artisan-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-espresso-500 dark:text-slate-400 uppercase tracking-wider">
                LRC Margin Guard
              </span>
              <div className="w-8 h-8 rounded-xl bg-culinary-100 dark:bg-culinary-950/80 text-culinary-700 dark:text-culinary-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 text-sm font-bold text-culinary-700 dark:text-culinary-400">
                <span className="w-2 h-2 rounded-full bg-culinary-500 animate-pulse" />
                <span>Replacement Cost</span>
              </div>
              <p className="text-[11px] text-espresso-400 dark:text-slate-500 mt-1">
                Zero margin lag on supplier price hikes
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0f1422]">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-espresso-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ingredient, package, or bulk unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-artisan-border dark:border-slate-800 bg-artisan-canvas dark:bg-[#141b2c] text-espresso-900 dark:text-white placeholder:text-espresso-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-culinary-500"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-artisan-canvas dark:bg-[#141b2c] p-1 rounded-xl border border-artisan-border dark:border-slate-800 shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-artisan-surface dark:bg-slate-800 text-espresso-900 dark:text-white shadow-xs"
                  : "text-espresso-500 dark:text-slate-400 hover:text-espresso-800 dark:hover:text-white"
              }`}
            >
              All ({ledger.length})
            </button>
            <button
              onClick={() => setStatusFilter("low")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "low"
                  ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 shadow-xs font-bold"
                  : "text-espresso-500 dark:text-slate-400 hover:text-rose-600"
              }`}
            >
              <span>⚠️ Low Stock</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                {kpis.lowStockCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("healthy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "healthy"
                  ? "bg-artisan-surface dark:bg-slate-800 text-espresso-900 dark:text-white shadow-xs"
                  : "text-espresso-500 dark:text-slate-400 hover:text-espresso-800 dark:hover:text-white"
              }`}
            >
              Healthy
            </button>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="rounded-2xl border border-artisan-border dark:border-slate-800 bg-artisan-surface dark:bg-[#0f1422] shadow-artisan-subtle overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-espresso-400 dark:text-slate-500">
              <Spinner className="w-8 h-8 text-culinary-600" />
              <span className="text-xs font-semibold">Loading perpetual inventory ledger...</span>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-artisan-subtle dark:bg-slate-800 flex items-center justify-center text-espresso-400 dark:text-slate-500 mb-3">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-espresso-800 dark:text-slate-200">
                No inventory records found
              </h3>
              <p className="text-xs text-espresso-400 dark:text-slate-500 max-w-sm mt-1">
                {search ? "No items match your search filter." : "Start by receiving deliveries to track perpetual stock."}
              </p>
              <button
                onClick={() => handleOpenReceiveModal()}
                className="mt-4 px-4 py-2 rounded-xl bg-culinary-600 text-white font-bold text-xs hover:bg-culinary-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Receive Initial Stock</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-[#141b2c]/50 text-espresso-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSortBy("name");
                          setSortAsc(!sortAsc);
                        }}
                        className="flex items-center gap-1 hover:text-espresso-900 dark:hover:text-white cursor-pointer"
                      >
                        <span>Ingredient & Unit</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSortBy("stock");
                          setSortAsc(!sortAsc);
                        }}
                        className="flex items-center gap-1 hover:text-espresso-900 dark:hover:text-white cursor-pointer"
                      >
                        <span>Current Stock</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4">Reorder Floor</th>
                    <th className="py-3 px-4">Active LRC Price</th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSortBy("value");
                          setSortAsc(!sortAsc);
                        }}
                        className="flex items-center gap-1 hover:text-espresso-900 dark:hover:text-white cursor-pointer"
                      >
                        <span>Tied Capital</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSortBy("status");
                          setSortAsc(!sortAsc);
                        }}
                        className="flex items-center gap-1 hover:text-espresso-900 dark:hover:text-white cursor-pointer"
                      >
                        <span>Status</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-artisan-border dark:divide-slate-800/60">
                  {displayedItems.map((item) => (
                    <tr
                      key={item.ingredient_id}
                      className={`transition-colors ${
                        item.is_low_stock
                          ? "bg-rose-50/70 dark:bg-rose-950/25 hover:bg-rose-100/70 dark:hover:bg-rose-900/30"
                          : "hover:bg-artisan-canvas/50 dark:hover:bg-[#141b2c]/50"
                      }`}
                    >
                      {/* Name & Unit */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-espresso-900 dark:text-white text-sm">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-espresso-400 dark:text-slate-400 font-mono">
                            Bulk Packaging: {item.purchase_unit}
                          </span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-1.5 font-mono">
                          <span
                            className={`text-sm font-bold ${
                              item.is_low_stock
                                ? "text-rose-700 dark:text-rose-400 font-black"
                                : "text-espresso-900 dark:text-white"
                            }`}
                          >
                            {item.current_stock_qty.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-espresso-400 dark:text-slate-500 font-sans">
                            {item.purchase_unit}
                          </span>
                        </div>
                      </td>

                      {/* Reorder Floor */}
                      <td className="py-3 px-4 font-mono text-espresso-600 dark:text-slate-300">
                        {item.reorder_threshold.toFixed(2)} {item.purchase_unit}
                      </td>

                      {/* Active LRC Price */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-espresso-900 dark:text-white">
                          {currency}{item.purchase_price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-espresso-400 dark:text-slate-500 block">
                          per {item.purchase_unit}
                        </span>
                      </td>

                      {/* Total Tied Capital */}
                      <td className="py-3 px-4 font-mono font-bold text-espresso-900 dark:text-white">
                        {currency}{item.total_value.toFixed(2)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {item.is_low_stock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                            <span>⚠️ LOW STOCK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>✓ In Stock</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReceiveModal(item.ingredient_id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            item.is_low_stock
                              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                              : "bg-culinary-50 dark:bg-culinary-950/60 text-culinary-800 dark:text-culinary-300 hover:bg-culinary-100 dark:hover:bg-culinary-900/60 border border-culinary-200 dark:border-culinary-800"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Receive</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Table Footer & Status Telemetry ── */}
          {!loading && displayedItems.length > 0 && (
            <div className="p-4 border-t border-artisan-border dark:border-slate-800 bg-artisan-canvas/50 dark:bg-[#141b2c]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-espresso-500 dark:text-slate-400">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Showing <strong className="text-espresso-900 dark:text-white font-bold">{displayedItems.length}</strong> of{" "}
                  <strong className="text-espresso-900 dark:text-white font-bold">{ledger.length}</strong> tracked commodities
                </span>
                {statusFilter !== "all" && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-culinary-700 dark:text-culinary-400">
                      Filter: {statusFilter === "low" ? "Low Stock Only" : "Healthy Stock Only"}
                    </span>
                  </>
                )}
                {kpis.lowStockCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {kpis.lowStockCount} require attention
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-espresso-400 dark:text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-culinary-500 animate-pulse" />
                <span>Perpetual FIFO Ledger • Real-time SQLite Sync</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Receive Delivery Modal Instance */}
      <ReceiveDeliveryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleDeliverySuccess}
        preselectedIngredientId={selectedIngredientId}
      />
    </div>
  );
}

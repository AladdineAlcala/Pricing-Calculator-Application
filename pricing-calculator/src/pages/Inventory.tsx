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
  Box,
  Tag,
} from "lucide-react";
import {
  getInventoryLedger,
  getPackagingInventoryLedger,
  type InventoryLedgerItem,
  type PackagingLedgerItem,
} from "@/lib/api";
import { Header } from "@/components/Header";
import { ReceiveDeliveryModal } from "@/components/ReceiveDeliveryModal";
import { ReceivePackagingModal } from "@/components/ReceivePackagingModal";
import { Spinner } from "@/components/ui";
import { useApp } from "@/context/AppContext";

export default function Inventory() {
  const { state } = useApp();
  const currency = state.settings.currency_symbol || "₱";

  // Tab State: Ingredients vs Packaging
  const [activeTab, setActiveTab] = useState<"ingredients" | "packaging">("ingredients");

  // Ingredients Ledger State
  const [ledger, setLedger] = useState<InventoryLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Packaging Ledger State
  const [packagingLedger, setPackagingLedger] = useState<PackagingLedgerItem[]>([]);
  const [packagingLoading, setPackagingLoading] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "healthy">("all");
  const [pkgTypeFilter, setPkgTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"status" | "name" | "stock" | "value">("status");
  const [sortAsc, setSortAsc] = useState(false);

  // Delivery Modal States
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);

  const [packagingModalOpen, setPackagingModalOpen] = useState(false);
  const [selectedPackagingId, setSelectedPackagingId] = useState<number | null>(null);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadLedgers = useCallback(async () => {
    setLoading(true);
    setPackagingLoading(true);
    setError(null);
    try {
      const [ingData, pkgData] = await Promise.all([
        getInventoryLedger().catch(() => []),
        getPackagingInventoryLedger().catch(() => []),
      ]);
      setLedger(Array.isArray(ingData) ? ingData : []);
      setPackagingLedger(Array.isArray(pkgData) ? pkgData : []);
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
      setPackagingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedgers();
  }, [loadLedgers]);

  // Aggregate Executive KPIs for Ingredients
  const ingredientKpis = useMemo(() => {
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

  // Aggregate Executive KPIs for Packaging
  const packagingKpis = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    for (const item of packagingLedger) {
      totalValue += item.total_value;
      if (item.is_low_stock) {
        lowStockCount++;
      }
    }
    return {
      totalValue,
      lowStockCount,
      totalCount: packagingLedger.length,
    };
  }, [packagingLedger]);

  const activeKpis = activeTab === "ingredients" ? ingredientKpis : packagingKpis;

  const unpricedCount = useMemo(
    () => ledger.filter((i) => i.purchase_price <= 0).length,
    [ledger]
  );

  // Distinct Packaging Types for Filter Pills
  const packagingTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of packagingLedger) {
      if (p.packaging_type) set.add(p.packaging_type);
    }
    return Array.from(set).sort();
  }, [packagingLedger]);

  // Filtered & Sorted Ingredient Items
  const displayedIngredientItems = useMemo(() => {
    const result = ledger.filter((item) => {
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
        comp = a.is_low_stock === b.is_low_stock ? 0 : a.is_low_stock ? -1 : 1;
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

  // Filtered & Sorted Packaging Items
  const displayedPackagingItems = useMemo(() => {
    const result = packagingLedger.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.packaging_code.toLowerCase().includes(search.toLowerCase()) ||
        item.packaging_type.toLowerCase().includes(search.toLowerCase()) ||
        item.unit.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (pkgTypeFilter !== "all" && item.packaging_type !== pkgTypeFilter) return false;
      if (statusFilter === "low") return item.is_low_stock;
      if (statusFilter === "healthy") return !item.is_low_stock;
      return true;
    });

    result.sort((a, b) => {
      let comp = 0;
      if (sortBy === "status") {
        comp = a.is_low_stock === b.is_low_stock ? 0 : a.is_low_stock ? -1 : 1;
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
  }, [packagingLedger, search, statusFilter, pkgTypeFilter, sortBy, sortAsc]);

  const handleOpenReceiveModal = (ingredientId?: number) => {
    setSelectedIngredientId(ingredientId || null);
    setDeliveryModalOpen(true);
  };

  const handleOpenPackagingModal = (packagingId?: number) => {
    setSelectedPackagingId(packagingId || null);
    setPackagingModalOpen(true);
  };

  const handleDeliverySuccess = (updatedItem: InventoryLedgerItem) => {
    loadLedgers();
    setToastMessage(
      `Delivery recorded! ${updatedItem.name} stock incremented to ${updatedItem.current_stock_qty} ${updatedItem.purchase_unit}. Active LRC price updated to ${currency}${updatedItem.purchase_price.toFixed(2)}.`
    );
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handlePackagingSuccess = () => {
    loadLedgers();
    setToastMessage("Packaging delivery recorded! Inventory ledger updated.");
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F] transition-colors">
      <Header unpricedCount={unpricedCount} />
      <main className="flex-1 p-6 md:p-8 space-y-6 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#D97A34] uppercase tracking-widest">
                Perpetual Stock &amp; Cost Control
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4A7C59]/10 text-[#4A7C59] font-bold border border-[#4A7C59]/20">
                {activeTab === "ingredients" ? "LRC Mode Active" : "Discrete Unit Tracking"}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0F0F0F] tracking-tight mt-2">
              Inventory Ledger
            </h1>
            <p className="text-xs md:text-sm text-[#6B6B6B] mt-1">
              {activeTab === "ingredients"
                ? "Physical bulk ingredients decoupled from recipe margins with automatic inflation protection"
                : "Bakery packaging materials, boxes, liners, and containers tracked in discrete units"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadLedgers()}
              disabled={loading || packagingLoading}
              className="p-2.5 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] hover:bg-[#F9F8F6] transition-colors cursor-pointer"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${loading || packagingLoading ? "animate-spin" : ""}`} />
            </button>

            {activeTab === "ingredients" ? (
              <button
                onClick={() => handleOpenReceiveModal()}
                className="px-6 py-3 rounded-lg bg-[#D97A34] hover:bg-[#c26827] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>+ Receive Delivery</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenPackagingModal()}
                className="px-6 py-3 rounded-lg bg-[#D97A34] hover:bg-[#c26827] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Box className="w-4 h-4" />
                <span>+ Receive Packaging</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ── */}
        <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-[#E5E3DF] w-fit shadow-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab("ingredients");
              setSearch("");
              setStatusFilter("all");
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ingredients"
                ? "bg-[#0F0F0F] text-white shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0F0F0F]"
            }`}
          >
            <Layers className="w-4 h-4 text-[#D97A34]" />
            <span>Ingredients Catalog</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "ingredients" ? "bg-white/20 text-white" : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF]"
            }`}>
              {ledger.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("packaging");
              setSearch("");
              setStatusFilter("all");
            }}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "packaging"
                ? "bg-[#0F0F0F] text-white shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0F0F0F]"
            }`}
          >
            <Box className="w-4 h-4 text-[#D97A34]" />
            <span>Packaging Materials</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "packaging" ? "bg-white/20 text-white" : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF]"
            }`}>
              {packagingLedger.length}
            </span>
          </button>
        </div>

        {/* Success Toast Banner */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-white border border-[#4A7C59]/30 text-[#4A7C59] text-xs flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.05)] animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#4A7C59] shrink-0" />
              <span className="font-semibold text-[#0F0F0F]">{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#6B6B6B] hover:text-[#0F0F0F] ml-2 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadLedgers()}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Executive Bento Box KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Inventory Value */}
          <div className="p-6 rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                {activeTab === "ingredients" ? "Ingredient Value" : "Packaging Value"}
              </span>
              <div className="w-9 h-9 rounded-lg bg-[#D97A34]/10 flex items-center justify-center text-[#D97A34]">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-[#0F0F0F] font-mono tracking-tight">
                {currency}
                {activeKpis.totalValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[11px] text-[#6B6B6B] mt-1">
                {activeTab === "ingredients"
                  ? "Capital tied up in raw bakery stock"
                  : "Capital invested in containers, boxes, and liners"}
              </p>
            </div>
          </div>

          {/* KPI 2: Low Stock Alerts */}
          <div
            className={`p-6 rounded-2xl border transition-all flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.05)] ${
              activeKpis.lowStockCount > 0
                ? "border-rose-300 bg-rose-50/50"
                : "border-[#E5E3DF] bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                Low Stock Alerts
              </span>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeKpis.lowStockCount > 0
                    ? "bg-rose-100 text-rose-600"
                    : "bg-[#4A7C59]/10 text-[#4A7C59]"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div
                className={`text-3xl font-bold font-mono tracking-tight ${
                  activeKpis.lowStockCount > 0
                    ? "text-rose-600"
                    : "text-[#4A7C59]"
                }`}
              >
                {activeKpis.lowStockCount}
              </div>
              <p className="text-[11px] text-[#6B6B6B] mt-1">
                {activeKpis.lowStockCount > 0
                  ? "Items at or below reorder floor"
                  : "All tracked inventory levels healthy"}
              </p>
            </div>
          </div>

          {/* KPI 3: Tracked Items */}
          <div className="p-6 rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                {activeTab === "ingredients" ? "Tracked Ingredients" : "Tracked Packaging"}
              </span>
              <div className="w-9 h-9 rounded-lg bg-[#0F0F0F]/5 flex items-center justify-center text-[#0F0F0F]">
                {activeTab === "ingredients" ? (
                  <Boxes className="w-5 h-5" />
                ) : (
                  <Box className="w-5 h-5" />
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-[#0F0F0F] font-mono tracking-tight">
                {activeKpis.totalCount}
              </div>
              <p className="text-[11px] text-[#6B6B6B] mt-1">
                {activeTab === "ingredients"
                  ? "Active commodities in bakery catalog"
                  : "Active packaging SKU configurations"}
              </p>
            </div>
          </div>

          {/* KPI 4: Invariant Guard */}
          <div className="p-6 rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                {activeTab === "ingredients" ? "LRC Margin Guard" : "Perpetual Audit"}
              </span>
              <div className="w-9 h-9 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#4A7C59]">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
                <span>{activeTab === "ingredients" ? "Replacement Cost" : "Atomic Ledger"}</span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] mt-1">
                {activeTab === "ingredients"
                  ? "Zero margin lag on supplier price hikes"
                  : "Audit trails on stock-in & production stock-out"}
              </p>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#E5E3DF] bg-white shadow-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === "ingredients"
                  ? "Search ingredient, package, or bulk unit..."
                  : "Search packaging code, name, or container type..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34]"
            />
          </div>

          {/* Type Filter for Packaging */}
          {activeTab === "packaging" && packagingTypes.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
              <button
                type="button"
                onClick={() => setPkgTypeFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  pkgTypeFilter === "all"
                    ? "bg-[#0F0F0F] text-white"
                    : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF] hover:text-[#0F0F0F]"
                }`}
              >
                All Types
              </button>
              {packagingTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPkgTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    pkgTypeFilter === type
                      ? "bg-[#0F0F0F] text-white"
                      : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF] hover:text-[#0F0F0F]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-[#0F0F0F] text-white"
                  : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF] hover:text-[#0F0F0F]"
              }`}
            >
              All ({activeTab === "ingredients" ? ledger.length : packagingLedger.length})
            </button>
            <button
              onClick={() => setStatusFilter("low")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "low"
                  ? "bg-rose-600 text-white font-bold"
                  : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF] hover:text-rose-600"
              }`}
            >
              <span>⚠️ Low Stock</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                statusFilter === "low" ? "bg-white text-rose-600" : "bg-rose-100 text-rose-700"
              }`}>
                {activeKpis.lowStockCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("healthy")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "healthy"
                  ? "bg-[#0F0F0F] text-white"
                  : "bg-[#F9F8F6] text-[#6B6B6B] border border-[#E5E3DF] hover:text-[#0F0F0F]"
              }`}
            >
              Healthy
            </button>
          </div>
        </div>

        {/* ── Data Grid: Ingredients or Packaging ── */}
        {activeTab === "ingredients" ? (
          <div className="rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#6B6B6B]">
                <Spinner className="w-8 h-8 text-[#D97A34]" />
                <span className="text-xs font-semibold">Loading perpetual inventory ledger...</span>
              </div>
            ) : displayedIngredientItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF] flex items-center justify-center text-[#6B6B6B] mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#0F0F0F]">
                  No inventory records found
                </h3>
                <p className="text-xs text-[#6B6B6B] max-w-sm mt-1">
                  {search
                    ? "No items match your search filter."
                    : "Start by receiving deliveries to track perpetual stock."}
                </p>
                <button
                  onClick={() => handleOpenReceiveModal()}
                  className="mt-4 px-6 py-2.5 rounded-lg bg-[#D97A34] text-white font-bold text-xs hover:bg-[#c26827] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Receive Initial Stock</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[#6B6B6B] font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSortBy("name");
                            setSortAsc(!sortAsc);
                          }}
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
                        >
                          <span>Ingredient &amp; Unit</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSortBy("stock");
                            setSortAsc(!sortAsc);
                          }}
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
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
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
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
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
                        >
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DF]">
                    {displayedIngredientItems.map((item) => (
                      <tr
                        key={item.ingredient_id}
                        className={`min-h-[48px] h-12 transition-colors ${
                          item.is_low_stock
                            ? "bg-rose-50/50 hover:bg-rose-100/50"
                            : "even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0F0F0F] text-sm">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-[#6B6B6B] font-mono">
                              Bulk Packaging: {item.purchase_unit}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-baseline gap-1.5 font-mono">
                            <span
                              className={`text-sm font-bold ${
                                item.is_low_stock
                                  ? "text-rose-600 font-bold"
                                  : "text-[#0F0F0F]"
                              }`}
                            >
                              {item.current_stock_qty.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-[#6B6B6B] font-sans">
                              {item.purchase_unit}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[#0F0F0F]">
                          {item.reorder_threshold.toFixed(2)} {item.purchase_unit}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#0F0F0F]">
                            {currency}{item.purchase_price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#6B6B6B] block">
                            per {item.purchase_unit}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-[#4A7C59]">
                          {currency}{item.total_value.toFixed(2)}
                        </td>

                        <td className="py-3 px-4">
                          {item.is_low_stock ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <span>⚠️ LOW STOCK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                              <span>✓ In Stock</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(item.ingredient_id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              item.is_low_stock
                                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                                : "bg-white text-[#0F0F0F] hover:text-[#D97A34] hover:border-[#D97A34] border border-[#E5E3DF]"
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

            {!loading && displayedIngredientItems.length > 0 && (
              <div className="p-4 border-t border-[#E5E3DF] bg-[#F9F8F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B6B6B]">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>
                    Showing <strong className="text-[#0F0F0F] font-mono font-bold">{displayedIngredientItems.length}</strong> of{" "}
                    <strong className="text-[#0F0F0F] font-mono font-bold">{ledger.length}</strong> commodities
                  </span>
                  {statusFilter !== "all" && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-[#D97A34]">
                        Filter: {statusFilter === "low" ? "Low Stock Only" : "Healthy Stock Only"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Packaging Materials Ledger Table ── */
          <div className="rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            {packagingLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#6B6B6B]">
                <Spinner className="w-8 h-8 text-[#D97A34]" />
                <span className="text-xs font-semibold">Loading packaging materials ledger...</span>
              </div>
            ) : displayedPackagingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#F9F8F6] border border-[#E5E3DF] flex items-center justify-center text-[#6B6B6B] mb-3">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#0F0F0F]">
                  No packaging materials found
                </h3>
                <p className="text-xs text-[#6B6B6B] max-w-sm mt-1">
                  {search
                    ? "No packaging materials match your search."
                    : "Track containers, clamshells, boxes, and liners in discrete inventory units."}
                </p>
                <button
                  onClick={() => handleOpenPackagingModal()}
                  className="mt-4 px-6 py-2.5 rounded-lg bg-[#D97A34] text-white font-bold text-xs hover:bg-[#c26827] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Receive Initial Packaging</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[#6B6B6B] font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSortBy("name");
                            setSortAsc(!sortAsc);
                          }}
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
                        >
                          <span>Packaging Material &amp; Code</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSortBy("stock");
                            setSortAsc(!sortAsc);
                          }}
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
                        >
                          <span>Stock on Hand</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">Reorder Floor</th>
                      <th className="py-3 px-4">Unit Cost</th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSortBy("value");
                            setSortAsc(!sortAsc);
                          }}
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
                        >
                          <span>Total Asset Value</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSortBy("status");
                            setSortAsc(!sortAsc);
                          }}
                          className="flex items-center gap-1 hover:text-[#0F0F0F] cursor-pointer"
                        >
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DF]">
                    {displayedPackagingItems.map((item) => (
                      <tr
                        key={item.packaging_id}
                        className={`min-h-[48px] h-12 transition-colors ${
                          item.is_low_stock
                            ? "bg-rose-50/50 hover:bg-rose-100/50"
                            : "even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80"
                        }`}
                      >
                        {/* Name & Code */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0F0F0F] text-sm">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-[#6B6B6B] font-mono">
                              SKU: {item.packaging_code}
                            </span>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F]">
                            <Tag className="w-3 h-3 text-[#D97A34]" />
                            <span>{item.packaging_type}</span>
                          </span>
                        </td>

                        {/* Stock on Hand with Living Status Aura */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {item.is_low_stock ? (
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-[#4A7C59] shrink-0" />
                            )}
                            <div className="flex items-baseline gap-1 font-mono">
                              <span
                                className={`text-sm font-bold ${
                                  item.is_low_stock
                                    ? "text-rose-600 font-bold"
                                    : "text-[#0F0F0F]"
                                }`}
                              >
                                {item.current_stock_qty}
                              </span>
                              <span className="text-[11px] text-[#6B6B6B] font-sans">
                                {item.unit}s
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Reorder Floor */}
                        <td className="py-3 px-4 font-mono text-[#0F0F0F]">
                          {item.reorder_threshold} {item.unit}s
                        </td>

                        {/* Unit Cost */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#0F0F0F]">
                            {currency}{item.current_unit_cost.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-[#6B6B6B] block">
                            per {item.unit}
                          </span>
                        </td>

                        {/* Total Asset Value */}
                        <td className="py-3 px-4 font-mono font-bold text-[#4A7C59]">
                          {currency}{item.total_value.toFixed(2)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          {item.is_low_stock ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <span>⚠️ REORDER ALERT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                              <span>✓ Healthy Stock</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenPackagingModal(item.packaging_id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 bg-white text-[#0F0F0F] hover:text-[#D97A34] hover:border-[#D97A34] border border-[#E5E3DF]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Stock In</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!packagingLoading && displayedPackagingItems.length > 0 && (
              <div className="p-4 border-t border-[#E5E3DF] bg-[#F9F8F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B6B6B]">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>
                    Showing <strong className="text-[#0F0F0F] font-mono font-bold">{displayedPackagingItems.length}</strong> of{" "}
                    <strong className="text-[#0F0F0F] font-mono font-bold">{packagingLedger.length}</strong> packaging SKUs
                  </span>
                  {statusFilter !== "all" && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-[#D97A34]">
                        Filter: {statusFilter === "low" ? "Low Stock Only" : "Healthy Stock Only"}
                      </span>
                    </>
                  )}
                  {pkgTypeFilter !== "all" && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-[#D97A34]">
                        Type: {pkgTypeFilter}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Receive Delivery Modal Instance (Ingredients) */}
      <ReceiveDeliveryModal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        onSuccess={handleDeliverySuccess}
        preselectedIngredientId={selectedIngredientId}
      />

      {/* Receive Packaging Modal Instance */}
      <ReceivePackagingModal
        isOpen={packagingModalOpen}
        onClose={() => setPackagingModalOpen(false)}
        onSuccess={handlePackagingSuccess}
        preselectedPackagingId={selectedPackagingId}
      />
    </div>
  );
}

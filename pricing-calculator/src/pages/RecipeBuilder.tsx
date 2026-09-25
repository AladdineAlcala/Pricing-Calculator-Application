// Recipe Builder / Costing Calculator page — Executive modern redesign matching reference
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Printer,
  Pencil,
  Plus,
  X,
  Layers,
  User,
  Zap,
  Clock,
  Sparkles,
  Calculator,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Check,
  SlidersHorizontal,
  Info,
  Trash2,
  Box,
  Scale,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import {
  calculateRecipeCost,
  getIngredients,
  updateRecipe,
  upsertRecipeIngredient,
  removeRecipeIngredient,
  exportDataCsv,
  type RecipeCostResult,
  type Ingredient,
  type RecipeInput,
} from "@/lib/api";
import { Spinner, Tooltip } from "@/components/ui";
import { useApp } from "@/context/AppContext";

export default function RecipeBuilder() {
  const { id } = useParams<{ id: string }>();
  const recipeId = parseInt(id || "0", 10);
  const navigate = useNavigate();
  const { fmt } = useApp();

  const [result, setResult] = useState<RecipeCostResult | null>(null);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [committedFeedback, setCommittedFeedback] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Sorting and filtering in table
  const [ingSortBy, setIngSortBy] = useState<"default" | "name" | "cost">("default");

  // Recipe settings edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<RecipeInput | null>(null);

  // Add ingredient
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState<number | null>(null);
  const [batchQty, setBatchQty] = useState<number>(0);
  const [addSearch, setAddSearch] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [res, ings] = await Promise.all([
        calculateRecipeCost(recipeId),
        getIngredients(),
      ]);
      setResult(res);
      setAllIngredients(ings);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (!result) return;
    setEditForm({
      name: result.recipe.name,
      yield_qty: result.recipe.yield_qty,
      labor_cost: result.recipe.labor_cost,
      electricity_cost: result.recipe.electricity_cost,
      other_overhead: result.recipe.other_overhead,
      target_markup_pct: result.recipe.target_markup_pct,
      reseller_markup_pct: result.recipe.reseller_markup_pct,
      desired_profit_alert: result.recipe.desired_profit_alert,
    });
    setEditModalOpen(true);
  };

  const handleSaveRecipe = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      await updateRecipe(recipeId, editForm);
      setEditModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleCommitPricing = async () => {
    setSaving(true);
    try {
      if (result) {
        await updateRecipe(recipeId, {
          name: result.recipe.name,
          yield_qty: result.recipe.yield_qty,
          labor_cost: result.recipe.labor_cost,
          electricity_cost: result.recipe.electricity_cost,
          other_overhead: result.recipe.other_overhead,
          target_markup_pct: result.recipe.target_markup_pct,
          reseller_markup_pct: result.recipe.reseller_markup_pct,
          desired_profit_alert: result.recipe.desired_profit_alert,
        });
      }
      setCommittedFeedback(true);
      setTimeout(() => setCommittedFeedback(false), 3000);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMarkup = async (markupPct: number) => {
    if (!result) return;
    setSaving(true);
    try {
      await updateRecipe(recipeId, {
        name: result.recipe.name,
        yield_qty: result.recipe.yield_qty,
        labor_cost: result.recipe.labor_cost,
        electricity_cost: result.recipe.electricity_cost,
        other_overhead: result.recipe.other_overhead,
        target_markup_pct: markupPct,
        reseller_markup_pct: result.recipe.reseller_markup_pct,
        desired_profit_alert: result.recipe.desired_profit_alert,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedIngId || batchQty <= 0) return;
    setAddSaving(true);
    try {
      await upsertRecipeIngredient(recipeId, { ingredient_id: selectedIngId, batch_qty: batchQty });
      setAddModalOpen(false);
      setSelectedIngId(null);
      setBatchQty(0);
      setAddSearch("");
      await load();
    } finally {
      setAddSaving(false);
    }
  };

  const handleRemoveIngredient = async (id: number) => {
    await removeRecipeIngredient(id);
    await load();
  };

  const handleUpdateQty = async (id: number, ingredient_id: number, qty: number) => {
    if (qty <= 0) return;
    await upsertRecipeIngredient(recipeId, { ingredient_id, batch_qty: qty });
    await load();
  };

  const handleExportCsv = async () => {
    const csv = await exportDataCsv(recipeId);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result?.recipe.name ?? "recipe"}_costing.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredIngredients = allIngredients.filter(
    (i) =>
      i.name.toLowerCase().includes(addSearch.toLowerCase()) &&
      !result?.line_items.some((li) => li.ingredient_id === i.ingredient_id)
  );

  const selectedIng = allIngredients.find((i) => i.ingredient_id === selectedIngId);

  // Sorted items
  const displayItems = useMemo(() => {
    if (!result) return [];
    const items = [...result.line_items];
    if (ingSortBy === "name") {
      return items.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
    }
    if (ingSortBy === "cost") {
      return items.sort((a, b) => b.line_item_cost - a.line_item_cost);
    }
    return items;
  }, [result, ingSortBy]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-10 h-10 text-emerald-600" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-slate-500 dark:text-slate-400 font-medium">Recipe formula not found.</p>
        <button
          onClick={() => navigate("/recipes")}
          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
        >
          ← Return to Recipe Master
        </button>
      </div>
    );
  }

  const r = result.recipe;

  // Overhead percentages for the visual distribution bar
  const laborPct =
    result.total_overhead > 0
      ? Math.round((r.labor_cost / result.total_overhead) * 100)
      : 0;
  const utilPct =
    result.total_overhead > 0
      ? Math.round((r.electricity_cost / result.total_overhead) * 100)
      : 0;
  const otherPct = Math.max(0, 100 - laborPct - utilPct);

  // Reseller margin calculation
  const resellerProfitItem = result.reseller_price_per_item - result.cost_per_item;
  const resellerMarginPct =
    result.reseller_price_per_item > 0
      ? (resellerProfitItem / result.reseller_price_per_item) * 100
      : 0;

  // Profit target gap
  const profitGap = Math.max(0, r.desired_profit_alert - result.gross_profit_per_batch);

  // Optimal markup required to hit desired profit alert
  // (Total Batch Cost + Target Profit) / Yield = Target Retail Price
  const targetBatchRevenue = result.total_cost_per_batch + r.desired_profit_alert;
  const targetRetailPrice = r.yield_qty > 0 ? targetBatchRevenue / r.yield_qty : 0;
  const optimalMarkupPct =
    result.cost_per_item > 0
      ? Math.max(0, Math.round(((targetRetailPrice - result.cost_per_item) / result.cost_per_item) * 100))
      : 0;

  const skuCode = `SKU-BNB0${r.recipe_id}`;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 print:p-4" ref={printRef}>
      {/* ── Top Breadcrumb & Status Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-200/80 dark:border-slate-800/80 pb-4 print:hidden">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 flex-wrap">
          <button
            onClick={() => navigate("/recipes")}
            className="flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Recipes</span>
          </button>
          <span>/</span>
          <span className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Recipe Formulas & Pricing
          </span>
          <span>/</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {r.name} ({skuCode})
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Production Active</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800/50">
            v2.4.1
          </span>
        </div>
      </div>

      {/* ── Page Header: Title, Tags & Action Buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {r.name} 🍌
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
              BAKERY & PASTRIES
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
              Batch: {r.yield_qty} units
            </span>
          </div>

          {/* Meta Info Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Yield: <strong className="font-bold text-slate-900 dark:text-white">{r.yield_qty} units</strong></span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Allocated Labor: <strong className="font-bold text-slate-900 dark:text-white">{fmt(r.labor_cost)}</strong></span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              <span>Electricity & Gas: <strong className="font-bold text-slate-900 dark:text-white">{fmt(r.electricity_cost)}</strong></span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Prep Time: <strong className="font-bold text-slate-900 dark:text-white">45 min</strong></span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            id="export-csv-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
              bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800
              text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            id="print-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
              bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800
              text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Spec Sheet</span>
          </button>

          <button
            onClick={openEdit}
            id="edit-recipe-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
              bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800
              text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-2xs cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Recipe</span>
          </button>

          <button
            onClick={() => {
              setAddSearch("");
              setAddModalOpen(true);
            }}
            id="add-ingredient-to-recipe-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white
              bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
              shadow-sm shadow-emerald-600/20 hover:-translate-y-0.5
              active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* ── Target Gap Alert Banner ── */}
      {result.profit_alert_triggered && !alertDismissed && (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-amber-50/95 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-600/40 shadow-xs print:hidden">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  TARGET GAP ALERT • Batch Profitability Below Benchmark
                </p>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                  Gross profit (<strong className="text-slate-900 dark:text-white font-bold">{fmt(result.gross_profit_per_batch)}/batch</strong>) is{" "}
                  <strong className="text-amber-700 dark:text-amber-400 font-bold">{fmt(profitGap)} below</strong> the target threshold of{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">{fmt(r.desired_profit_alert)}</strong>. Consider increasing retail markup to ≥{optimalMarkupPct}% or negotiating supplier bulk pricing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={openEdit}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#b45309] hover:bg-[#92400e] text-white transition-colors shadow-xs cursor-pointer"
              >
                Adjust Target
              </button>
              <button
                onClick={() => setAlertDismissed(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-black">{r.name} — Costing Sheet</h1>
        <p className="text-xs text-gray-500 mt-1">
          Yield: {r.yield_qty} units · SKU: {skuCode} · Printed: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── Left Column: Ingredients Table + Prep Spec (Col Span 7 / 8) ── */}
        <div className="xl:col-span-8 space-y-6">
          {/* Card: Recipe Ingredients */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-white/90 dark:bg-[#0c101a] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Recipe Ingredients
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                      {result.line_items.length} items
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Raw materials yield calculation & variable input costs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
                <button
                  onClick={() =>
                    setIngSortBy((prev) =>
                      prev === "default" ? "cost" : prev === "cost" ? "name" : "default"
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800
                    text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sort {ingSortBy !== "default" ? `(${ingSortBy})` : ""}</span>
                </button>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unit Format</span>
                </span>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="text-left py-3 pr-4">Ingredient</th>
                    <th className="text-right py-3 px-3">Purchase Price</th>
                    <th className="text-right py-3 px-3">Yield Factor</th>
                    <th className="text-right py-3 px-3">Unit Cost</th>
                    <th className="text-center py-3 px-3">Recipe Qty</th>
                    <th className="text-right py-3 pl-3">Line Cost</th>
                    <th className="w-8 py-3 pl-2 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Box className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">No raw ingredients added yet.</p>
                        <p className="text-xs mt-1">Click "+ Add Ingredient" above to begin assembling this formula.</p>
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((li) => (
                      <tr
                        key={li.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Ingredient Name & Source category */}
                        <td className="py-3.5 pr-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {li.ingredient_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                            <span>{li.purchase_unit} • Bulk Dry</span>
                          </div>
                        </td>

                        {/* Purchase Price */}
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {fmt(li.purchase_price)}
                        </td>

                        {/* Yield Factor */}
                        <td className="py-3.5 px-3 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                          <span>{li.yield_factor.toFixed(2)} {li.recipe_unit}s</span>
                        </td>

                        {/* Unit Cost */}
                        <td className="py-3.5 px-3 text-right tabular-nums">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {fmt(li.normalized_unit_cost)}
                          </span>
                          <span className="text-[11px] text-slate-400 block">/{li.recipe_unit}</span>
                        </td>

                        {/* Recipe Qty (Inline Input) */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] overflow-hidden focus-within:border-emerald-500">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              defaultValue={li.batch_qty}
                              onBlur={(e) =>
                                handleUpdateQty(li.id, li.ingredient_id, parseFloat(e.target.value) || 0)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                   (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-16 px-2.5 py-1 text-xs text-center bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none tabular-nums"
                              id={`batch-qty-${li.id}`}
                            />
                            <span className="px-2 py-1 text-[11px] font-semibold text-slate-400 bg-slate-50 dark:bg-[#182030] border-l border-slate-200 dark:border-slate-800">
                              {li.recipe_unit}
                            </span>
                          </div>
                        </td>

                        {/* Line Cost */}
                        <td className="py-3.5 pl-3 text-right font-extrabold text-sm text-slate-900 dark:text-white tabular-nums">
                          {fmt(li.line_item_cost)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-3.5 pl-2 text-right print:hidden">
                          <button
                            onClick={() => handleRemoveIngredient(li.id)}
                            className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Remove ingredient"
                            id={`remove-li-${li.id}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Row / Add another row & Subtotals */}
            <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>All line items calculated with standard culinary recipe yields.</span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => {
                    setAddSearch("");
                    setAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors print:hidden cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Row</span>
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Subtotal Ingredients:{" "}
                  <strong className="font-black text-slate-900 dark:text-white text-sm">
                    {fmt(result.total_variable_cost)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Card: Culinary Specification & Prep Ratio */}
          <div className="rounded-3xl p-5 bg-white/70 dark:bg-[#0c101a]/70 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  CULINARY SPECIFICATION & PREP RATIO
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Moisture loss estimated at 7.5% during 55min baking cycle at 175°C. Total dough raw mass: 1,180g.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                Contains Gluten
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                Dairy
              </span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Sidebar Costing Cards (Col Span 5 / 4) ── */}
        <div className="xl:col-span-4 space-y-6">
          {/* ── Card 1: Production Overheads ── */}
          <div className="rounded-3xl p-6 bg-white/90 dark:bg-[#0c101a] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Production Overheads
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fixed utility & labor allocation per batch
                  </p>
                </div>
              </div>
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Overhead Line Items */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Labor Allocation</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {fmt(r.labor_cost)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Electricity / Gas</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {fmt(r.electricity_cost)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Other Packaging & Consumables</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {fmt(r.other_overhead)}
                </span>
              </div>
            </div>

            {/* Visual Distribution Bar */}
            <div className="pt-2">
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                <div
                  style={{ width: `${laborPct}%` }}
                  className="bg-blue-500 transition-all duration-300"
                  title={`Labor: ${laborPct}%`}
                />
                <div
                  style={{ width: `${utilPct}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Utilities: ${utilPct}%`}
                />
                <div
                  style={{ width: `${otherPct}%` }}
                  className="bg-slate-400 transition-all duration-300"
                  title={`Other: ${otherPct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>Labor ({laborPct}%)</span>
                <span>Utilities ({utilPct}%)</span>
              </div>
            </div>

            {/* Total Overhead Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Total Fixed Overhead:</span>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tabular-nums">
                {fmt(result.total_overhead)}
              </span>
            </div>
          </div>

          {/* ── Card 2: Pricing & Margin Engine ── */}
          <div className="rounded-3xl p-6 bg-white dark:bg-[#0c101a] border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Pricing & Margin Engine
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Yield: {r.yield_qty} Finished Units
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40">
                LIVE CALC
              </span>
            </div>

            {/* Cost Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Variable Cost / Batch:</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {fmt(result.total_variable_cost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Total Overhead / Batch:</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {fmt(result.total_overhead)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                <span className="text-slate-900 dark:text-white">Total Batch Cost:</span>
                <span className="text-sm text-slate-900 dark:text-white tabular-nums">
                  {fmt(result.total_cost_per_batch)}
                </span>
              </div>
            </div>

            {/* Base Cost Box */}
            <div className="rounded-xl p-3 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Base Cost per Item:</span>
              </div>
              <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                {fmt(result.cost_per_item)}
              </span>
            </div>
          </div>

          {/* ── Card 3: Channel Pricing & Target Margins ── */}
          <div className="rounded-3xl p-6 bg-white dark:bg-[#0c101a] border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">
                  CHANNEL PRICING & TARGET MARGINS
                </h3>
                <p className="text-[11px] text-slate-400">
                  Multi-tier distribution pricing
                </p>
              </div>
            </div>

            {/* Box 1: Recommended Retail (RRP) */}
            <div className="rounded-2xl p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Recommended Retail (RRP)
                  </span>
                  <Tooltip
                    position="top"
                    content={
                      <div className="space-y-1 text-left max-w-[200px]">
                        <p className="font-semibold text-slate-900 dark:text-white">Retail Markup (+{r.target_markup_pct.toFixed(0)}%)</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Applied over unit cost ({fmt(result.cost_per_item)}) to determine customer selling price.
                        </p>
                      </div>
                    }
                  >
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 cursor-help">
                      +{r.target_markup_pct.toFixed(0)}%
                    </span>
                  </Tooltip>
                </div>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {fmt(result.recommended_retail_price_item)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/30">
                <span>Gross Profit / Item: <strong className="text-slate-900 dark:text-white font-bold">{fmt(result.gross_profit_item)}</strong></span>
                <span>Gross Margin: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{result.gross_margin_pct.toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* Box 2: Reseller / Wholesale */}
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Reseller / Wholesale <span className="text-slate-400 font-normal text-[11px]">(Base + Markup)</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    +{r.reseller_markup_pct.toFixed(0)}%
                  </span>
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                  {fmt(result.reseller_price_per_item)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span>Profit / Item: <strong className="text-slate-900 dark:text-white font-bold">{fmt(resellerProfitItem)}</strong></span>
                <span>Channel Margin: <strong className="text-slate-700 dark:text-slate-300 font-bold">{resellerMarginPct.toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* Revenue & Gross Profit Breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Retail Revenue / Batch:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                  {fmt(result.retail_revenue_batch)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Gross Profit / Batch:</span>
                <span
                  className={`font-black tabular-nums text-sm ${
                    result.profit_alert_triggered
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {fmt(result.gross_profit_per_batch)}
                </span>
              </div>
            </div>

            {/* Benchmark Objective Status Box */}
            <div className="rounded-2xl p-3 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Benchmark Objective</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Target: ≥ {fmt(r.desired_profit_alert)}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  result.profit_alert_triggered
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    result.profit_alert_triggered ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
                <span>{result.profit_alert_triggered ? "Below Target" : "On Target ✓"}</span>
              </span>
            </div>

            {/* Quick Markup Simulations */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Quick Markup Simulation:
                </span>
                {optimalMarkupPct > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    +{optimalMarkupPct}% needed for {fmt(r.desired_profit_alert)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickMarkup(r.target_markup_pct)}
                  className="py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                >
                  +{r.target_markup_pct.toFixed(0)}% (Current)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickMarkup(optimalMarkupPct)}
                  disabled={optimalMarkupPct === 0}
                  className="py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-white dark:bg-[#121826] border-slate-200 dark:border-slate-800 hover:border-emerald-500
                    text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50"
                >
                  +{optimalMarkupPct}% (Optimal)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickMarkup(Math.max(75, Math.round(r.target_markup_pct + 25)))}
                  className="py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-white dark:bg-[#121826] border-slate-200 dark:border-slate-800 hover:border-emerald-500
                    text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  +{Math.max(75, Math.round(r.target_markup_pct + 25))}% (Premium)
                </button>
              </div>
            </div>

            {/* Save Formula & Commit Pricing CTA */}
            <button
              type="button"
              onClick={handleCommitPricing}
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white uppercase tracking-wider
                bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0
                transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {committedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>FORMULA PRICING SAVED ✓</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>SAVE FORMULA & COMMIT PRICING</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 print:hidden">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time FIFO Inventory Sync Connected</span>
        </div>
        <div>
          <span>Culinary ERP Suite • Recipe Engine ID: #BNB-8839-PH{r.recipe_id}</span>
        </div>
      </div>

      {/* ── Edit Recipe Modal ── */}
      {editForm && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
            editModalOpen ? "block" : "hidden"
          }`}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setEditModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800
              bg-white dark:bg-[#0c101a] p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Edit Recipe Settings
                </h2>
                <p className="text-xs text-slate-400">Configure yields, overheads, and target pricing tiers</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Recipe Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Batch Yield (units)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.yield_qty}
                    onChange={(e) =>
                      setEditForm({ ...editForm, yield_qty: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Profit Alert Target (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.desired_profit_alert}
                    onChange={(e) =>
                      setEditForm({ ...editForm, desired_profit_alert: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Labor (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.labor_cost}
                    onChange={(e) =>
                      setEditForm({ ...editForm, labor_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Electricity (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.electricity_cost}
                    onChange={(e) =>
                      setEditForm({ ...editForm, electricity_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Other (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.other_overhead}
                    onChange={(e) =>
                      setEditForm({ ...editForm, other_overhead: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Retail Markup (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.target_markup_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, target_markup_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Reseller Markup (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.reseller_markup_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reseller_markup_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecipe}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-sm"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Ingredient Modal ── */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
          addModalOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setAddModalOpen(false)}
        />
        <div
          className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800
            bg-white dark:bg-[#0c101a] p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Add Ingredient to Recipe
              </h2>
              <p className="text-xs text-slate-400">Select an item from your pantry master inventory</p>
            </div>
            <button
              onClick={() => setAddModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Search Pantry Items</label>
              <input
                type="text"
                placeholder="Type ingredient name (e.g. Flour, Sugar, Butter)..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#121826] text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium"
              />
            </div>

            <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIngredients.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="font-semibold">No matching ingredients</p>
                  <p className="text-[11px] mt-1">Make sure ingredients are added in the Pantry Master.</p>
                </div>
              ) : (
                filteredIngredients.map((ing) => (
                  <button
                    key={ing.ingredient_id}
                    onClick={() => {
                      setSelectedIngId(ing.ingredient_id);
                      setBatchQty(0);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                      selectedIngId === ing.ingredient_id
                        ? "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold">{ing.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Purchased per {ing.purchase_unit} • Yield: {ing.yield_factor} {ing.recipe_unit}s
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {fmt(ing.purchase_price > 0 ? ing.purchase_price / ing.yield_factor : 0)}/{ing.recipe_unit}
                    </span>
                  </button>
                ))
              )}
            </div>

            {selectedIngId && selectedIng && (
              <div className="rounded-2xl p-4 bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{selectedIng.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Unit Cost: {fmt(selectedIng.purchase_price > 0 ? selectedIng.purchase_price / selectedIng.yield_factor : 0)}/{selectedIng.recipe_unit}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Batch Quantity ({selectedIng.recipe_unit}s)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={batchQty || ""}
                      onChange={(e) => setBatchQty(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 1.5"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101a] text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  {batchQty > 0 && selectedIng.purchase_price > 0 && (
                    <div className="self-end pb-1 text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Line Item Total</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {fmt(batchQty * (selectedIng.purchase_price / selectedIng.yield_factor))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={!selectedIngId || batchQty <= 0 || addSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {addSaving ? "Adding..." : "Add to Recipe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

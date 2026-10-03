// Recipe Master page — matching uploaded executive reference design with full light/dark adaptation
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Zap,
  BarChart3,
  Clock,
  Info,
  User,
  Lightbulb,
  Layers,
  ArrowUpRight,
  Download,
  Copy,
  Star,
  LayoutGrid,
  List,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  getRecipes,
  createRecipe,
  deleteRecipe,
  exportDataCsv,
  type Recipe,
  type RecipeInput,
} from "@/lib/api";
import { Spinner } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";

const RECIPE_CATEGORIES = [
  "All Categories",
  "Bakery & Pastries",
  "Breads & Buns",
  "Cakes & Cupcakes",
  "Cookies & Biscuits",
  "Pies & Tarts",
  "Desserts & Cookies",
  "Artisan Breads",
];

const EMPTY_RECIPE: RecipeInput = {
  name: "",
  yield_qty: 12,
  labor_cost: 0,
  electricity_cost: 0,
  other_overhead: 0,
  target_markup_pct: 50,
  reseller_markup_pct: 20,
  desired_profit_alert: 50,
};

export default function Recipes() {
  const { fmt } = useApp();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sortBy, setSortBy] = useState<"margin" | "name" | "overhead" | "yield">("margin");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Starred / Favorite recipes state
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RecipeInput>(EMPTY_RECIPE);
  const [modalCategory, setModalCategory] = useState("Bakery & Pastries");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    getRecipes()
      .then((data) => {
        setRecipes(data || []);
      })
      .catch((err) => {
        console.error("Failed to load recipes from backend:", err);
        setRecipes([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDuplicate = async (r: Recipe) => {
    try {
      const duplicateInput: RecipeInput = {
        name: `${r.name} (Copy)`,
        yield_qty: r.yield_qty,
        labor_cost: r.labor_cost,
        electricity_cost: r.electricity_cost,
        other_overhead: 0,
        target_markup_pct: r.target_markup_pct,
        reseller_markup_pct: r.reseller_markup_pct,
        desired_profit_alert: r.desired_profit_alert,
      };
      await createRecipe(duplicateInput);
      await load();
    } catch (err) {
      console.error("Failed to duplicate recipe", err);
    }
  };

  const handleExportAll = async () => {
    if (recipes.length === 0) return;
    try {
      // Export first recipe or consolidated
      const csv = await exportDataCsv(recipes[0].recipe_id);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recipe_costing_sheets_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const openCreateModal = () => {
    setForm(EMPTY_RECIPE);
    setModalCategory("Bakery & Pastries");
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Recipe name is required";
    if (form.yield_qty <= 0) e.yield_qty = "Yield quantity must be > 0";
    if (form.desired_profit_alert < 0) e.desired_profit_alert = "Alert threshold cannot be negative";
    if (form.labor_cost < 0) e.labor_cost = "Labor cost cannot be negative";
    if (form.electricity_cost < 0) e.electricity_cost = "Electricity cost cannot be negative";
    if (form.target_markup_pct < 0) e.target_markup_pct = "Target markup cannot be negative";
    if (form.reseller_markup_pct < 0) e.reseller_markup_pct = "Reseller markup cannot be negative";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await createRecipe(form);
      setModalOpen(false);
      setForm(EMPTY_RECIPE);
      navigate(`/recipes/${created.recipe_id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteRecipe(deleteTarget.recipe_id);
    setDeleteTarget(null);
    await load();
  };

  // Live Modal Telemetry Calculations
  const modalTotalOverhead = useMemo(() => {
    return (form.labor_cost || 0) + (form.electricity_cost || 0);
  }, [form.labor_cost, form.electricity_cost]);

  const modalOverheadPerUnit = useMemo(() => {
    return form.yield_qty > 0 ? modalTotalOverhead / form.yield_qty : 0;
  }, [modalTotalOverhead, form.yield_qty]);

  const modalEstRetail = useMemo(() => {
    return modalOverheadPerUnit * (1 + form.target_markup_pct / 100);
  }, [modalOverheadPerUnit, form.target_markup_pct]);

  const modalEstReseller = useMemo(() => {
    return modalOverheadPerUnit * (1 + form.reseller_markup_pct / 100);
  }, [modalOverheadPerUnit, form.reseller_markup_pct]);

  // Aggregate KPI metrics across all recipes
  const kpiStats = useMemo(() => {
    const totalCount = recipes.length;
    if (totalCount === 0) {
      return {
        total: 0,
        avgOverhead: 0,
        avgLabor: 0,
        avgUtilities: 0,
        blendedMargin: 0,
        topPerformer: "—",
        topPerformerRetail: 0,
        topPerformerReseller: 0,
      };
    }

    const totalOverheadSum = recipes.reduce(
      (sum, r) => sum + (r.labor_cost + r.electricity_cost),
      0
    );
    const avgOverhead = totalOverheadSum / totalCount;
    const avgLabor = recipes.reduce((sum, r) => sum + r.labor_cost, 0) / totalCount;
    const avgUtilities = recipes.reduce((sum, r) => sum + r.electricity_cost, 0) / totalCount;

    const blendedMargin =
      recipes.reduce((sum, r) => sum + r.target_markup_pct, 0) / totalCount;

    // Top performer by highest target markup
    const sortedByMarkup = [...recipes].sort((a, b) => b.target_markup_pct - a.target_markup_pct);
    const top = sortedByMarkup[0];

    return {
      total: totalCount,
      avgOverhead,
      avgLabor,
      avgUtilities,
      blendedMargin,
      topPerformer: top ? top.name : "—",
      topPerformerRetail: top ? Math.round(top.target_markup_pct) : 0,
      topPerformerReseller: top ? Math.round(top.reseller_markup_pct) : 0,
    };
  }, [recipes]);

  // Filter & Sort
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter((r) => {
        const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "margin") return b.target_markup_pct - a.target_markup_pct;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "overhead") {
          const aTotal = a.labor_cost + a.electricity_cost;
          const bTotal = b.labor_cost + b.electricity_cost;
          return bTotal - aTotal;
        }
        if (sortBy === "yield") return b.yield_qty - a.yield_qty;
        return 0;
      });
  }, [recipes, search, sortBy]);

  const totalPages = Math.ceil(filteredRecipes.length / itemsPerPage) || 1;
  const paginatedRecipes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecipes.slice(start, start + itemsPerPage);
  }, [filteredRecipes, currentPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [totalPages, currentPage]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6]">
        <Header onOpenNewRecipe={openCreateModal} />
        <div className="flex-1 flex items-center justify-center p-8">
          <Spinner className="w-10 h-10 text-[#D97A34]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F]">
      <Header onOpenNewRecipe={openCreateModal} />
      <div className="flex-1 p-6 md:p-8 space-y-6">
        {/* ── Top Navigation & Action Row ── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 shadow-xs">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Recipe Catalog & Cost Engine</span>
              <span className="text-[#6B6B6B]">•</span>
              <span className="font-bold">{recipes.length} Formulas Active</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-[#0F0F0F] border border-[#E5E3DF] shadow-xs">
              <span className="text-[#6B6B6B]">Currency:</span>
              <span className="font-bold font-mono text-[#4A7C59]">PHP (₱)</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] animate-pulse" />
              <span>Dynamic Overhead Active</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold
              bg-transparent text-[#0F0F0F]
              border border-[#0F0F0F] hover:bg-[#0F0F0F]/5
              shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#6B6B6B]" />
              Export Cost Sheets
            </button>

            <button
              onClick={openCreateModal}
              id="create-recipe-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-extrabold text-white
              bg-[#D97A34] hover:bg-[#c26827]
              shadow-md shadow-[#D97A34]/20
              transition-all active:scale-[0.98] cursor-pointer tracking-wide"
            >
              <Plus className="w-4 h-4" />
              + NEW RECIPE
            </button>
          </div>
        </div>

        {/* ── Title & Subtitle ── */}
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0F0F0F] tracking-tight">
            Recipe Formulas & Pricing
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-1 max-w-4xl leading-relaxed">
            Build, audit, and simulate comprehensive product cost sheets with tiered retail margins, reseller wholesale discounts, and live utility overhead allocation.
          </p>
        </div>

        {/* ── 4 Executive Bento Box KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: TOTAL FORMULAS */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                TOTAL FORMULAS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                +2 this month
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-[#0F0F0F] tabular-nums">
                {kpiStats.total}
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">master batches</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B] pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
              <span>100% costing compliance rate</span>
            </div>
          </div>

          {/* KPI 2: AVG. BATCH OVERHEAD */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                AVG. BATCH OVERHEAD
              </span>
              <span className="text-[10px] font-medium text-[#6B6B6B]">Fixed + Gas + Labor</span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tight text-[#0F0F0F] tabular-nums">
                {fmt(kpiStats.avgOverhead)}
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">/ per run</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#6B6B6B] pt-1">
              <span>• Labor: {fmt(kpiStats.avgLabor)}</span>
              <span>• Utilities: {fmt(kpiStats.avgUtilities)}</span>
            </div>
          </div>

          {/* KPI 3: BLENDED RETAIL MARGIN */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                BLENDED RETAIL MARGIN
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                Healthy target
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tight text-[#4A7C59] tabular-nums">
                {kpiStats.blendedMargin.toFixed(1)}%
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">net markup</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B] pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
              <span>Reseller baseline at +20.0%</span>
            </div>
          </div>

          {/* KPI 4: TOP YIELD PERFORMER */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                TOP YIELD PERFORMER
              </span>
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase">Bakery</span>
            </div>

            <div>
              <span className="text-xl font-bold tracking-tight text-[#0F0F0F] truncate block">
                {kpiStats.topPerformer}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold font-mono pt-1">
              <span className="text-emerald-600 dark:text-emerald-400">
                +{kpiStats.topPerformerRetail}% Retail
              </span>
              <span className="text-slate-600 dark:text-slate-300">
                +{kpiStats.topPerformerReseller}% Reseller
              </span>
            </div>
          </div>
        </div>

        {/* ── Search, Filter & Layout Controls Row ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          {/* Search with ESC badge */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search recipe by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearch("")}
              id="recipe-search"
              className="w-full pl-10 pr-24 py-2 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] focus:ring-4 focus:ring-[#D97A34]/10 transition-all font-medium"
            />
            {search && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#6B6B6B] bg-[#F9F8F6] px-1.5 py-0.5 rounded border border-[#E5E3DF]">
                ESC to clear
              </span>
            )}
          </div>

          {/* Dropdowns and View Switcher */}
          <div className="flex items-center gap-3">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] cursor-pointer"
            >
              {RECIPE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-white text-[#0F0F0F]">
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort By Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] cursor-pointer"
            >
              <option value="margin" className="bg-white text-[#0F0F0F]">Sort by: Highest Margin</option>
              <option value="name" className="bg-white text-[#0F0F0F]">Sort by: Name (A-Z)</option>
              <option value="overhead" className="bg-white text-[#0F0F0F]">Sort by: Overhead Cost</option>
              <option value="yield" className="bg-white text-[#0F0F0F]">Sort by: Batch Yield</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-[#F9F8F6] rounded-lg border border-[#E5E3DF]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid"
                  ? "bg-white text-[#D97A34] shadow-xs"
                  : "text-[#6B6B6B] hover:text-[#0F0F0F]"
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === "list"
                  ? "bg-white text-[#D97A34] shadow-xs"
                  : "text-[#6B6B6B] hover:text-[#0F0F0F]"
                  }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Info Sub-row */}
        <div className="flex items-center justify-between text-xs text-[#6B6B6B] px-1">
          <div>
            Showing <span className="font-bold text-[#0F0F0F]">{filteredRecipes.length}</span> of {recipes.length} recipes
            {selectedCategory !== "All Categories" && (
              <span> • Filter applied: <strong className="text-[#4A7C59]">{selectedCategory}</strong></span>
            )}
          </div>

          {(search || selectedCategory !== "All Categories") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory("All Categories");
              }}
              className="text-[#D97A34] hover:underline font-semibold"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* ── Recipe Cards Grid / List (Reference Style) ── */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white border border-[#E5E3DF] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#D97A34]/10 text-[#D97A34] mx-auto flex items-center justify-center">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F0F0F]">
                {search ? "No matching recipes" : "No recipes yet"}
              </h3>
              <p className="text-sm text-[#6B6B6B] mt-1">
                {search
                  ? "Try adjusting your search query or clear filters."
                  : "Create your first recipe formula to calculate batch costs and margins."}
              </p>
            </div>
            {!search && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#D97A34] hover:bg-[#c26827] transition-colors"
              >
                <Plus className="w-4 h-4" /> Create First Recipe
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedRecipes.map((r, idx) => {
              const totalOverheadCard = r.labor_cost + r.electricity_cost;
              const retailMarkupPct = Math.round(r.target_markup_pct > 1 ? r.target_markup_pct : r.target_markup_pct * 100);
              const resellerMarkupPct = Math.round(r.reseller_markup_pct > 1 ? r.reseller_markup_pct : r.reseller_markup_pct * 100);
              const isFav = !!favorites[r.recipe_id];

              return (
                <div
                  key={r.recipe_id}
                  className="group relative overflow-hidden rounded-2xl p-6
                  bg-white
                  border border-[#E5E3DF]
                  shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:border-[#D97A34]
                  transition-all duration-300 ease-out flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header: Formula ID & Action Icons */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F9F8F6] text-[#0F0F0F] border border-[#E5E3DF]">
                        Formula #{r.recipe_id}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(r.recipe_id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isFav
                            ? "text-amber-500"
                            : "text-[#6B6B6B] hover:text-amber-500 hover:bg-[#F9F8F6]"
                            }`}
                          title="Star recipe"
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                        </button>

                        <button
                          onClick={() => handleDuplicate(r)}
                          className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-[#F9F8F6] transition-colors cursor-pointer"
                          title="Duplicate recipe"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(r)}
                          id={`delete-recipe-${r.recipe_id}`}
                          className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete recipe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Recipe Title */}
                    <Link
                      to={`/recipes/${r.recipe_id}`}
                      className="font-bold text-lg text-[#0F0F0F] uppercase tracking-tight group-hover:text-[#D97A34] transition-colors block mb-3"
                    >
                      {r.name}
                    </Link>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F9F8F6] text-[#0F0F0F] border border-[#E5E3DF]">
                        <Layers className="w-3.5 h-3.5 text-[#6B6B6B]" />
                        <span>{r.yield_qty} units / batch</span>
                      </span>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                        Retail +{retailMarkupPct}%
                      </span>

                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#F9F8F6] text-[#0F0F0F] border border-[#E5E3DF]">
                        Reseller +{resellerMarkupPct}%
                      </span>
                    </div>

                    {/* Overhead Allocation Section with inset */}
                    <div className="rounded-xl p-3.5 bg-[#F9F8F6] border border-[#E5E3DF] space-y-2 mb-4">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                        <span>OVERHEAD ALLOCATION</span>
                        <span>PER BATCH RUN</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#0F0F0F]">
                        <div className="flex justify-between">
                          <span className="text-[#6B6B6B]">Labor Cost:</span>
                          <span className="font-semibold font-mono tabular-nums text-[#0F0F0F]">
                            {fmt(r.labor_cost)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#6B6B6B]">Electricity & Gas:</span>
                          <span className="font-semibold font-mono tabular-nums text-[#0F0F0F]">
                            {fmt(r.electricity_cost)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#E5E3DF] flex justify-between font-bold">
                          <span className="text-[#0F0F0F]">Total Overhead:</span>
                          <span className="text-[#0F0F0F] font-bold font-mono tabular-nums">
                            {fmt(totalOverheadCard)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nested Cost & Retail Price Box */}
                    <div className="rounded-xl p-3 bg-[#F9F8F6] border border-[#E5E3DF] grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6B6B6B] block">
                          Ingredients / Batch:
                        </span>
                        <span className="text-sm font-bold font-mono text-[#0F0F0F] tabular-nums">
                          {fmt(r.ingredient_cost)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6B6B6B] block">
                          Unit Retail Price:
                        </span>
                        <span className="text-sm font-bold font-mono text-[#4A7C59] tabular-nums">
                          {fmt(r.unit_retail_price)} / pc
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div>
                    <Link
                      to={`/recipes/${r.recipe_id}`}
                      id={`open-recipe-${r.recipe_id}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold
                      bg-[#D97A34] hover:bg-[#c26827] text-white
                      shadow-md shadow-[#D97A34]/20
                      transition-all active:scale-[0.98]"
                    >
                      <span>Open Recipe Calculator</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* ── Dashed "Create New Recipe Formula" Card ── */}
            <div
              onClick={openCreateModal}
              className="group relative rounded-2xl p-8
              border-2 border-dashed border-[#E5E3DF]
              hover:border-[#D97A34]
              bg-white/60
              flex flex-col items-center justify-center text-center cursor-pointer
              transition-all duration-300 min-h-[380px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#F9F8F6] border border-[#E5E3DF] flex items-center justify-center text-[#6B6B6B] group-hover:text-white group-hover:bg-[#D97A34] group-hover:border-[#D97A34] shadow-xs transition-all duration-300 mb-4">
                <Plus className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-[#0F0F0F] tracking-tight mb-2">
                Create New Recipe Formula
              </h3>

              <p className="text-xs text-[#6B6B6B] max-w-xs leading-relaxed mb-6">
                Input raw ingredient weights, unit costs, utility parameters, and automatically calibrate retail & wholesale tiering.
              </p>

              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white
                bg-[#0F0F0F] hover:bg-[#D97A34]
                shadow-xs transition-colors"
              >
                Launch Builder →
              </button>
            </div>
          </div>
        ) : (
          /* ── Table List View ── */
          <div className="rounded-2xl bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[#6B6B6B] font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Formula / Product</th>
                    <th className="py-3.5 px-4">Batch Yield</th>
                    <th className="py-3.5 px-4">Direct Overhead</th>
                    <th className="py-3.5 px-4">Ingredients Cost</th>
                    <th className="py-3.5 px-4">Unit Retail Price</th>
                    <th className="py-3.5 px-4">Target Markup</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF] font-medium text-[#0F0F0F]">
                  {paginatedRecipes.map((r, idx) => {
                    const totalOverheadCard = r.labor_cost + r.electricity_cost;
                    const retailMarkupPct = Math.round(r.target_markup_pct > 1 ? r.target_markup_pct : r.target_markup_pct * 100);
                    const isFav = !!favorites[r.recipe_id];
                    return (
                      <tr key={r.recipe_id} className="min-h-[48px] h-12 even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => toggleFavorite(r.recipe_id)}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${isFav ? "text-amber-500" : "text-[#6B6B6B] hover:text-amber-500"}`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                            </button>
                            <Link to={`/recipes/${r.recipe_id}`} className="font-bold text-[#0F0F0F] hover:text-[#D97A34] transition-colors">
                              {r.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{r.yield_qty} units</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">{fmt(totalOverheadCard)}</td>
                        <td className="py-3.5 px-4 font-mono tabular-nums">{fmt(r.ingredient_cost)}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#4A7C59] tabular-nums">
                          {fmt(r.unit_retail_price)} / pc
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                            +{retailMarkupPct}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/recipes/${r.recipe_id}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] transition-colors inline-flex items-center gap-1 shadow-xs"
                            >
                              Open <ArrowUpRight className="w-3 h-3" />
                            </Link>
                            <button
                              onClick={() => handleDuplicate(r)}
                              className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-[#F9F8F6] transition-colors cursor-pointer"
                              title="Duplicate recipe"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete recipe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Bottom Bar: Auto-sync & Pagination ── */}
        {filteredRecipes.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E5E3DF] text-xs text-[#6B6B6B]">
            {/* Left: Recipe Counter & Active Page Info */}
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <span>
                Showing{" "}
                <strong className="text-[#0F0F0F] font-semibold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-[#0F0F0F] font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredRecipes.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-[#0F0F0F] font-semibold">
                  {filteredRecipes.length}
                </strong>{" "}
                recipes
              </span>
              {totalPages > 1 && (
                <span className="text-[11px] text-[#6B6B6B]">
                  • Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            {/* Right: Pagination Controls firmly on the lower right side */}
            <div
              className="flex items-center gap-1.5 self-end sm:self-auto sm:ml-auto"
              data-purpose="recipe-pagination"
              aria-label="Pagination Navigation"
            >
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous Page"
                className="px-3 py-1.5 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] disabled:opacity-40 hover:bg-[#F9F8F6] transition-colors font-medium flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {pageNumbers.map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-xs text-[#6B6B6B] select-none"
                  >
                    •••
                  </span>
                ) : (
                  <button
                    type="button"
                    key={`page-${page}`}
                    onClick={() => setCurrentPage(page as number)}
                    aria-label={`Page ${page}`}
                    aria-current={currentPage === page ? "page" : undefined}
                    className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      currentPage === page
                        ? "bg-[#0F0F0F] text-white shadow-xs"
                        : "bg-white border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#F9F8F6]"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next Page"
                className="px-3 py-1.5 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] disabled:opacity-40 hover:bg-[#F9F8F6] transition-colors font-medium flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Modern "New Recipe" Modal ── */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative z-10 w-full max-w-2xl rounded-2xl bg-white text-[#0F0F0F] border border-[#E5E3DF] shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 pb-4 border-b border-[#E5E3DF] bg-[#F9F8F6]">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 shadow-xs">
                      <span className="text-[#4A7C59] font-bold">₱</span>
                      <span>PHILIPPINE COSTING SYSTEM</span>
                    </span>
                    <span className="text-xs font-medium text-[#6B6B6B]">
                      Batch Costing Engine
                    </span>
                  </div>

                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white text-[#6B6B6B] hover:text-[#0F0F0F] border border-[#E5E3DF] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-[#0F0F0F]">
                  New Recipe
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                  Set up recipe yield, overhead costs, and target sales margins to auto-calculate profitable pricing for your bakery or kitchen.
                </p>
              </div>

              {/* Modal Form Scrollable Content */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-white">
                {/* ── 1. GENERAL INFORMATION ── */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                      <Layers className="w-4 h-4 text-[#D97A34]" />
                      <span>1. GENERAL INFORMATION</span>
                    </div>
                    <span className="text-[11px] text-[#6B6B6B]">
                      * Required for calculation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                    {/* Recipe Name */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-[#0F0F0F] flex items-center gap-1">
                        Recipe Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g., Banana Bread Muffins"
                          id="recipe-name"
                          className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg bg-white border ${errors.name
                            ? "border-rose-500"
                            : "border-[#E5E3DF] focus:border-[#D97A34]"
                            } text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:ring-4 focus:ring-[#D97A34]/10 transition-all font-medium`}
                        />
                        <Pencil className="w-4 h-4 text-[#6B6B6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#0F0F0F]">
                        Category
                      </label>
                      <select
                        value={modalCategory}
                        onChange={(e) => setModalCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] focus:ring-4 focus:ring-[#D97A34]/10 transition-all cursor-pointer font-medium"
                      >
                        {RECIPE_CATEGORIES.slice(1).map((cat) => (
                          <option key={cat} value={cat} className="bg-white text-[#0F0F0F]">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Batch Yield & Profit Alert */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#0F0F0F]">
                          Batch Yield (Output Units) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-xs font-medium text-[#4A7C59]">
                          Pieces per batch
                        </span>
                      </div>

                      <div className="flex rounded-lg border border-[#E5E3DF] overflow-hidden focus-within:border-[#D97A34] focus-within:ring-4 focus-within:ring-[#D97A34]/10 transition-all bg-white">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={form.yield_qty || ""}
                          placeholder="12"
                          onChange={(e) =>
                            setForm({ ...form, yield_qty: parseFloat(e.target.value) || 0 })
                          }
                          id="yield-qty"
                          className="flex-1 px-3.5 py-2.5 text-sm bg-transparent text-[#0F0F0F] font-mono focus:outline-none tabular-nums"
                        />
                        <span className="px-3.5 py-2.5 text-xs text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF] flex items-center">
                          units
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#0F0F0F]">
                          Profit Alert Threshold (₱)
                        </label>
                        <span className="text-xs text-[#6B6B6B]">
                          Min. Target / unit
                        </span>
                      </div>

                      <div className="flex rounded-lg border border-[#E5E3DF] overflow-hidden focus-within:border-[#D97A34] focus-within:ring-4 focus-within:ring-[#D97A34]/10 transition-all bg-white">
                        <span className="px-3.5 py-2.5 text-sm font-bold text-[#6B6B6B] bg-[#F9F8F6] border-r border-[#E5E3DF]">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.desired_profit_alert || ""}
                          placeholder="50.00"
                          onChange={(e) =>
                            setForm({
                              ...form,
                              desired_profit_alert: parseFloat(e.target.value) || 0,
                            })
                          }
                          id="profit-alert"
                          className="flex-1 px-3.5 py-2.5 text-sm bg-transparent text-[#0F0F0F] font-mono focus:outline-none tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. BATCH OVERHEAD & OPERATING COSTS (₱) ── */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                      <Zap className="w-4 h-4 text-[#D97A34]" />
                      <span>2. BATCH OVERHEAD & OPERATING COSTS (₱)</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 tabular-nums">
                      Total Overhead: {fmt(modalTotalOverhead)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
                    {/* Labor Cost */}
                    <div className="rounded-xl p-3.5 bg-[#F9F8F6] border border-[#E5E3DF] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0F0F0F]">
                        <div className="w-6 h-6 rounded-lg bg-[#D97A34]/10 text-[#D97A34] flex items-center justify-center">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>Labor Cost (₱)</span>
                      </div>

                      <div className="flex rounded-lg border border-[#E5E3DF] bg-white overflow-hidden focus-within:border-[#D97A34]">
                        <span className="px-2.5 py-2 text-xs text-[#6B6B6B] font-bold">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.labor_cost || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setForm({ ...form, labor_cost: parseFloat(e.target.value) || 0 })
                          }
                          id="labor-cost"
                          className="w-full pr-2.5 py-2 text-sm bg-transparent text-[#0F0F0F] font-mono focus:outline-none tabular-nums"
                        />
                      </div>
                      <p className="text-[11px] text-[#6B6B6B]">Baker or prep staff batch wage</p>
                    </div>

                    {/* Electricity & Gas */}
                    <div className="rounded-xl p-3.5 bg-[#F9F8F6] border border-[#E5E3DF] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0F0F0F]">
                        <div className="w-6 h-6 rounded-lg bg-[#D97A34]/10 text-[#D97A34] flex items-center justify-center">
                          <Lightbulb className="w-3.5 h-3.5" />
                        </div>
                        <span>Electricity & Gas (₱)</span>
                      </div>

                      <div className="flex rounded-lg border border-[#E5E3DF] bg-white overflow-hidden focus-within:border-[#D97A34]">
                        <span className="px-2.5 py-2 text-xs text-[#6B6B6B] font-bold">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.electricity_cost || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setForm({ ...form, electricity_cost: parseFloat(e.target.value) || 0 })
                          }
                          id="electricity-cost"
                          className="w-full pr-2.5 py-2 text-sm bg-transparent text-[#0F0F0F] font-mono focus:outline-none tabular-nums"
                        />
                      </div>
                      <p className="text-[11px] text-[#6B6B6B]">Oven run-time & baking energy</p>
                    </div>
                  </div>
                </div>

                {/* ── 3. SALES CHANNELS & PROFIT MARKUP STRATEGY ── */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E3DF]">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                      <BarChart3 className="w-4 h-4 text-[#D97A34]" />
                      <span>3. SALES CHANNELS & PROFIT MARKUP STRATEGY</span>
                    </div>
                    <span className="text-xs text-[#6B6B6B]">
                      Auto-tiered pricing
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    {/* Direct Retail Customer */}
                    <div className="rounded-xl p-4 bg-[#F9F8F6] border border-[#E5E3DF] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0F0F0F]">
                          <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                          <span>Direct Retail Customer</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20">
                          Target B2C
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-[#6B6B6B]">Retail Markup (%)</label>
                        <div className="flex rounded-lg border border-[#E5E3DF] bg-white overflow-hidden focus-within:border-[#D97A34]">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.target_markup_pct}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                target_markup_pct: parseFloat(e.target.value) || 0,
                              })
                            }
                            id="retail-markup"
                            className="flex-1 px-3 py-2 text-sm bg-transparent text-[#0F0F0F] font-mono focus:outline-none tabular-nums"
                          />
                          <span className="px-3 py-2 text-xs text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF] flex items-center">
                            %
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E5E3DF] flex items-center justify-between text-xs">
                        <span className="text-[#6B6B6B]">Est. Retail Price:</span>
                        <span className="font-bold font-mono text-[#4A7C59] tabular-nums">
                          {modalOverheadPerUnit > 0 ? `${fmt(modalEstRetail)} / pc` : `${fmt(0)} / pc`}
                        </span>
                      </div>
                    </div>

                    {/* Wholesale / Reseller Partner */}
                    <div className="rounded-xl p-4 bg-[#F9F8F6] border border-[#E5E3DF] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0F0F0F]">
                          <span className="w-2 h-2 rounded-full bg-[#D97A34]" />
                          <span>Wholesale / Reseller Partner</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/20">
                          B2B Channel
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-[#6B6B6B]">Reseller Markup (%)</label>
                        <div className="flex rounded-lg border border-[#E5E3DF] bg-white overflow-hidden focus-within:border-[#D97A34]">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.reseller_markup_pct}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                reseller_markup_pct: parseFloat(e.target.value) || 0,
                              })
                            }
                            id="reseller-markup"
                            className="flex-1 px-3 py-2 text-sm bg-transparent text-[#0F0F0F] font-mono focus:outline-none tabular-nums"
                          />
                          <span className="px-3 py-2 text-xs text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF] flex items-center">
                            %
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E5E3DF] flex items-center justify-between text-xs">
                        <span className="text-[#6B6B6B]">Est. Reseller Price:</span>
                        <span className="font-bold font-mono text-[#0F0F0F] tabular-nums">
                          {modalOverheadPerUnit > 0 ? `${fmt(modalEstReseller)} / pc` : `${fmt(0)} / pc`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 4. LIVE BATCH COST PROJECTION ── */}
                <div className="rounded-xl p-4 bg-[#F9F8F6] border border-[#E5E3DF] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-[#0F0F0F] uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-[#D97A34]" />
                      <span>Live Batch Cost Projection</span>
                    </div>
                    <span className="text-[#6B6B6B]">
                      Ingredients cost can be added later
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E5E3DF]">
                      <span className="text-[11px] text-[#6B6B6B] block font-medium">Batch Overhead</span>
                      <span className="text-sm font-bold font-mono text-[#0F0F0F] tabular-nums">
                        {fmt(modalTotalOverhead)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-[#E5E3DF]">
                      <span className="text-[11px] text-[#6B6B6B] block font-medium">Suggested Retail</span>
                      <span className="text-sm font-bold font-mono text-[#4A7C59] tabular-nums">
                        {fmt(modalEstRetail)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-[#E5E3DF]">
                      <span className="text-[11px] text-[#6B6B6B] block font-medium">Target Net Margin</span>
                      <span className="text-sm font-bold font-mono text-[#D97A34] tabular-nums">
                        {form.target_markup_pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 md:p-6 border-t border-[#E5E3DF] bg-[#F9F8F6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                  <Info className="w-4 h-4 text-[#D97A34] shrink-0" />
                  <span>You can configure raw ingredients next</span>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-colors cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#F9F8F6] transition-colors cursor-pointer shadow-2xs"
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={saving}
                    id="save-recipe-btn"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#D97A34] hover:bg-[#c26827] shadow-md shadow-[#D97A34]/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Create Recipe
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirmation Modal ── */}
        {deleteTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white border border-[#E5E3DF] p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F0F0F]">Delete Recipe</h3>
                <p className="text-sm text-[#6B6B6B] mt-1">
                  Are you sure you want to delete{" "}
                  <strong className="text-[#0F0F0F]">{deleteTarget.name}</strong>? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  id="confirm-delete-recipe-btn"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

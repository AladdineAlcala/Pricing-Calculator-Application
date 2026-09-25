// Ingredient Master & UOM Conversion page — Executive modern redesign matching uploaded reference
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Box,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Tag,
  Scale,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  type Ingredient,
  type IngredientInput,
} from "@/lib/api";
import { Spinner, Tooltip } from "@/components/ui";
import { useApp } from "@/context/AppContext";

const STANDARD_CATEGORIES = [
  "Bulk Dry Goods",
  "Leavening Agents",
  "Fresh Produce",
  "Bakery Supplies",
  "Chilled Poultry",
  "Refrigerated Dairy",
  "Sweeteners & Syrups",
  "Fats & Oils",
  "Packaging & Consumables",
];

const PURCHASE_PACKAGING_PRESETS = [
  { label: "Kilogram (kg)", value: "Kilogram" },
  { label: "100g Container", value: "100g Container" },
  { label: "1 Liter (L)", value: "1 Liter" },
  { label: "1 kl", value: "1 kl" },
  { label: "Dozen (12 pcs)", value: "Dozen" },
  { label: "500g Pack", value: "500g Pack" },
  { label: "25 kg Sack", value: "25 kg Sack" },
  { label: "Piece (pc)", value: "Piece" },
];

const RECIPE_UNITS = [
  { label: "Cup", value: "Cup" },
  { label: "tsp (Teaspoon)", value: "tsp" },
  { label: "tbsp (Tablespoon)", value: "tbsp" },
  { label: "Gram (g)", value: "Gram" },
  { label: "pc / pcs", value: "pc" },
  { label: "ml (Milliliter)", value: "ml" },
  { label: "Kilogram (kg)", value: "Kilogram" },
];

const CONVERSION_PRESETS = [
  { label: "Flour (8.33 cups/kg)", yieldFactor: 8.33, recipeUnit: "Cup", purchaseUnit: "Kilogram", hint: "1kg = 8.33 cups" },
  { label: "Sugar (5.00 cups/kg)", yieldFactor: 5.0, recipeUnit: "Cup", purchaseUnit: "Kilogram", hint: "200g / cup" },
  { label: "Baking Powder (20 tsp/100g)", yieldFactor: 20.0, recipeUnit: "tsp", purchaseUnit: "100g Container", hint: "5g / tsp" },
  { label: "Baking Soda (20 tsp/100g)", yieldFactor: 20.0, recipeUnit: "tsp", purchaseUnit: "100g Container", hint: "5g / tsp" },
  { label: "Banana (14 pcs/kg)", yieldFactor: 14.0, recipeUnit: "pc", purchaseUnit: "1 kl", hint: "~14 pcs/kg" },
  { label: "Milk (4.17 cups/L)", yieldFactor: 4.17, recipeUnit: "Cup", purchaseUnit: "1 Liter", hint: "240ml / cup" },
  { label: "Eggs (12 pcs/dozen)", yieldFactor: 12.0, recipeUnit: "pcs", purchaseUnit: "Dozen", hint: "1 doz = 12 pcs" },
  { label: "Butter (4.41 cups/kg)", yieldFactor: 4.41, recipeUnit: "Cup", purchaseUnit: "Kilogram", hint: "227g / cup" },
];

interface FormState {
  name: string;
  category: string;
  supplier: string;
  sku: string;
  packageQty: number;
  purchaseUnit: string;
  purchasePrice: number;
  recipeUnit: string;
  yieldFactor: number;
}

const DEFAULT_FORM: FormState = {
  name: "",
  category: "Bulk Dry Goods",
  supplier: "",
  sku: "",
  packageQty: 1,
  purchaseUnit: "Kilogram",
  purchasePrice: 0,
  recipeUnit: "Cup",
  yieldFactor: 8.33,
};

// Category badge color mapper
function getCategoryBadgeClass(category: string) {
  switch (category) {
    case "Fresh Produce":
      return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/50";
    case "Chilled Poultry":
      return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/70 dark:border-blue-800/50";
    case "Refrigerated Dairy":
      return "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200/70 dark:border-sky-800/50";
    case "Leavening Agents":
      return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/50";
    case "Bakery Supplies":
      return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/50";
    default:
      return "bg-slate-100 dark:bg-[#141b2c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800";
  }
}

// Inferred category from ingredient name if not provided
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("banana") || n.includes("apple") || n.includes("fruit") || n.includes("lemon")) return "Fresh Produce";
  if (n.includes("egg")) return "Chilled Poultry";
  if (n.includes("milk") || n.includes("butter") || n.includes("cheese") || n.includes("cream")) return "Refrigerated Dairy";
  if (n.includes("baking powder") || n.includes("baking soda") || n.includes("yeast")) return "Leavening Agents";
  if (n.includes("cocoa") || n.includes("chocolate") || n.includes("vanilla")) return "Bakery Supplies";
  return "Bulk Dry Goods";
}

// SKU generator helper
function generateSku(name: string, id: number): string {
  const n = name.toLowerCase();
  if (n.includes("flour")) return `DRY-FLR-${String(id).padStart(2, "0")}`;
  if (n.includes("baking powder")) return `LEAV-BP-${String(id).padStart(2, "0")}`;
  if (n.includes("baking soda")) return `LEAV-BS-${String(id).padStart(2, "0")}`;
  if (n.includes("banana")) return `PRD-BAN-${String(id).padStart(2, "0")}`;
  if (n.includes("brown sugar")) return `DRY-SGR-${String(id).padStart(2, "0")}`;
  if (n.includes("granulated sugar") || n.includes("sugar")) return `DRY-SSR-${String(id).padStart(2, "0")}`;
  if (n.includes("cocoa")) return `DRY-COC-${String(id).padStart(2, "0")}`;
  if (n.includes("egg")) return `CHL-EGG-${String(id).padStart(2, "0")}`;
  if (n.includes("butter")) return `CHL-BTR-${String(id).padStart(2, "0")}`;
  if (n.includes("milk")) return `CHL-MLK-${String(id).padStart(2, "0")}`;
  return `ING-${String(id).padStart(3, "0")}`;
}

export default function Ingredients() {
  const { fmt } = useApp();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "price-desc" | "price-asc" | "yield">("name");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ingredient | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPresets, setShowPresets] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  // Bulk Price Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAdjustmentPct, setBulkAdjustmentPct] = useState<number>(5);

  const load = useCallback(() => {
    getIngredients().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Open Create Modal
  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setErrors({});
    setShowPresets(false);
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEdit = (ing: Ingredient) => {
    setEditTarget(ing);
    setForm({
      name: ing.name,
      category: inferCategory(ing.name),
      supplier: "",
      sku: generateSku(ing.name, ing.ingredient_id),
      packageQty: 1,
      purchaseUnit: ing.purchase_unit,
      purchasePrice: ing.purchase_price,
      recipeUnit: ing.recipe_unit,
      yieldFactor: ing.yield_factor,
    });
    setErrors({});
    setShowPresets(false);
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Ingredient name is required";
    if (!form.purchaseUnit.trim()) errs.purchaseUnit = "Purchase unit is required";
    if (!form.recipeUnit.trim()) errs.recipeUnit = "Recipe unit is required";
    if (form.yieldFactor <= 0) errs.yieldFactor = "Yield factor must be > 0";
    if (form.purchasePrice < 0) errs.purchasePrice = "Price cannot be negative";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (andAddAnother = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: IngredientInput = {
        name: form.name.trim(),
        purchase_unit: form.purchaseUnit.trim(),
        purchase_price: form.purchasePrice,
        recipe_unit: form.recipeUnit.trim(),
        yield_factor: form.yieldFactor,
      };

      if (editTarget) {
        await updateIngredient(editTarget.ingredient_id, payload);
      } else {
        await createIngredient(payload);
      }

      await load();

      if (andAddAnother) {
        setForm(DEFAULT_FORM);
        setEditTarget(null);
        setErrors({});
      } else {
        setModalOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteIngredient(deleteTarget.ingredient_id);
    setDeleteTarget(null);
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.ingredient_id));
    await load();
  };

  // Bulk Price Update
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0 || bulkAdjustmentPct === 0) return;
    setSaving(true);
    try {
      for (const id of selectedIds) {
        const item = items.find((i) => i.ingredient_id === id);
        if (item && item.purchase_price > 0) {
          const newPrice = Math.round(item.purchase_price * (1 + bulkAdjustmentPct / 100) * 100) / 100;
          await updateIngredient(item.ingredient_id, {
            name: item.name,
            purchase_unit: item.purchase_unit,
            purchase_price: newPrice,
            recipe_unit: item.recipe_unit,
            yield_factor: item.yield_factor,
          });
        }
      }
      setBulkModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (items.length === 0) return;
    const headers = [
      "Ingredient ID",
      "Name",
      "SKU",
      "Category",
      "Purchase Packaging",
      "Supplier Price (PHP)",
      "Recipe Unit",
      "Yield Factor",
      "Normalized Unit Cost (PHP)",
    ];
    const rows = items.map((i) => [
      i.ingredient_id,
      `"${i.name.replace(/"/g, '""')}"`,
      generateSku(i.name, i.ingredient_id),
      `"${inferCategory(i.name)}"`,
      `"${i.purchase_unit}"`,
      i.purchase_price.toFixed(2),
      `"${i.recipe_unit}"`,
      i.yield_factor.toFixed(2),
      (i.yield_factor > 0 ? (i.purchase_price / i.yield_factor).toFixed(2) : "0.00"),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ingredients_uom_master_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Metrics Computations
  const pricedItems = useMemo(() => items.filter((i) => i.purchase_price > 0), [items]);
  const pricedCount = pricedItems.length;
  const unpricedCount = items.length - pricedCount;
  const readyPct = items.length > 0 ? Math.round((pricedCount / items.length) * 100) : 0;

  const avgNormalizedCost = useMemo(() => {
    if (pricedItems.length === 0) return 0;
    const sum = pricedItems.reduce((acc, i) => acc + (i.yield_factor > 0 ? i.purchase_price / i.yield_factor : 0), 0);
    return sum / pricedItems.length;
  }, [pricedItems]);

  // Filtering & Sorting
  const filtered = useMemo(() => {
    return items
      .filter((i) => {
        const matchesQuery =
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.purchase_unit.toLowerCase().includes(search.toLowerCase()) ||
          i.recipe_unit.toLowerCase().includes(search.toLowerCase()) ||
          generateSku(i.name, i.ingredient_id).toLowerCase().includes(search.toLowerCase());

        if (!matchesQuery) return false;

        if (selectedFilter === "priced") return i.purchase_price > 0;
        if (selectedFilter === "unpriced") return i.purchase_price === 0;
        if (selectedFilter === "dry") return inferCategory(i.name) === "Bulk Dry Goods";
        if (selectedFilter === "refrigerated") return inferCategory(i.name) === "Refrigerated Dairy";

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "price-desc") return b.purchase_price - a.purchase_price;
        if (sortBy === "price-asc") return a.purchase_price - b.purchase_price;
        if (sortBy === "yield") return b.yield_factor - a.yield_factor;
        return 0;
      });
  }, [items, search, selectedFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map((i) => i.ingredient_id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Live Recipe Unit Cost for Modal
  const calculatedModalCost = useMemo(() => {
    if (form.yieldFactor > 0 && form.purchasePrice > 0) {
      return form.purchasePrice / form.yieldFactor;
    }
    return 0;
  }, [form.purchasePrice, form.yieldFactor]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Spinner className="w-10 h-10 text-violet-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-[#080c14] min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      {/* ── Top Header & Action Row ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          {/* Top Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-[#0c1f1a] text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Raw Ingredients & Yield Master</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-[#121624] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>{items.length} Registered</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-[#0c1f1a] text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{pricedCount} Priced</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-[#201a14] text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/50 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{unpricedCount} Needs Price</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time FIFO Inventory Sync Connected</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Ingredients & UOM Conversion
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-4xl leading-relaxed">
            Maintain accurate supplier purchase prices, packaging unit definitions, and culinary recipe yield conversion factors for automated batch recipe costing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
              bg-white dark:bg-[#121826] text-slate-700 dark:text-slate-200
              border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#182033]
              shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Export CSV / PDF</span>
          </button>

          <button
            onClick={() => {
              if (selectedIds.length === 0) {
                // If nothing selected, select all priced
                setSelectedIds(pricedItems.map((i) => i.ingredient_id));
              }
              setBulkModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
              bg-white dark:bg-[#121826] text-slate-700 dark:text-slate-200
              border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#182033]
              shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Bulk Price Update</span>
          </button>

          <button
            onClick={openCreate}
            id="add-ingredient-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white
              bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20
              transition-all active:scale-[0.98] cursor-pointer tracking-wide"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* ── 4 Executive KPI Cards (Luminous Light Edition) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL INGREDIENTS */}
        <div className="rounded-2xl p-4.5 bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TOTAL INGREDIENTS
            </span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Box className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {items.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">Active pantry items</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 pt-1 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>All categories mapped to recipe formulas</span>
          </div>
        </div>

        {/* KPI 2: FULLY COSTED */}
        <div className="rounded-2xl p-4.5 bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              FULLY COSTED
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              {readyPct}% Ready
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {pricedCount} items
            </span>
            <span className="text-xs font-semibold text-slate-400">with verified supplier rates</span>
          </div>

          {/* Progress Bar */}
          <div className="pt-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${readyPct}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* KPI 3: NEEDS SUPPLIER PRICING */}
        <div className="rounded-2xl p-4.5 bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              NEEDS SUPPLIER PRICING
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {unpricedCount} items
            </span>
            <span className="text-xs font-semibold text-slate-400">Pending purchase invoices</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pt-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Action required for precise batch margins</span>
          </div>
        </div>

        {/* KPI 4: BENCHMARK NORMALIZED COST */}
        <div className="rounded-2xl p-4.5 bg-white dark:bg-[#0f1422] border border-slate-200/90 dark:border-slate-800/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              BENCHMARK NORMALIZED COST
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              ₱
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {fmt(avgNormalizedCost)}
            </span>
            <span className="text-xs font-semibold text-slate-400">avg normalized recipe unit</span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>Based on {pricedCount} priced raw materials</span>
          </div>
        </div>
      </div>

      {/* ── Search, Filter Pills & Sort Controls Row ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0d121c] p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
        {/* Search with ⌘K Badge */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, purchase unit, SKU, or..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="ingredient-search"
            className="w-full pl-10 pr-12 py-2 text-xs rounded-xl bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
            ⌘K
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All ({items.length})
          </button>

          <button
            onClick={() => setSelectedFilter("priced")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === "priced"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Fully Priced ({pricedCount})
          </button>

          <button
            onClick={() => setSelectedFilter("unpriced")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === "unpriced"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Needs Price ({unpricedCount})
          </button>

          <button
            onClick={() => setSelectedFilter("dry")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === "dry"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Dry Goods ({items.filter((i) => inferCategory(i.name) === "Bulk Dry Goods").length})
          </button>

          <button
            onClick={() => setSelectedFilter("refrigerated")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedFilter === "refrigerated"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Refrigerated ({items.filter((i) => inferCategory(i.name) === "Refrigerated Dairy").length})
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#141b2b] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="name">Sort by: Name (A-Z)</option>
            <option value="price-desc">Sort by: Price (High-Low)</option>
            <option value="price-asc">Sort by: Price (Low-High)</option>
            <option value="yield">Sort by: Yield Factor</option>
          </select>
        </div>
      </div>

      {/* ── Main Data Table Card ── */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0c101a] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#101626]/50 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <th className="w-10 py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                  >
                    {selectedIds.length > 0 && selectedIds.length === paginatedItems.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3.5 pr-4">INGREDIENT NAME & SKU</th>
                <th className="text-left py-3.5 px-3">CATEGORY / STORAGE</th>
                <th className="text-left py-3.5 px-3">PURCHASE PACKAGING</th>
                <th className="text-right py-3.5 px-3">SUPPLIER PRICE (₱)</th>
                <th className="text-center py-3.5 px-3">RECIPE UNIT</th>
                <th className="text-right py-3.5 px-3">
                  <div className="inline-flex items-center gap-1 cursor-help justify-end">
                    <span>YIELD FACTOR</span>
                    <Tooltip content="Ratio of purchase unit to recipe yield unit" position="top">
                      <Info className="w-3 h-3 text-slate-400" />
                    </Tooltip>
                  </div>
                </th>
                <th className="text-right py-3.5 px-4">NORMALIZED COST</th>
                <th className="text-center py-3.5 pr-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    <Box className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm">No raw ingredients matched your criteria.</p>
                    <p className="text-xs mt-1">Try clearing your search query or reset category filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((ing) => {
                  const isPriced = ing.purchase_price > 0;
                  const normalized = ing.yield_factor > 0 && isPriced ? ing.purchase_price / ing.yield_factor : 0;
                  const category = inferCategory(ing.name);
                  const sku = generateSku(ing.name, ing.ingredient_id);
                  const isChecked = selectedIds.includes(ing.ingredient_id);

                  // Extract first letter for avatar badge
                  const initial = ing.name.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={ing.ingredient_id}
                      className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                        isChecked ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(ing.ingredient_id)}
                          className="text-slate-300 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Ingredient Name & SKU */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                            {initial}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white text-sm block">
                              {ing.name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID #{ing.ingredient_id} • SKU: {sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category / Storage */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getCategoryBadgeClass(
                            category
                          )}`}
                        >
                          {category}
                        </span>
                      </td>

                      {/* Purchase Packaging */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {ing.purchase_unit}
                        </span>
                      </td>

                      {/* Supplier Price (₱) */}
                      <td className="py-3.5 px-3 text-right">
                        {isPriced ? (
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white tabular-nums tracking-tight">
                            {fmt(ing.purchase_price)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Not Set</span>
                          </span>
                        )}
                      </td>

                      {/* Recipe Unit */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {ing.recipe_unit}
                        </span>
                      </td>

                      {/* Yield Factor */}
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {ing.yield_factor.toFixed(2)}{" "}
                          <span className="text-[11px] text-slate-400 font-normal">
                            ratio {category === "Bulk Dry Goods" ? `(1kg = ${ing.yield_factor} ${ing.recipe_unit}s)` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Normalized Cost */}
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {isPriced ? (
                          <div>
                            <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                              {fmt(normalized)}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {" "}
                              / {ing.recipe_unit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm font-bold">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(ing)}
                            id={`edit-ingredient-${ing.ingredient_id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                            title="Edit Ingredient"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(ing)}
                            id={`delete-ingredient-${ing.ingredient_id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Ingredient"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer & Selection Actions ── */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0e1320] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 flex-wrap">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{Math.min(1, filtered.length)} to {Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> ingredients
            </span>

            {selectedIds.length > 0 && (
              <>
                <span>|</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {selectedIds.length} Selected
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  className="font-bold text-slate-700 dark:text-slate-200 hover:text-violet-600 transition-colors cursor-pointer"
                >
                  Bulk Price Update
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition-colors font-semibold"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === page
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition-colors font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 print:hidden">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auto-synced with Philippine Peso (₱) Cost Engine • FIFO Valuation Enabled</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Yield Conversion Documentation</span>
          <span>•</span>
          <span>API Integration Status</span>
          <span>•</span>
          <span>Build v2.4.9</span>
        </div>
      </div>

      {/* ── Add / Edit Ingredient Modal (Luminous Light Edition) ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative z-10 w-full max-w-2xl rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 md:p-8 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Inventory & Costing</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    PHP (₱) Active
                  </span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {editTarget ? "Edit Ingredient" : "Add New Ingredient"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure purchase volume, pricing, and yield factor to determine exact recipe portion costs.
              </p>
            </div>

            {/* Modal Scrollable Form Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-white dark:bg-[#0c101a]">
              {/* Row 1: Name and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1">
                    <span>INGREDIENT NAME</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., All-Purpose Flour"
                    id="ingredient-name"
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#141b2c] border ${
                      errors.name ? "border-rose-400" : "border-slate-200 dark:border-slate-800"
                    } text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium`}
                  />
                  {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    CATEGORY
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer font-medium"
                  >
                    {STANDARD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Supplier and SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Supplier / Brand (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="e.g., San Miguel Mills / Metro Mart"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    SKU / Storage Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g., DRY-BIN-04"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Section 1: PURCHASE METRICS */}
              <div className="pt-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>PURCHASE METRICS</span>
                  </div>
                  <span className="text-xs text-slate-400">Enter packaging as billed by supplier</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  {/* Package Net Quantity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>PACKAGE NET QUANTITY <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.packageQty}
                        onChange={(e) => setForm({ ...form, packageQty: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-3.5 py-2.5 text-sm bg-white dark:bg-[#141b2c] text-slate-900 dark:text-white focus:outline-none tabular-nums font-bold"
                      />
                      <select
                        value={form.purchaseUnit}
                        onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value })}
                        id="purchase-unit"
                        className="flex-1 px-3 py-2.5 text-xs bg-slate-50 dark:bg-[#182033] border-l border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none font-semibold cursor-pointer"
                      >
                        {PURCHASE_PACKAGING_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-400">e.g., 25 kg sack, 1 kg bag, or 500 ml container</p>
                  </div>

                  {/* Purchase Price (₱) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      PURCHASE PRICE (₱) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all bg-white dark:bg-[#141b2c]">
                      <span className="px-3.5 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-[#182033] border-r border-slate-200 dark:border-slate-800">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.purchasePrice || ""}
                        placeholder="0.00"
                        onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })}
                        id="purchase-price"
                        className="flex-1 px-3.5 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none"
                      />
                      <span className="px-3 py-2.5 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-[#182033] border-l border-slate-200 dark:border-slate-800">
                        PHP
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] px-0.5">
                      <span className="text-slate-500 dark:text-slate-400">
                        Base cost:{" "}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {fmt(form.purchasePrice)} / {form.purchaseUnit}
                        </strong>
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tax inc.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: RECIPE USAGE & YIELD CONVERSION */}
              <div className="pt-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>RECIPE USAGE & YIELD CONVERSION</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Auto-calculates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  {/* Primary Recipe Unit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      PRIMARY RECIPE UNIT
                    </label>
                    <select
                      value={form.recipeUnit}
                      onChange={(e) => setForm({ ...form, recipeUnit: e.target.value })}
                      id="recipe-unit"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold cursor-pointer"
                    >
                      {RECIPE_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Yield Factor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        YIELD FACTOR
                      </label>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {form.yieldFactor === 1 ? "100% Usable Yield" : `${form.yieldFactor} portions/pack`}
                      </span>
                    </div>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all bg-white dark:bg-[#141b2c]">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.yieldFactor}
                        onChange={(e) => setForm({ ...form, yieldFactor: parseFloat(e.target.value) || 1 })}
                        id="yield-factor"
                        className="flex-1 px-3.5 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none"
                      />
                      <span className="px-3 py-2.5 text-xs text-slate-400 bg-slate-50 dark:bg-[#182033] border-l border-slate-200 dark:border-slate-800 font-semibold">
                        ratio
                      </span>
                    </div>
                    {errors.yieldFactor && <p className="text-xs text-rose-500">{errors.yieldFactor}</p>}
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      ⚡ Quick Conversion Presets:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CONVERSION_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            yieldFactor: p.yieldFactor,
                            recipeUnit: p.recipeUnit,
                            purchaseUnit: p.purchaseUnit,
                          })
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 dark:bg-[#141b2c] dark:hover:bg-emerald-950/70 dark:text-slate-300 dark:hover:text-emerald-300 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculated Recipe Cost Box */}
              <div className="rounded-2xl p-4.5 bg-slate-50 dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-600/20">
                    ₱
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                      Calculated Recipe Cost
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Automatically applied across all linked recipe cards
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {fmt(calculatedModalCost)}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                      / {form.recipeUnit || "unit"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {form.yieldFactor > 0 ? `1 ${form.purchaseUnit} = ${form.yieldFactor} ${form.recipeUnit}s` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 md:p-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0e1320] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>

              {!editTarget && (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Save & Add Another
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                id="save-ingredient-btn"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{editTarget ? "Save Changes" : "+ Add Ingredient"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Price Update Modal ── */}
      {bulkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setBulkModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#0c1f1a] text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bulk Price Adjustment
                  </h3>
                  <p className="text-xs text-slate-400">
                    Apply percentage change across {selectedIds.length > 0 ? selectedIds.length : pricedCount} items
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Adjust supplier purchase prices to simulate inflation, supplier contract updates, or currency exchange variations:
              </p>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.5"
                  value={bulkAdjustmentPct}
                  onChange={(e) => setBulkAdjustmentPct(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-center tabular-nums"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">% Adjustment</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {[2, 5, 8, 10, -5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBulkAdjustmentPct(pct)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#182033] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:border-violet-400 transition-colors"
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUpdate}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Ingredient
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong>? This will remove it from any recipe formulas currently referencing it.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#141b2c] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                id="confirm-delete-btn"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

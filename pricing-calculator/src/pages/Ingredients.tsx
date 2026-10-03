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
  Package,
  ChevronDown,
} from "lucide-react";
import {
  getIngredients,
  getUnits,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  type Ingredient,
  type IngredientInput,
  type IngredientConversionInput,
  type Unit,
  type IngredientPurchase,
} from "@/lib/api";
import { Spinner, Tooltip } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";

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

const PACKAGE_CONTAINERS = [
  "Box",
  "Sack",
  "Bag",
  "Tub",
  "Carton",
  "Can",
  "Bottle",
  "Pack",
  "Case",
  "Jar",
  "Pouch",
  "Bucket",
  "Package",
];

const NET_CONTENT_UNITS = [
  { label: "Grams (g)", value: "g" },
  { label: "Kilograms (kg)", value: "kg" },
  { label: "Milliliters (ml)", value: "ml" },
  { label: "Liters (L)", value: "L" },
  { label: "Pieces (pcs)", value: "pcs" },
  { label: "Ounces (oz)", value: "oz" },
  { label: "Pounds (lb)", value: "lb" },
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

const PACKAGE_CONTENT_PRESETS = [
  {
    label: "🧈 Butter Box (225g → 0.99 cup)",
    name: "Unsalted Butter",
    packageType: "Box",
    netQuantity: 225,
    netUnit: "g",
    recipeUnit: "Cup",
    yieldFactor: 0.9912,
    category: "Refrigerated Dairy",
    hint: "225g box @ 227g/cup = 0.9912 cups",
  },
  {
    label: "🌾 Flour Sack (25kg → 208.25 cups)",
    name: "All-Purpose Flour",
    packageType: "Sack",
    netQuantity: 25,
    netUnit: "kg",
    recipeUnit: "Cup",
    yieldFactor: 208.25,
    category: "Bulk Dry Goods",
    hint: "25kg sack @ 120g/cup = 208.25 cups",
  },
  {
    label: "🍬 Sugar Bag (1kg → 5.00 cups)",
    name: "Granulated Sugar",
    packageType: "Bag",
    netQuantity: 1,
    netUnit: "kg",
    recipeUnit: "Cup",
    yieldFactor: 5.0,
    category: "Bulk Dry Goods",
    hint: "1kg bag @ 200g/cup = 5.0 cups",
  },
  {
    label: "🥛 Fresh Milk (1L → 4.17 cups)",
    name: "Fresh Whole Milk",
    packageType: "Bottle",
    netQuantity: 1,
    netUnit: "L",
    recipeUnit: "Cup",
    yieldFactor: 4.1667,
    category: "Refrigerated Dairy",
    hint: "1L bottle @ 240ml/cup = 4.17 cups",
  },
  {
    label: "🥄 Baking Powder (100g → 20 tsp)",
    name: "Baking Powder",
    packageType: "Can",
    netQuantity: 100,
    netUnit: "g",
    recipeUnit: "tsp",
    yieldFactor: 20.0,
    category: "Leavening Agents",
    hint: "100g can @ 5g/tsp = 20 tsp",
  },
  {
    label: "🥚 Eggs Flat (30 pcs → 30 pcs)",
    name: "Large Fresh Eggs",
    packageType: "Case",
    netQuantity: 30,
    netUnit: "pcs",
    recipeUnit: "pc",
    yieldFactor: 30.0,
    category: "Chilled Poultry",
    hint: "1 flat tray = 30 pcs",
  },
];

// Pure mathematical culinary density and secondary UOM conversion engine
function calculateAutoYield(
  netQty: number,
  netUnit: string,
  recipeUnit: string,
  ingredientName: string
): number {
  if (netQty <= 0) return 1.0;
  const n = ingredientName.toLowerCase();

  // Direct unit matches
  if (netUnit === "g" && (recipeUnit === "Gram" || recipeUnit === "g")) return netQty;
  if (netUnit === "kg" && (recipeUnit === "Kilogram" || recipeUnit === "kg")) return netQty;
  if (netUnit === "kg" && (recipeUnit === "Gram" || recipeUnit === "g")) return netQty * 1000;
  if (netUnit === "g" && (recipeUnit === "Kilogram" || recipeUnit === "kg")) return Number((netQty / 1000).toFixed(4));
  if (netUnit === "ml" && recipeUnit === "ml") return netQty;
  if (netUnit === "L" && recipeUnit === "ml") return netQty * 1000;
  if (netUnit === "pcs" && (recipeUnit === "pc" || recipeUnit === "pcs")) return netQty;

  // Volumetric conversions using standard culinary densities
  if (recipeUnit === "Cup") {
    let gramsPerCup = 120; // default dry flour
    if (n.includes("butter")) gramsPerCup = 227;
    else if (n.includes("sugar")) gramsPerCup = 200;
    else if (n.includes("powder") || n.includes("soda")) gramsPerCup = 144;
    else if (n.includes("milk") || n.includes("water") || n.includes("liquid") || n.includes("oil")) gramsPerCup = 240;

    if (netUnit === "g") return Number((netQty / gramsPerCup).toFixed(4));
    if (netUnit === "kg") return Number(((netQty * 1000) / gramsPerCup).toFixed(4));
    if (netUnit === "ml") return Number((netQty / 240).toFixed(4));
    if (netUnit === "L") return Number(((netQty * 1000) / 240).toFixed(4));
  }

  if (recipeUnit === "tsp") {
    const gramsPerTsp = 5;
    if (netUnit === "g") return Number((netQty / gramsPerTsp).toFixed(4));
    if (netUnit === "kg") return Number(((netQty * 1000) / gramsPerTsp).toFixed(4));
  }

  if (recipeUnit === "tbsp") {
    const gramsPerTbsp = 15;
    if (netUnit === "g") return Number((netQty / gramsPerTbsp).toFixed(4));
    if (netUnit === "kg") return Number(((netQty * 1000) / gramsPerTbsp).toFixed(4));
  }

  return netQty;
}

interface FormState {
  name: string;
  category: string;
  supplier: string;
  sku: string;
  packageType: string;
  netQuantity: number;
  netUnit: string;
  packageQty: number;
  purchaseUnit: string;
  purchasePrice: number;
  recipeUnit: string;
  yieldFactor: number;
  conversions: IngredientConversionInput[];
  base_unit_id?: number | null;
}

const DEFAULT_FORM: FormState = {
  name: "",
  category: "Bulk Dry Goods",
  supplier: "",
  sku: "",
  packageType: "Box",
  netQuantity: 1,
  netUnit: "Kilogram",
  packageQty: 1,
  purchaseUnit: "Box (1 Kilogram)",
  purchasePrice: 0,
  recipeUnit: "Cup",
  yieldFactor: 5.0,
  conversions: [
    { recipe_unit: "Cup", yield_factor: 5.0, conversion_factor: 200 },
    { recipe_unit: "Gram", yield_factor: 1000.0, conversion_factor: 1 },
    { recipe_unit: "Tablespoon", yield_factor: 80.0, conversion_factor: 12.5 },
  ],
  base_unit_id: null,
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

// ── High-Fidelity Shimmer Loading Skeleton ────────────────────────────────────
function IngredientsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[#F9F8F6] min-h-screen text-[#0F0F0F] transition-colors animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-44 rounded-full bg-[#E5E3DF]" />
            <div className="h-6 w-24 rounded-full bg-[#E5E3DF]/80" />
            <div className="h-6 w-28 rounded-full bg-[#E5E3DF]/80" />
          </div>
          <div className="h-4 w-52 rounded-lg bg-[#E5E3DF]/60" />
          <div className="h-12 w-80 rounded-2xl bg-[#E5E3DF]" />
          <div className="h-4 w-full max-w-2xl rounded-lg bg-[#E5E3DF]/70" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-32 rounded-lg bg-[#E5E3DF]" />
          <div className="h-10 w-36 rounded-lg bg-[#E5E3DF]" />
          <div className="h-10 w-40 rounded-lg bg-[#D97A34]/30" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-[#E5E3DF]" />
              <div className="w-6 h-6 rounded-lg bg-[#E5E3DF]" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="h-8 w-20 rounded-lg bg-[#E5E3DF]" />
              <div className="h-3 w-16 rounded bg-[#E5E3DF]/60" />
            </div>
            <div className="h-2 w-full rounded-full bg-[#F9F8F6]" />
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5E3DF] shadow-sm">
        <div className="h-10 w-72 rounded-lg bg-[#E5E3DF]/80" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5].map((pill) => (
            <div key={pill} className="h-8 w-20 rounded-full bg-[#E5E3DF]/70" />
          ))}
        </div>
        <div className="h-10 w-44 rounded-lg bg-[#E5E3DF]/80" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-4 border-b border-[#E5E3DF] flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-[#E5E3DF]" />
          <div className="h-4 w-28 rounded bg-[#E5E3DF]/60" />
        </div>
        <div className="divide-y divide-[#E5E3DF]">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="py-4 px-4 flex items-center justify-between gap-4 min-h-[48px]">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-[#E5E3DF]" />
                <div className="w-8 h-8 rounded-lg bg-[#E5E3DF]" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-[#E5E3DF]" />
                  <div className="h-2.5 w-24 rounded bg-[#E5E3DF]/60" />
                </div>
              </div>
              <div className="h-6 w-24 rounded-full bg-[#E5E3DF]/70 hidden sm:block" />
              <div className="h-6 w-28 rounded-lg bg-[#E5E3DF]/70 hidden md:block" />
              <div className="h-4 w-16 rounded bg-[#E5E3DF]" />
              <div className="h-4 w-12 rounded bg-[#E5E3DF] hidden lg:block" />
              <div className="h-4 w-16 rounded bg-[#E5E3DF]" />
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#E5E3DF]/60" />
                <div className="w-7 h-7 rounded-lg bg-[#E5E3DF]/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Ingredients() {
  const { fmt, addNotification } = useApp();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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

  // Toast Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (title: string, message: string, type: "success" | "error" | "info" = "success") => {
      setNotification({ show: true, type, title, message });
    },
    []
  );

  useEffect(() => {
    if (notification?.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => (prev ? { ...prev, show: false } : null));
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const load = useCallback(async () => {
    try {
      const [data, unitsData] = await Promise.all([
        getIngredients().catch(() => []),
        getUnits().catch(() => []),
      ]);
      setItems(data || []);
      setUnits(unitsData || []);
      setLoading(false);
      return data;
    } catch {
      setLoading(false);
    }
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
    const pkgType = ing.package_type || "Package";
    const netQty = ing.net_quantity ?? 1;
    const netU = ing.net_unit || "kg";
    const conversions: IngredientConversionInput[] =
      ing.conversions && ing.conversions.length > 0
        ? ing.conversions.map((c) => ({
          conversion_id: c.conversion_id,
          recipe_unit: c.recipe_unit,
          yield_factor: c.yield_factor,
          from_unit_id: c.from_unit_id,
          to_unit_id: c.to_unit_id,
          conversion_factor: c.conversion_factor,
          source: c.source,
        }))
        : [
          { recipe_unit: ing.recipe_unit, yield_factor: ing.yield_factor, conversion_factor: 1 },
        ];

    setForm({
      name: ing.name,
      category: ing.category || inferCategory(ing.name),
      supplier: ing.supplier || "",
      sku: ing.sku || "",
      packageType: pkgType,
      netQuantity: netQty,
      netUnit: netU,
      packageQty: 1,
      purchaseUnit: ing.purchase_unit || `${pkgType} (${netQty} ${netU})`,
      purchasePrice: ing.purchase_price,
      recipeUnit: conversions[0]?.recipe_unit || ing.recipe_unit,
      yieldFactor: conversions[0]?.yield_factor || ing.yield_factor,
      conversions,
      base_unit_id: ing.base_unit_id ?? null,
    });
    setErrors({});
    setShowPresets(false);
    setModalOpen(true);
  };

  // Multi-unit conversion rule handlers
  const handleAddConversionRule = () => {
    setForm((prev) => ({
      ...prev,
      conversions: [
        ...prev.conversions,
        { recipe_unit: "Gram", yield_factor: 100, conversion_factor: 1 },
      ],
    }));
  };

  const handleUpdateConversionRule = (
    index: number,
    field: "recipe_unit" | "yield_factor" | "conversion_factor",
    value: string | number
  ) => {
    setForm((prev) => {
      const updated = [...prev.conversions];
      const current = { ...updated[index], [field]: value };

      // Helper to compute base package quantity in base units
      const baseUnitObj = units.find((u) => u.unit_id === prev.base_unit_id) || units.find((u) => u.is_base);
      const baseCode = baseUnitObj?.code || (prev.netUnit.toLowerCase().includes("ml") ? "ml" : "g");
      let baseFactor = 1.0;
      const nu = prev.netUnit.toLowerCase();
      if ((nu === "kg" || nu === "kilogram") && baseCode === "g") baseFactor = 1000.0;
      else if ((nu === "oz" || nu === "ounce") && baseCode === "g") baseFactor = 28.3495;
      else if ((nu === "lb" || nu === "pound") && baseCode === "g") baseFactor = 453.592;
      else if ((nu === "l" || nu === "liter") && baseCode === "ml") baseFactor = 1000.0;
      const packageBaseQty = prev.netQuantity * baseFactor;

      if (field === "conversion_factor" && typeof value === "number" && value > 0 && packageBaseQty > 0) {
        current.yield_factor = Number((packageBaseQty / value).toFixed(4));
      } else if (field === "yield_factor" && typeof value === "number" && value > 0 && packageBaseQty > 0) {
        current.conversion_factor = Number((packageBaseQty / value).toFixed(4));
      }

      updated[index] = current;
      const primaryUnit = updated[0]?.recipe_unit || prev.recipeUnit;
      const primaryYield = updated[0]?.yield_factor || prev.yieldFactor;
      return {
        ...prev,
        recipeUnit: primaryUnit,
        yieldFactor: primaryYield,
        conversions: updated,
      };
    });
  };

  const handleDeleteConversionRule = (index: number) => {
    if (form.conversions.length <= 1) return;
    setForm((prev) => {
      const updated = prev.conversions.filter((_, i) => i !== index);
      const primaryUnit = updated[0]?.recipe_unit || prev.recipeUnit;
      const primaryYield = updated[0]?.yield_factor || prev.yieldFactor;
      return {
        ...prev,
        recipeUnit: primaryUnit,
        yieldFactor: primaryYield,
        conversions: updated,
      };
    });
  };

  const handleAutoPopulateConversions = () => {
    const netQty = form.netQuantity;
    const netU = form.netUnit;
    const ingName = form.name;

    const cupFactor = calculateAutoYield(netQty, netU, "Cup", ingName);
    const gramFactor = calculateAutoYield(netQty, netU, "Gram", ingName);
    const tbspFactor = calculateAutoYield(netQty, netU, "Tablespoon", ingName);
    const tspFactor = calculateAutoYield(netQty, netU, "tsp", ingName);

    const rules: IngredientConversionInput[] = [
      { recipe_unit: "Cup", yield_factor: cupFactor, conversion_factor: 200 },
      { recipe_unit: "Gram", yield_factor: gramFactor, conversion_factor: 1 },
      { recipe_unit: "Tablespoon", yield_factor: tbspFactor, conversion_factor: 12.5 },
      { recipe_unit: "tsp", yield_factor: tspFactor, conversion_factor: 4.17 },
    ];

    setForm((prev) => ({
      ...prev,
      recipeUnit: "Cup",
      yieldFactor: cupFactor,
      conversions: rules,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Ingredient name is required";
    if (!form.packageType.trim()) errs.packageType = "Package container is required";
    if (form.netQuantity <= 0) errs.netQuantity = "Net content quantity must be > 0";
    if (!form.netUnit.trim()) errs.netUnit = "Net unit is required";
    if (form.purchasePrice < 0) errs.purchasePrice = "Price cannot be negative";

    if (form.conversions.length === 0) {
      errs.conversions = "At least one recipe unit conversion rule is required";
    }
    for (let i = 0; i < form.conversions.length; i++) {
      if (form.conversions[i].yield_factor <= 0) {
        errs.conversions = `Yield factor for conversion #${i + 1} (${form.conversions[i].recipe_unit}) must be > 0`;
        break;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (andAddAnother = false) => {
    if (!validate() || saving) return;
    setSaving(true);
    const ingredientName = form.name.trim();
    try {
      const formattedPurchaseUnit = `${form.packageType} (${form.netQuantity} ${form.netUnit})`;
      const primaryConv = form.conversions[0] || { recipe_unit: form.recipeUnit, yield_factor: form.yieldFactor };
      const payload: IngredientInput = {
        name: ingredientName,
        purchase_unit: formattedPurchaseUnit,
        purchase_price: form.purchasePrice,
        recipe_unit: primaryConv.recipe_unit,
        yield_factor: primaryConv.yield_factor,
        package_type: form.packageType,
        net_quantity: form.netQuantity,
        net_unit: form.netUnit,
        supplier: form.supplier.trim() || undefined,
        sku: form.sku.trim() || undefined,
        conversions: form.conversions,
        base_unit_id: form.base_unit_id ?? undefined,
        category: form.category || undefined,
      };

      if (editTarget) {
        await updateIngredient(editTarget.ingredient_id, payload);
        showToast(
          "Ingredient Updated Successfully",
          `"${ingredientName}" (${formattedPurchaseUnit}, ${form.conversions.length} unit conversion rules) has been saved and synchronized with the costing engine.`,
          "success"
        );
        addNotification({
          type: "notification",
          severity: "info",
          title: "Ingredient Updated",
          message: `Ingredient '${ingredientName}' specifications updated.`,
          details: `Updated purchase specifications and unit conversions synchronized with the costing engine.`,
          actionLabel: "View in Pantry",
          actionUrl: "/ingredients",
        });
      } else {
        await createIngredient(payload);
        showToast(
          "Ingredient Saved Successfully",
          `"${ingredientName}" (${formattedPurchaseUnit}, ${form.conversions.length} unit conversion rules) has been added to your Pantry Master.`,
          "success"
        );
        addNotification({
          type: "notification",
          severity: "success",
          title: "New Ingredient Created",
          message: `A new ingredient '${ingredientName}' has been created.`,
          details: `Added to pantry master catalog with unit of measure (${formattedPurchaseUnit}) and synchronized with the costing engine.`,
          actionLabel: "View in Pantry",
          actionUrl: "/ingredients",
        });
      }

      await load();

      if (andAddAnother) {
        setForm(DEFAULT_FORM);
        setEditTarget(null);
        setErrors({});
      } else {
        setModalOpen(false);
      }
    } catch (err: unknown) {
      showToast(
        "Save Failed",
        err instanceof Error ? err.message : String(err),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    await deleteIngredient(deleteTarget.ingredient_id);
    setDeleteTarget(null);
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.ingredient_id));
    showToast("Ingredient Deleted", `"${name}" was removed from the inventory master.`, "info");
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
            package_type: item.package_type || "Package",
            net_quantity: item.net_quantity ?? 1,
            net_unit: item.net_unit || "Kilogram",
            supplier: item.supplier,
            sku: item.sku,
            current_stock_qty: item.current_stock_qty,
            reorder_threshold: item.reorder_threshold,
            conversions: item.conversions,
          });
        }
      }
      setBulkModalOpen(false);
      showToast(
        "Bulk Prices Updated",
        `Applied ${bulkAdjustmentPct > 0 ? "+" : ""}${bulkAdjustmentPct}% across ${selectedIds.length} items.`,
        "success"
      );
      await load();
    } catch (err: unknown) {
      showToast(
        "Bulk Update Failed",
        err instanceof Error ? err.message : String(err),
        "error"
      );
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
      `"${(i.sku || generateSku(i.name, i.ingredient_id)).replace(/"/g, '""')}"`,
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
        const skuStr = i.sku || generateSku(i.name, i.ingredient_id);
        const supplierStr = i.supplier || "";
        const matchesQuery =
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.purchase_unit.toLowerCase().includes(search.toLowerCase()) ||
          i.recipe_unit.toLowerCase().includes(search.toLowerCase()) ||
          skuStr.toLowerCase().includes(search.toLowerCase()) ||
          supplierStr.toLowerCase().includes(search.toLowerCase());

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

  // Live Net Content Unit Cost for Modal (e.g. ₱120 / 225g = ₱0.5333/g)
  const calculatedCostPerNetUnit = useMemo(() => {
    if (form.netQuantity > 0 && form.purchasePrice > 0) {
      return form.purchasePrice / form.netQuantity;
    }
    return 0;
  }, [form.purchasePrice, form.netQuantity]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F]">
        <Header unpricedCount={unpricedCount} />
        <IngredientsSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F] transition-colors">
      <Header unpricedCount={unpricedCount} />
      <div className="flex-1 p-6 md:p-8 space-y-6">
        {/* ── Toast Notification Banner ── */}
        {notification && notification.show && (
          <div
            className={`fixed top-6 right-6 z-50 flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-200 max-w-sm ${notification.type === "error"
              ? "border-rose-500/40 text-rose-900"
              : notification.type === "info"
                ? "border-[#D97A34]/40 text-[#0F0F0F]"
                : "border-[#4A7C59]/40 text-[#4A7C59]"
              }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notification.type === "error"
                ? "bg-rose-500/10 text-rose-600"
                : notification.type === "info"
                  ? "bg-[#D97A34]/10 text-[#D97A34]"
                  : "bg-[#4A7C59]/10 text-[#4A7C59]"
                }`}
            >
              {notification.type === "error" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : notification.type === "info" ? (
                <Info className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold text-[#0F0F0F] tracking-tight">
                {notification.title}
              </h4>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-snug">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification((prev) => (prev ? { ...prev, show: false } : null))}
              className="text-[#6B6B6B] hover:text-[#0F0F0F] p-1 rounded-lg hover:bg-[#F9F8F6] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Top Header & Action Row ── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 shadow-xs">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Raw Ingredients &amp; Yield Master</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-[#6B6B6B] border border-[#E5E3DF] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6B6B6B]" />
                <span className="font-mono">{items.length}</span> Registered
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                <span className="font-mono">{pricedCount}</span> Priced
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97A34]" />
                <span className="font-mono">{unpricedCount}</span> Needs Price
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0F0F0F]">
              Ingredients &amp; UOM Conversion
            </h1>
            <p className="text-xs md:text-sm text-[#6B6B6B] mt-1 max-w-4xl leading-relaxed">
              Maintain accurate supplier purchase prices, packaging unit definitions, and culinary recipe yield conversion factors for automated batch recipe costing.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold
              bg-transparent text-[#0F0F0F] border border-[#0F0F0F] hover:bg-[#0F0F0F]/5
              shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[40px]"
            >
              <Download className="w-4 h-4 text-[#0F0F0F]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                if (selectedIds.length === 0) {
                  // If nothing selected, select all priced
                  setSelectedIds(pricedItems.map((i) => i.ingredient_id));
                }
                setBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold
              bg-transparent text-[#0F0F0F] border border-[#0F0F0F] hover:bg-[#0F0F0F]/5
              shadow-sm transition-all active:scale-[0.98] cursor-pointer min-h-[40px]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#D97A34]" />
              <span>Bulk Price Update</span>
            </button>

            <button
              onClick={openCreate}
              id="add-ingredient-btn"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white
              bg-[#D97A34] hover:bg-[#c26827] shadow-[0_4px_20px_rgba(0,0,0,0.05)]
              transition-all active:scale-[0.98] cursor-pointer tracking-wide min-h-[40px]"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Add Ingredient</span>
            </button>
          </div>
        </div>

        {/* ── 4 Executive KPI Cards (Bento Box Style) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: TOTAL INGREDIENTS */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                TOTAL INGREDIENTS
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] flex items-center justify-center">
                <Box className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-[#0F0F0F] font-mono">
                {items.length}
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">Active pantry items</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#4A7C59] pt-1 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>All categories mapped to recipe formulas</span>
            </div>
          </div>

          {/* KPI 2: FULLY COSTED */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                FULLY COSTED
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4A7C59] text-white">
                {readyPct}% Ready
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-[#4A7C59] font-mono">
                {pricedCount} items
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">with verified supplier rates</span>
            </div>

            {/* Progress Bar */}
            <div className="pt-1">
              <div className="h-2 w-full bg-[#F9F8F6] border border-[#E5E3DF]/50 rounded-full overflow-hidden">
                <div
                  style={{ width: `${readyPct}%` }}
                  className="h-full bg-[#4A7C59] rounded-full transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* KPI 3: NEEDS SUPPLIER PRICING */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                NEEDS SUPPLIER PRICING
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#D97A34]/10 text-[#D97A34] flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-[#D97A34] font-mono">
                {unpricedCount} items
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">Pending purchase invoices</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#D97A34] pt-1 font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97A34]" />
              <span>Action required for precise batch margins</span>
            </div>
          </div>

          {/* KPI 4: BENCHMARK NORMALIZED COST */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                BENCHMARK NORMALIZED COST
              </span>
              <div className="w-6 h-6 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] flex items-center justify-center font-bold text-xs font-mono">
                ₱
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-[#0F0F0F] font-mono">
                {fmt(avgNormalizedCost)}
              </span>
              <span className="text-xs font-semibold text-[#6B6B6B]">avg normalized recipe unit</span>
            </div>

            <div className="text-xs text-[#6B6B6B] pt-1">
              <span>Based on <span className="font-mono">{pricedCount}</span> priced raw materials</span>
            </div>
          </div>
        </div>

        {/* ── Search, Filter Pills & Sort Controls Row ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5E3DF] shadow-sm">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search by name, purchase unit, SKU, or..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="ingredient-search"
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] focus:ring-4 focus:ring-[#D97A34]/10 transition-all font-medium"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFilter === "all"
                ? "bg-[#D97A34] text-white shadow-xs"
                : "bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#E5E3DF]/50"
                }`}
            >
              All ({items.length})
            </button>

            <button
              onClick={() => setSelectedFilter("priced")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFilter === "priced"
                ? "bg-[#D97A34] text-white shadow-xs"
                : "bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#E5E3DF]/50"
                }`}
            >
              Fully Priced ({pricedCount})
            </button>

            <button
              onClick={() => setSelectedFilter("unpriced")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFilter === "unpriced"
                ? "bg-[#D97A34] text-white shadow-xs"
                : "bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#E5E3DF]/50"
                }`}
            >
              Needs Price ({unpricedCount})
            </button>

            <button
              onClick={() => setSelectedFilter("dry")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFilter === "dry"
                ? "bg-[#D97A34] text-white shadow-xs"
                : "bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#E5E3DF]/50"
                }`}
            >
              Dry Goods ({items.filter((i) => inferCategory(i.name) === "Bulk Dry Goods").length})
            </button>

            <button
              onClick={() => setSelectedFilter("refrigerated")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedFilter === "refrigerated"
                ? "bg-[#D97A34] text-white shadow-xs"
                : "bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#E5E3DF]/50"
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
              className="px-3 py-2 text-xs rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] font-semibold focus:outline-none focus:border-[#D97A34] cursor-pointer"
            >
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="price-desc">Sort by: Price (High-Low)</option>
              <option value="price-asc">Sort by: Price (Low-High)</option>
              <option value="yield">Sort by: Yield Factor</option>
            </select>
          </div>
        </div>

        {/* ── Main Data Table Card ── */}
        <div className="rounded-2xl border border-[#E5E3DF] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[10px] uppercase font-bold tracking-wider text-[#6B6B6B]">
                  <th className="w-10 py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[#6B6B6B] hover:text-[#D97A34] cursor-pointer"
                    >
                      {selectedIds.length > 0 && selectedIds.length === paginatedItems.length ? (
                        <CheckSquare className="w-4 h-4 text-[#D97A34]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3.5 pr-4">INGREDIENT NAME &amp; SKU</th>
                  <th className="text-left py-3.5 px-3">CATEGORY / STORAGE</th>
                  <th className="text-left py-3.5 px-3">PURCHASE PACKAGING</th>
                  <th className="text-right py-3.5 px-3">SUPPLIER PRICE (₱)</th>
                  <th className="text-center py-3.5 px-3">RECIPE UNIT</th>
                  <th className="text-right py-3.5 px-3">
                    <div className="inline-flex items-center gap-1 cursor-help justify-end">
                      <span>YIELD FACTOR</span>
                      <Tooltip content="Ratio of purchase unit to recipe yield unit" position="top">
                        <Info className="w-3 h-3 text-[#6B6B6B]" />
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-right py-3.5 px-4">NORMALIZED COST</th>
                  <th className="text-center py-3.5 pr-4">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E3DF]">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-[#6B6B6B]">
                      <Box className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-bold text-sm text-[#0F0F0F]">No raw ingredients matched your criteria.</p>
                      <p className="text-xs mt-1">Try clearing your search query or reset category filter.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((ing) => {
                    const isPriced = ing.purchase_price > 0;
                    const normalized = ing.yield_factor > 0 && isPriced ? ing.purchase_price / ing.yield_factor : 0;
                    const category = inferCategory(ing.name);
                    const sku = ing.sku || generateSku(ing.name, ing.ingredient_id);
                    const isChecked = selectedIds.includes(ing.ingredient_id);

                    // Extract first letter for avatar badge
                    const initial = ing.name.charAt(0).toUpperCase();

                    return (
                      <tr
                        key={ing.ingredient_id}
                        className={`group min-h-[48px] h-12 even:bg-[#F9F8F6] odd:bg-white transition-colors ${isChecked ? "bg-[#D97A34]/10" : ""
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(ing.ingredient_id)}
                            className="text-[#E5E3DF] hover:text-[#D97A34] cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#D97A34]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Ingredient Name & SKU */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0F0F0F] border border-[#E5E3DF] text-[#F9F8F6] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {initial}
                            </div>
                            <div>
                              <span className="font-bold text-[#0F0F0F] text-sm block">
                                {ing.name}
                              </span>
                              <span className="text-[11px] text-[#6B6B6B] font-mono">
                                ID #{ing.ingredient_id} • SKU: {sku}{ing.supplier ? ` • ${ing.supplier}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category / Storage */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(
                              category
                            )}`}
                          >
                            {category}
                          </span>
                        </td>

                        {/* Purchase Packaging */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F]">
                                <Package className="w-3 h-3 text-[#4A7C59]" />
                                {ing.package_type || "Package"}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#6B6B6B] font-medium mt-0.5">
                              Net: <strong className="text-[#0F0F0F] font-semibold font-mono">{ing.net_quantity ?? 1} {ing.net_unit ?? "kg"}</strong>
                              {isPriced && (ing.net_quantity ?? 0) > 0 && (
                                <span className="text-[#4A7C59] font-semibold ml-1 font-mono">
                                  ({fmt(ing.purchase_price / (ing.net_quantity ?? 1))}/{ing.net_unit ?? "kg"})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Supplier Price (₱) */}
                        <td className="py-3 px-3 text-right">
                          {isPriced ? (
                            <span className="font-extrabold text-sm text-[#0F0F0F] font-mono tracking-tight">
                              {fmt(ing.purchase_price)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Not Set</span>
                            </span>
                          )}
                        </td>

                        {/* Recipe Unit */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold text-[#0F0F0F]">
                              {ing.recipe_unit}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              {(() => {
                                const bu = units.find((u) => u.unit_id === ing.base_unit_id);
                                if (bu) {
                                  return (
                                    <span
                                      className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      title={`Canonical Base Unit: ${bu.name} (${bu.code})`}
                                    >
                                      Base: {bu.code}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              {ing.conversions && ing.conversions.length > 1 && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 cursor-help"
                                  title={`Mapped units: ${ing.conversions.map((c) => `${c.recipe_unit} (${c.conversion_factor ? `factor: ${c.conversion_factor}` : `yield: ${c.yield_factor}`})`).join(", ")}`}
                                >
                                  +{ing.conversions.length - 1} units
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Yield Factor */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-[#0F0F0F] font-mono">
                            {ing.yield_factor.toFixed(2)}{" "}
                            <span className="text-[11px] text-[#6B6B6B] font-normal">
                              {ing.recipe_unit}s/{ing.package_type || "pack"}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#6B6B6B] block font-normal font-mono">
                            1 {ing.package_type || "pack"} yields {ing.yield_factor.toFixed(2)} {ing.recipe_unit}s
                          </span>
                        </td>

                        {/* Normalized Cost */}
                        <td className="py-3 px-4 text-right">
                          {isPriced ? (
                            <div>
                              <span className="font-extrabold text-sm text-[#4A7C59] font-mono">
                                {fmt(normalized)}
                              </span>
                              <span className="text-[11px] text-[#6B6B6B] font-medium">
                                {" "}
                                / {ing.recipe_unit}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#6B6B6B] text-sm font-bold">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(ing)}
                              id={`edit-ingredient-${ing.ingredient_id}`}
                              className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#D97A34] hover:bg-[#D97A34]/10 hover:scale-110 active:scale-90 transition-all cursor-pointer"
                              title="Edit Ingredient"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(ing)}
                              id={`delete-ingredient-${ing.ingredient_id}`}
                              className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-rose-600 hover:bg-rose-50 hover:scale-110 active:scale-90 transition-all cursor-pointer"
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
          <div className="p-4 border-t border-[#E5E3DF] bg-[#F9F8F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-[#6B6B6B] flex-wrap">
              <span>
                Showing <strong className="text-[#0F0F0F] font-mono">{Math.min(1, filtered.length)} to {Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of <strong className="text-[#0F0F0F] font-mono">{filtered.length}</strong> ingredients
              </span>

              {selectedIds.length > 0 && (
                <>
                  <span>|</span>
                  <span className="font-semibold text-[#D97A34] font-mono">
                    {selectedIds.length} Selected
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(true)}
                    className="font-bold text-[#0F0F0F] hover:text-[#D97A34] transition-colors cursor-pointer"
                  >
                    Bulk Price Update
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-[#6B6B6B] hover:text-[#0F0F0F]"
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
                className="px-3 py-1.5 rounded-lg border border-[#E5E3DF] text-[#0F0F0F] disabled:opacity-40 hover:bg-white transition-colors font-semibold"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${currentPage === page
                    ? "bg-[#D97A34] text-white shadow-xs"
                    : "border border-[#E5E3DF] text-[#0F0F0F] hover:bg-white"
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#E5E3DF] text-[#0F0F0F] disabled:opacity-40 hover:bg-white transition-colors font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* ── Add / Edit Ingredient Modal ── */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0F0F]/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative z-10 w-full max-w-5xl xl:max-w-6xl rounded-2xl bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 pb-4 border-b border-[#E5E3DF] bg-[#F9F8F6]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 font-mono">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#4A7C59]" />
                      <span>Inventory &amp; Costing Engine</span>
                    </span>
                    <span className="text-xs font-semibold text-[#6B6B6B]">
                      Philippine Peso (₱) Active
                    </span>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-[#0F0F0F]">
                  {editTarget ? "Edit Ingredient" : "Add New Ingredient"}
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Configure procurement packaging, base unit normalization, and culinary conversion rules to determine exact recipe portion costs.
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
                {/* Section A: Core Identity & Categorization */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide flex items-center gap-1">
                        <span>INGREDIENT NAME</span> <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g., All-Purpose Flour"
                        id="ingredient-name"
                        className={`w-full h-[42px] px-3.5 text-sm rounded-lg bg-white border ${errors.name ? "border-rose-400" : "border-[#E5E3DF]"
                          } text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] transition-all font-medium`}
                      />
                      {errors.name && <p className="text-xs text-rose-500 font-medium">{errors.name}</p>}
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
                        CATEGORY
                      </label>
                      <div className="relative">
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full h-[42px] appearance-none pl-3.5 pr-10 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] transition-all cursor-pointer font-medium"
                        >
                          {STANDARD_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#6B6B6B] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Supplier and SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
                          SUPPLIER / BRAND
                        </label>
                        <span className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-wider bg-[#F9F8F6] border border-[#E5E3DF] px-2 py-0.5 rounded-full">
                          Optional
                        </span>
                      </div>
                      <input
                        type="text"
                        value={form.supplier}
                        onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                        placeholder="e.g., San Miguel Mills / Metro Mart"
                        className="w-full h-[42px] px-3.5 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
                          SKU / STORAGE LOCATION
                        </label>
                        <span className="text-[10px] font-semibold text-[#6B6B6B] uppercase tracking-wider bg-[#F9F8F6] border border-[#E5E3DF] px-2 py-0.5 rounded-full">
                          Optional
                        </span>
                      </div>
                      <input
                        type="text"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                        placeholder="e.g., DRY-BIN-04"
                        className="w-full h-[42px] px-3.5 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#D97A34] transition-all font-medium font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Balanced Two-Column Procurement & Economic Engine Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                  {/* Left Column: Commercial Purchase Packaging & Net Usable Mass */}
                  <div className="lg:col-span-7 space-y-4 rounded-2xl p-5 bg-[#F9F8F6] border border-[#E5E3DF]">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E3DF]">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                        <ShoppingBag className="w-4 h-4 text-[#D97A34]" />
                        <span>PURCHASE PACKAGING &amp; NET USABLE CONTENT</span>
                      </div>
                      <span className="text-[11px] text-[#6B6B6B] font-medium">Bulk Invoicing Basis</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                      {/* Package Container */}
                      <div className="sm:col-span-5 space-y-1.5">
                        <label className="text-xs font-bold text-[#0F0F0F] flex items-center gap-1 uppercase tracking-wide">
                          <span>PACKAGE CONTAINER</span> <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={form.packageType}
                            onChange={(e) => {
                              const newType = e.target.value;
                              const formatted = `${newType} (${form.netQuantity} ${form.netUnit})`;
                              setForm({ ...form, packageType: newType, purchaseUnit: formatted });
                            }}
                            id="package-type"
                            className="w-full h-[42px] appearance-none pl-3.5 pr-10 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] transition-all font-semibold cursor-pointer"
                          >
                            {PACKAGE_CONTAINERS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#6B6B6B] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                        </div>
                        <p className="text-[11px] text-[#6B6B6B]">e.g. Bag, Box, Sack, Tub</p>
                      </div>

                      {/* Net Quantity */}
                      <div className="sm:col-span-4 space-y-1.5">
                        <label className="text-xs font-bold text-[#0F0F0F] flex items-center gap-1 uppercase tracking-wide">
                          <span>NET QUANTITY</span> <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={form.netQuantity || ""}
                          placeholder="e.g., 1"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const formatted = `${form.packageType} (${val} ${form.netUnit})`;
                            setForm({ ...form, netQuantity: val, purchaseUnit: formatted });
                          }}
                          id="net-quantity"
                          className="w-full h-[42px] px-3.5 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] font-bold font-mono focus:outline-none focus:border-[#D97A34] transition-all"
                        />
                        <p className="text-[11px] text-[#6B6B6B]">Net physical amount</p>
                      </div>

                      {/* Net Unit (Secondary UOM) */}
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="text-xs font-bold text-[#0F0F0F] flex items-center gap-1 uppercase tracking-wide">
                          <span>UNIT (UOM)</span> <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={form.netUnit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              const formatted = `${form.packageType} (${form.netQuantity} ${newUnit})`;
                              setForm({ ...form, netUnit: newUnit, purchaseUnit: formatted });
                            }}
                            id="net-unit"
                            className="w-full h-[42px] appearance-none pl-3.5 pr-8 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] transition-all font-semibold cursor-pointer"
                          >
                            {NET_CONTENT_UNITS.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#6B6B6B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-[11px] text-[#6B6B6B]">kg, g, L, ml</p>
                      </div>
                    </div>

                    {/* Container Purchase Price */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#0F0F0F] flex items-center gap-1">
                          <span>CONTAINER PURCHASE PRICE (₱)</span> <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-[#6B6B6B] font-semibold uppercase">
                          Invoice Price per 1 {form.packageType}
                        </span>
                      </div>
                      <div className="flex h-[42px] items-center rounded-lg border border-[#E5E3DF] overflow-hidden focus-within:border-[#D97A34] transition-all bg-white">
                        <span className="h-full px-3.5 flex items-center justify-center text-sm font-bold text-[#D97A34] bg-[#F9F8F6] border-r border-[#E5E3DF] shrink-0 select-none">
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
                          className="min-w-0 flex-1 h-full px-3 text-sm bg-transparent text-[#0F0F0F] font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span
                          className="h-full px-3.5 flex items-center text-xs font-bold text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF] shrink-0 whitespace-nowrap"
                          title={`Cost in Philippine Pesos per ${form.packageType}`}
                        >
                          PHP / {form.packageType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Economic Engine & Canonical Base Unit Basis */}
                  <div className="lg:col-span-5 space-y-4 rounded-2xl p-5 bg-[#F9F8F6] border border-[#E5E3DF] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E3DF]">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                          <Scale className="w-4 h-4 text-[#4A7C59]" />
                          <span>UNIT ECONOMIC BASIS</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#4A7C59] bg-[#4A7C59]/10 border border-[#4A7C59]/20 px-2 py-0.5 rounded-full font-mono">
                          Cost Engine
                        </span>
                      </div>

                      {/* Canonical Base Unit Selector */}
                      <div className="space-y-1.5 mt-3.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wide">
                            CANONICAL BASE UNIT (NORMALIZED COST BASIS)
                          </label>
                        </div>
                        <div className="relative">
                          <select
                            value={form.base_unit_id ?? ""}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value, 10) : null;
                              setForm({ ...form, base_unit_id: val });
                            }}
                            id="base-unit-selector"
                            className="w-full h-[42px] appearance-none pl-3.5 pr-10 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] transition-all font-semibold cursor-pointer"
                          >
                            <option value="">Auto-detected standard base unit</option>
                            {units
                              .filter((u) => u.is_base)
                              .map((u) => (
                                <option key={u.unit_id} value={u.unit_id}>
                                  {u.name} ({u.code}) — {u.unit_type}
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#6B6B6B] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" />
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                          Reference base ({units.filter(u => u.is_base).map(u => `${u.code}`).join(", ") || "g, ml, pcs"}) used by the cost engine to normalize recipe quantities.
                        </p>
                      </div>
                    </div>

                    {/* Live Cost Rate Card */}
                    <div className="mt-3 p-3.5 rounded-xl bg-white border border-[#E5E3DF] shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#6B6B6B]">Effective Net Rate:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-[#4A7C59] font-mono">
                            {fmt(calculatedCostPerNetUnit)}
                          </span>
                          <span className="text-xs font-bold text-[#6B6B6B]">
                            / {form.netUnit}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-[#E5E3DF] text-[11px] text-[#6B6B6B] flex items-center justify-between">
                        <span>Pack Definition:</span>
                        <span className="font-bold text-[#0F0F0F] font-mono">
                          1 {form.packageType} = {form.netQuantity} {form.netUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section C: RECIPE USAGE & MULTI-UNIT CONVERSIONS */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E3DF] gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                        <Scale className="w-4 h-4 text-[#D97A34]" />
                        <span>RECIPE USAGE &amp; MULTI-UNIT CONVERSIONS</span>
                      </div>
                      <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                        Configure recipe measurement units (e.g., cup, grams, tablespoons) and base-unit conversion factors.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAutoPopulateConversions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-[#4A7C59] border border-[#4A7C59] hover:bg-[#4A7C59]/5 transition-colors cursor-pointer"
                        title="Auto-calculate common conversions (Cup, Gram, Tablespoon) based on net content"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#4A7C59]" />
                        <span>Auto-Generate Conversions</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddConversionRule}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#0F0F0F]" />
                        <span>+ Add Conversion Rule</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-grid: Inline Editable Conversion Rules Table */}
                  <div className="overflow-x-auto rounded-2xl border border-[#E5E3DF] bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F9F8F6] border-b border-[#E5E3DF] text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                          <th className="py-3 px-4 text-left w-[24%] min-w-[170px]">Kitchen Recipe Unit</th>
                          <th className="py-3 px-4 text-left w-[25%] min-w-[200px]">Conversion Factor (Base Qty)</th>
                          <th className="py-3 px-4 text-left w-[25%] min-w-[200px]">Yield Factor (Derived)</th>
                          <th className="py-3 px-4 text-right w-[18%] min-w-[150px]">Normalized Micro-Cost</th>
                          <th className="py-3 px-3 text-center w-[8%] min-w-[60px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E3DF]">
                        {form.conversions.map((conv, idx) => {
                          const microCost =
                            conv.yield_factor > 0 && form.purchasePrice > 0
                              ? form.purchasePrice / conv.yield_factor
                              : 0;
                          const bu = units.find((u) => u.unit_id === form.base_unit_id) || units.find((u) => u.is_base);
                          const baseCode = bu?.code || (form.netUnit.toLowerCase().includes("ml") ? "ml" : "g");

                          return (
                            <tr
                              key={idx}
                              className="even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80 transition-colors"
                            >
                              {/* Kitchen Recipe Unit */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 max-w-[180px]">
                                    <select
                                      value={conv.recipe_unit}
                                      onChange={(e) =>
                                        handleUpdateConversionRule(idx, "recipe_unit", e.target.value)
                                      }
                                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-[#E5E3DF] bg-white font-semibold text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] text-xs cursor-pointer"
                                    >
                                      {RECIPE_UNITS.map((u) => (
                                        <option key={u.value} value={u.value}>
                                          {u.label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-[#6B6B6B] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                                  </div>
                                  {idx === 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/20 font-mono shrink-0">
                                      Primary
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Conversion Factor (Base Qty) */}
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <div className="flex items-center rounded-lg border border-[#E5E3DF] overflow-hidden bg-white focus-within:border-[#D97A34]">
                                    <input
                                      type="number"
                                      min="0.0001"
                                      step="any"
                                      id={`conv-factor-${idx}`}
                                      value={conv.conversion_factor ?? ""}
                                      placeholder="e.g., 125"
                                      onChange={(e) =>
                                        handleUpdateConversionRule(
                                          idx,
                                          "conversion_factor",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-24 px-3 py-1.5 text-xs font-bold text-[#0F0F0F] font-mono bg-transparent focus:outline-none"
                                    />
                                    <span className="px-2.5 py-1.5 text-[11px] font-semibold text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF] whitespace-nowrap select-none">
                                      {baseCode} / {conv.recipe_unit}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Yield Factor (Derived) */}
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  <div className="flex items-center rounded-lg border border-[#E5E3DF] overflow-hidden bg-white focus-within:border-[#D97A34]">
                                    <input
                                      type="number"
                                      min="0.0001"
                                      step="any"
                                      id={`yield-factor-${idx}`}
                                      value={conv.yield_factor}
                                      onChange={(e) =>
                                        handleUpdateConversionRule(
                                          idx,
                                          "yield_factor",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-24 px-3 py-1.5 text-xs font-bold text-[#0F0F0F] font-mono bg-transparent focus:outline-none"
                                    />
                                    <span className="px-2.5 py-1.5 text-[11px] font-semibold text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF] whitespace-nowrap select-none">
                                      {conv.recipe_unit}s / {form.packageType}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Normalized Micro-Cost */}
                              <td className="py-3 px-4 text-right">
                                <div className="font-bold text-sm text-[#4A7C59] font-mono">
                                  {fmt(microCost)}
                                  <span className="text-[11px] font-normal text-[#6B6B6B] ml-1">
                                    / {conv.recipe_unit}
                                  </span>
                                </div>
                              </td>

                              {/* Action: Delete Rule */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={form.conversions.length <= 1}
                                  onClick={() => handleDeleteConversionRule(idx)}
                                  className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                  title={
                                    form.conversions.length <= 1
                                      ? "At least one conversion rule is required"
                                      : "Delete conversion rule"
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {errors.conversions && (
                    <p className="text-xs text-rose-500 font-medium">{errors.conversions}</p>
                  )}

                  {/* Quick Presets Toolbar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-[#6B6B6B] mb-2">
                      <span className="font-bold text-[#0F0F0F]">
                        ⚡ Quick Package &amp; Culinary Conversion Presets:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {PACKAGE_CONTENT_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            const autoCup = calculateAutoYield(p.netQuantity, p.netUnit, "Cup", p.label);
                            const autoGram = calculateAutoYield(p.netQuantity, p.netUnit, "Gram", p.label);
                            const autoTbsp = calculateAutoYield(p.netQuantity, p.netUnit, "Tablespoon", p.label);
                            setForm({
                              ...form,
                              packageType: p.packageType,
                              netQuantity: p.netQuantity,
                              netUnit: p.netUnit,
                              recipeUnit: p.recipeUnit,
                              yieldFactor: p.yieldFactor,
                              purchaseUnit: `${p.packageType} (${p.netQuantity} ${p.netUnit})`,
                              category: p.category || form.category,
                              conversions: [
                                { recipe_unit: p.recipeUnit, yield_factor: p.yieldFactor },
                                { recipe_unit: "Gram", yield_factor: autoGram },
                                { recipe_unit: "Tablespoon", yield_factor: autoTbsp },
                              ],
                            });
                          }}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#F9F8F6] hover:bg-white text-[#0F0F0F] transition-colors border border-[#E5E3DF] hover:border-[#D97A34] cursor-pointer"
                          title={p.hint}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section D: Summary Hero Ribbon */}
                <div className="rounded-2xl p-5 bg-[#F9F8F6] border border-[#E5E3DF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-[#0F0F0F] text-white font-bold text-base flex items-center justify-center shrink-0">
                      ₱
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0F0F0F] uppercase tracking-wider">
                        Calculated Recipe Cost
                      </h4>
                      <p className="text-xs text-[#6B6B6B] mt-0.5">
                        {form.conversions.length} active conversion rule(s) mapped to recipe builders
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-bold tracking-tight text-[#4A7C59] font-mono">
                      {fmt(calculatedModalCost)}
                      <span className="text-xs font-semibold text-[#6B6B6B] ml-1">
                        / {form.recipeUnit || "unit"}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] font-medium mt-0.5">
                      {form.yieldFactor > 0
                        ? `Primary: 1 ${form.packageType} (${form.netQuantity} ${form.netUnit}) = ${form.yieldFactor} ${form.recipeUnit}s`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Purchase Records & Multi-Supplier Tracking */}
                {editTarget && editTarget.purchases && editTarget.purchases.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F0F0F]">
                      <ShoppingBag className="w-4 h-4 text-[#D97A34]" />
                      <span>PURCHASE RECORDS &amp; SUPPLIER HISTORY</span>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-[#E5E3DF] bg-white">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F9F8F6] border-b border-[#E5E3DF] text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                            <th className="py-2.5 px-4 text-left">Supplier</th>
                            <th className="py-2.5 px-4 text-left">Package Quantity</th>
                            <th className="py-2.5 px-4 text-right">Purchase Price</th>
                            <th className="py-2.5 px-4 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E3DF]">
                          {editTarget.purchases.map((p) => (
                            <tr key={p.purchase_id} className="even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-[#0F0F0F]">
                                {p.supplier_name || "Primary Supplier"}
                              </td>
                              <td className="py-2.5 px-4 text-[#6B6B6B]">
                                {p.package_quantity} {form.packageType}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-[#4A7C59] font-mono">
                                {fmt(p.purchase_price)}
                              </td>
                              <td className="py-2.5 px-4 text-right text-[#6B6B6B] text-[11px] font-mono">
                                {new Date(p.purchase_date).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="p-6 md:p-8 pt-4 border-t border-[#E5E3DF] bg-[#F9F8F6] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                {!editTarget && (
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-white text-[#4A7C59] border border-[#4A7C59] hover:bg-[#4A7C59]/5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving && <Spinner className="w-3.5 h-3.5 text-[#4A7C59] animate-spin" />}
                    <span>{saving ? "Saving..." : "Save & Add Another"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  id="save-ingredient-btn"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Spinner className="w-4 h-4 text-white animate-spin" />
                      <span>{editTarget ? "Updating..." : "Adding Ingredient..."}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editTarget ? "Save Changes" : "+ Add Ingredient"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Bulk Price Update Modal ── */}
        {bulkModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0F0F]/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setBulkModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white border border-[#E5E3DF] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-5 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E5E3DF] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#D97A34]/10 text-[#D97A34] flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F0F0F]">
                      Bulk Price Adjustment
                    </h3>
                    <p className="text-xs text-[#6B6B6B]">
                      Apply percentage change across {selectedIds.length > 0 ? selectedIds.length : pricedCount} items
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="p-1 rounded-lg text-[#6B6B6B] hover:text-[#0F0F0F]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-[#6B6B6B] leading-relaxed">
                  Adjust supplier purchase prices to simulate inflation, supplier contract updates, or currency exchange variations:
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.5"
                    value={bulkAdjustmentPct}
                    onChange={(e) => setBulkAdjustmentPct(parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 text-sm rounded-lg bg-white border border-[#E5E3DF] text-[#0F0F0F] font-bold font-mono text-center"
                  />
                  <span className="font-bold text-[#0F0F0F]">% Adjustment</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[2, 5, 8, 10, -5].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setBulkAdjustmentPct(pct)}
                      className="px-2.5 py-1 rounded-lg bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] font-semibold font-mono hover:border-[#D97A34] transition-colors"
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E3DF]">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkUpdate}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0F0F]/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white border border-[#E5E3DF] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#0F0F0F]">
                  Delete Ingredient
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-[#0F0F0F]">{deleteTarget.name}</strong>? This will remove it from any recipe formulas currently referencing it.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  id="confirm-delete-btn"
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer"
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

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
  DollarSign,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ShoppingBag,
  PackageCheck,
} from "lucide-react";
import {
  calculateRecipeCost,
  getIngredients,
  updateRecipe,
  upsertRecipeIngredient,
  removeRecipeIngredient,
  removeRecipePackaging,
  exportDataCsv,
  type RecipeCostResult,
  type Ingredient,
  type RecipeInput,
  type ProduceBatchSuccess,
  type ProductionError,
  type StockDeficit,
} from "@/lib/api";
import { ProductionTriggerPanel } from "@/components/ProductionTriggerPanel";
import { StockDeficitModal } from "@/components/StockDeficitModal";
import { ReceiveDeliveryModal } from "@/components/ReceiveDeliveryModal";
import { ReceivePackagingModal } from "@/components/ReceivePackagingModal";
import { AddPackagingModal } from "@/components/AddPackagingModal";
import { Header } from "@/components/Header";
import { Spinner, Tooltip } from "@/components/ui";
import { useApp } from "@/context/AppContext";

function getModalIngredientCategory(name: string): "sweeteners" | "baking" | "dairy" | "produce" | "other" {
  const n = name.toLowerCase();
  if (
    n.includes("sugar") ||
    n.includes("syrup") ||
    n.includes("honey") ||
    n.includes("sweetener") ||
    n.includes("molasses")
  ) {
    return "sweeteners";
  }
  if (
    n.includes("flour") ||
    n.includes("baking powder") ||
    n.includes("baking soda") ||
    n.includes("yeast") ||
    n.includes("cocoa") ||
    n.includes("chocolate") ||
    n.includes("vanilla") ||
    n.includes("cornstarch") ||
    n.includes("oat")
  ) {
    return "baking";
  }
  if (
    n.includes("butter") ||
    n.includes("milk") ||
    n.includes("cheese") ||
    n.includes("cream") ||
    n.includes("oil") ||
    n.includes("fat") ||
    n.includes("egg") ||
    n.includes("margarine")
  ) {
    return "dairy";
  }
  if (
    n.includes("banana") ||
    n.includes("apple") ||
    n.includes("fruit") ||
    n.includes("lemon") ||
    n.includes("berry") ||
    n.includes("carrot") ||
    n.includes("nut")
  ) {
    return "produce";
  }
  return "other";
}

const MODAL_MEASURE_UNITS = [
  { label: "Grams (g)", value: "Gram" },
  { label: "Kilograms (kg)", value: "Kilogram" },
  { label: "Cups", value: "Cup" },
  { label: "Tablespoons (tbsp)", value: "tbsp" },
  { label: "Teaspoons (tsp)", value: "tsp" },
  { label: "Milliliters (ml)", value: "ml" },
  { label: "Pieces (pcs)", value: "pc" },
];

export default function RecipeBuilder() {
  const { id } = useParams<{ id: string }>();
  const recipeId = parseInt(id || "0", 10);
  const navigate = useNavigate();
  const { fmt } = useApp();

  const [result, setResult] = useState<RecipeCostResult | null>(null);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const unpricedCount = useMemo(
    () => allIngredients.filter((i) => i.purchase_price <= 0).length,
    [allIngredients]
  );
  const [saving, setSaving] = useState(false);
  const [committedFeedback, setCommittedFeedback] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Sorting and filtering in table
  const [ingSortBy, setIngSortBy] = useState<"default" | "name" | "cost">("default");

  // Recipe settings edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<RecipeInput | null>(null);

  // Add ingredient modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedIngId, setSelectedIngId] = useState<number | null>(null);
  const [selectedConversionId, setSelectedConversionId] = useState<number | null>(null);
  const [selectedMeasureUnit, setSelectedMeasureUnit] = useState<string>("");
  const [batchQty, setBatchQty] = useState<number>(0);
  const [addSearch, setAddSearch] = useState("");
  const [addCategory, setAddCategory] = useState<string>("all");
  const [addSaving, setAddSaving] = useState(false);
  const [addModalLoading, setAddModalLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add Packaging Modal State
  const [addPkgModalOpen, setAddPkgModalOpen] = useState(false);

  // Production Execution & Stock Deficit Modal State
  const [deficitModalOpen, setDeficitModalOpen] = useState(false);
  const [activeDeficits, setActiveDeficits] = useState<StockDeficit[]>([]);
  const [failedBatches, setFailedBatches] = useState<number>(1);
  const [receiveDeliveryModalOpen, setReceiveDeliveryModalOpen] = useState(false);
  const [preselectedReceiveIngId, setPreselectedReceiveIngId] = useState<number | null>(null);

  const [receivePackagingModalOpen, setReceivePackagingModalOpen] = useState(false);
  const [preselectedReceivePkgId, setPreselectedReceivePkgId] = useState<number | null>(null);

  // Floating Toast Notification
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = useCallback(
    (title: string, message: string, type: "success" | "error" | "info" = "success") => {
      setToast({ show: true, title, message, type });
    },
    []
  );

  const handleProductionSuccess = (res: ProduceBatchSuccess) => {
    showToast(
      "Batch Production Recorded",
      `Successfully produced ${res.batches_produced} batch(es) of "${res.recipe_name}". Perpetual inventory was deducted.`,
      "success"
    );
    load();
  };

  const handleProductionError = (err: ProductionError) => {
    if (err.deficits && err.deficits.length > 0) {
      setActiveDeficits(err.deficits);
      setDeficitModalOpen(true);
    } else {
      showToast(
        "Production Interrupted",
        err.message || "Failed to execute production run.",
        "error"
      );
    }
  };

  const handleQuickReceiveFromDeficit = (itemName: string, itemType?: string) => {
    setDeficitModalOpen(false);
    if (itemType === "packaging") {
      const match = result?.packaging_items?.find(
        (p) => p.packaging_name.toLowerCase() === itemName.toLowerCase()
      );
      setPreselectedReceivePkgId(match ? match.packaging_id : null);
      setReceivePackagingModalOpen(true);
    } else {
      const match = allIngredients.find(
        (i) => i.name.toLowerCase() === itemName.toLowerCase()
      );
      setPreselectedReceiveIngId(match ? match.ingredient_id : null);
      setReceiveDeliveryModalOpen(true);
    }
  };

  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => {
        setToast((prev) => (prev ? { ...prev, show: false } : null));
      }, 3800);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!addModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddModalOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addModalOpen]);

  const openAddModal = () => {
    setAddSearch("");
    setAddCategory("all");
    setSelectedIngId(null);
    setSelectedConversionId(null);
    setSelectedMeasureUnit("");
    setBatchQty(0);
    setAddModalLoading(true);
    setAddModalOpen(true);
    setTimeout(() => {
      setAddModalLoading(false);
      searchInputRef.current?.focus();
    }, 180);
  };

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
      other_overhead: 0,
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
          other_overhead: 0,
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
        other_overhead: 0,
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
    if (!selectedIngId || batchQty <= 0 || addSaving) return;
    setAddSaving(true);
    try {
      await upsertRecipeIngredient(recipeId, {
        ingredient_id: selectedIngId,
        conversion_id: selectedConversionId ?? undefined,
        batch_qty: batchQty,
      });
      const addedIng = allIngredients.find((i) => i.ingredient_id === selectedIngId);
      const lineCost = batchLineCost;

      setAddModalOpen(false);
      setSelectedIngId(null);
      setSelectedConversionId(null);
      setSelectedMeasureUnit("");
      setBatchQty(0);
      setAddSearch("");
      showToast(
        "Ingredient Added to Recipe",
        `Successfully added ${batchQty} ${activeRecipeUnit} of ${addedIng?.name || "ingredient"} (${fmt(lineCost)}) to formula.`,
        "success"
      );
      await load();
    } catch (err: any) {
      showToast(
        "Failed to Add Ingredient",
        err?.message || "An unexpected error occurred while adding ingredient.",
        "error"
      );
    } finally {
      setAddSaving(false);
    }
  };

  const handleRemoveIngredient = async (id: number) => {
    await removeRecipeIngredient(id);
    await load();
  };

  const handleUpdateQty = async (id: number, ingredient_id: number, qty: number, conversion_id?: number | null) => {
    if (qty <= 0) return;
    await upsertRecipeIngredient(recipeId, {
      id,
      ingredient_id,
      conversion_id: conversion_id ?? undefined,
      batch_qty: qty,
    });
    await load();
  };

  const handleUpdateConversion = async (id: number, ingredient_id: number, conversion_id: number, qty: number) => {
    try {
      await upsertRecipeIngredient(recipeId, {
        id,
        ingredient_id,
        conversion_id,
        batch_qty: qty,
      });
      await load();
      showToast("Conversion Updated", "Recipe unit conversion updated successfully.", "success");
    } catch (err: any) {
      showToast("Update Failed", err?.message || "Could not update conversion unit.", "error");
    }
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

  const availableIngredients = useMemo(() => {
    if (!result) return allIngredients;
    return allIngredients.filter((i) => {
      const lineItemsForIng = result.line_items.filter((li) => li.ingredient_id === i.ingredient_id);
      // If not yet in recipe, it's always available
      if (lineItemsForIng.length === 0) return true;
      // Single Kitchen Recipe Unit: strictly not allowed to have multiple occurrences
      const conversions = i.conversions && i.conversions.length > 0 ? i.conversions : [];
      if (conversions.length <= 1) return false;
      // Multiple conversion units: allow if there is at least one conversion not yet added to this recipe
      const usedConversionIds = new Set(
        lineItemsForIng.map((li) => li.conversion_id).filter((cid): cid is number => cid != null)
      );
      return conversions.some((c) => c.conversion_id != null && !usedConversionIds.has(c.conversion_id));
    });
  }, [allIngredients, result]);

  const categoryCounts = useMemo(() => {
    return {
      all: availableIngredients.length,
      sweeteners: availableIngredients.filter((i) => getModalIngredientCategory(i.name) === "sweeteners").length,
      baking: availableIngredients.filter((i) => getModalIngredientCategory(i.name) === "baking").length,
      dairy: availableIngredients.filter((i) => getModalIngredientCategory(i.name) === "dairy").length,
      produce: availableIngredients.filter((i) => getModalIngredientCategory(i.name) === "produce").length,
    };
  }, [availableIngredients]);

  const filteredIngredients = useMemo(() => {
    return availableIngredients.filter((i) => {
      const matchesSearch = i.name.toLowerCase().includes(addSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (addCategory === "all") return true;
      return getModalIngredientCategory(i.name) === addCategory;
    });
  }, [availableIngredients, addSearch, addCategory]);

  const selectedIng = allIngredients.find((i) => i.ingredient_id === selectedIngId);

  const handleSelectIngredient = (ing: Ingredient) => {
    setSelectedIngId(ing.ingredient_id);

    // Identify which conversions are already used in this recipe
    const lineItemsForIng = result?.line_items.filter((li) => li.ingredient_id === ing.ingredient_id) || [];
    const usedConversionIds = new Set(
      lineItemsForIng.map((li) => li.conversion_id).filter((cid): cid is number => cid != null)
    );

    // Pick first unused conversion, or fallback to first conversion
    const availableConvs = ing.conversions?.filter((c) => c.conversion_id != null && !usedConversionIds.has(c.conversion_id)) || [];
    const chosenConv = availableConvs[0] || (ing.conversions && ing.conversions[0]) || null;

    if (chosenConv) {
      setSelectedConversionId(chosenConv.conversion_id);
      setSelectedMeasureUnit(chosenConv.recipe_unit);
    } else {
      setSelectedConversionId(null);
      setSelectedMeasureUnit(ing.recipe_unit);
    }

    // Pre-populate sensible default batchQty if currently 0
    if (batchQty <= 0) {
      const unit = (chosenConv?.recipe_unit || ing.recipe_unit || "").toLowerCase();
      if (unit.includes("gram") || unit === "g") {
        setBatchQty(250);
      } else if (unit.includes("cup")) {
        setBatchQty(1);
      } else if (unit.includes("pc")) {
        setBatchQty(1);
      } else if (unit.includes("ml")) {
        setBatchQty(250);
      } else if (unit.includes("tbsp") || unit.includes("tablespoon")) {
        setBatchQty(2);
      } else if (unit.includes("tsp") || unit.includes("teaspoon")) {
        setBatchQty(1);
      } else {
        setBatchQty(1);
      }
    }
  };

  const activeConversion = useMemo(() => {
    if (!selectedIng) return null;
    if (selectedConversionId && selectedIng.conversions) {
      return (
        selectedIng.conversions.find((c) => c.conversion_id === selectedConversionId) ??
        selectedIng.conversions[0] ??
        null
      );
    }
    return selectedIng.conversions?.[0] ?? null;
  }, [selectedIng, selectedConversionId]);

  const activeYieldFactor =
    activeConversion?.yield_factor ?? selectedIng?.yield_factor ?? 1;
  const activeRecipeUnit =
    activeConversion?.recipe_unit ?? selectedMeasureUnit ?? selectedIng?.recipe_unit ?? "unit";

  const activeUnitCost =
    selectedIng && activeYieldFactor > 0 && selectedIng.purchase_price > 0
      ? selectedIng.purchase_price / activeYieldFactor
      : 0;

  const batchLineCost = batchQty * activeUnitCost;

  const handleStepQty = (direction: -1 | 1) => {
    if (!selectedIng) return;
    const unit = activeRecipeUnit.toLowerCase();
    let step = 1;
    if (unit.includes("gram") || unit === "g" || unit.includes("ml")) {
      step = 50;
    } else if (unit.includes("cup") || unit.includes("kg")) {
      step = 0.25;
    } else if (unit.includes("tbsp") || unit.includes("tsp")) {
      step = 0.5;
    } else {
      step = 1;
    }
    setBatchQty((prev) => {
      const next = prev + direction * step;
      return next <= 0 ? 0 : Number(next.toFixed(2));
    });
  };

  const currentPresets = useMemo(() => {
    if (!selectedIng) return [];
    const unit = activeRecipeUnit.toLowerCase();
    const name = selectedIng.name.toLowerCase();

    if (unit.includes("gram") || unit === "g") {
      let cupEquivalent = 120;
      if (name.includes("sugar")) cupEquivalent = 200;
      else if (name.includes("butter")) cupEquivalent = 227;
      else if (name.includes("liquid") || name.includes("milk") || name.includes("water") || name.includes("oil")) cupEquivalent = 240;

      return [
        { label: "+50g", type: "add" as const, value: 50 },
        { label: "+100g", type: "add" as const, value: 100 },
        { label: "250g", type: "set" as const, value: 250 },
        { label: "1 Cup", type: "set" as const, value: cupEquivalent },
      ];
    }

    if (unit.includes("cup")) {
      return [
        { label: "+0.25", type: "add" as const, value: 0.25 },
        { label: "+0.5", type: "add" as const, value: 0.5 },
        { label: "1 Cup", type: "set" as const, value: 1 },
        { label: "2 Cups", type: "set" as const, value: 2 },
      ];
    }

    if (unit.includes("tbsp") || unit.includes("tablespoon")) {
      return [
        { label: "+1 tbsp", type: "add" as const, value: 1 },
        { label: "+2 tbsp", type: "add" as const, value: 2 },
        { label: "4 tbsp", type: "set" as const, value: 4 },
        { label: "8 tbsp", type: "set" as const, value: 8 },
      ];
    }

    if (unit.includes("tsp") || unit.includes("teaspoon")) {
      return [
        { label: "+0.5 tsp", type: "add" as const, value: 0.5 },
        { label: "+1 tsp", type: "add" as const, value: 1 },
        { label: "3 tsp", type: "set" as const, value: 3 },
        { label: "6 tsp", type: "set" as const, value: 6 },
      ];
    }

    if (unit.includes("ml")) {
      return [
        { label: "+50ml", type: "add" as const, value: 50 },
        { label: "+100ml", type: "add" as const, value: 100 },
        { label: "250ml", type: "set" as const, value: 250 },
        { label: "1 Cup", type: "set" as const, value: 240 },
      ];
    }

    if (unit.includes("pc")) {
      return [
        { label: "+1 pc", type: "add" as const, value: 1 },
        { label: "+2 pcs", type: "add" as const, value: 2 },
        { label: "6 pcs", type: "set" as const, value: 6 },
        { label: "12 pcs", type: "set" as const, value: 12 },
      ];
    }

    return [
      { label: "+1", type: "add" as const, value: 1 },
      { label: "+5", type: "add" as const, value: 5 },
      { label: "10", type: "set" as const, value: 10 },
      { label: "25", type: "set" as const, value: 25 },
    ];
  }, [selectedIng, activeRecipeUnit]);

  const handleApplyPreset = (preset: { label: string; type: "add" | "set"; value: number }) => {
    if (preset.type === "set") {
      setBatchQty(preset.value);
    } else {
      setBatchQty((prev) => Number((prev + preset.value).toFixed(2)));
    }
  };

  const isPresetActive = (preset: { label: string; type: "add" | "set"; value: number }) => {
    if (preset.type === "set") {
      return Math.abs(batchQty - preset.value) < 0.01;
    }
    return false;
  };

  const categoryPills = [
    { id: "all", label: "All Pantry", count: availableIngredients.length },
    { id: "sweeteners", label: "Sweeteners", count: categoryCounts.sweeteners },
    { id: "baking", label: "Baking & Grains", count: categoryCounts.baking },
    { id: "dairy", label: "Dairy & Fats", count: categoryCounts.dairy },
    { id: "produce", label: "Produce", count: categoryCounts.produce },
  ];

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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-artisan-canvas dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 transition-colors">
        <Header unpricedCount={unpricedCount} />
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Spinner className="w-10 h-10 text-emerald-600" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-artisan-canvas dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 transition-colors">
        <Header unpricedCount={unpricedCount} />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium">Recipe formula not found.</p>
          <button
            onClick={() => navigate("/recipes")}
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
          >
            ← Return to Recipe Master
          </button>
        </div>
      </div>
    );
  }

  const r = result.recipe;

  // Overhead percentages for the visual distribution bar
  const overheadBase = r.labor_cost + r.electricity_cost;
  const laborPct =
    overheadBase > 0
      ? Math.round((r.labor_cost / overheadBase) * 100)
      : 0;
  const utilPct = overheadBase > 0 ? 100 - laborPct : 0;

  // Direct materials metrics (Raw Ingredients + Packaging)
  const rawIngredientsCost = result.total_ingredient_cost ?? result.total_variable_cost;
  const packagingMaterialsCost = result.total_packaging_cost || 0;
  const totalDirectMaterials = rawIngredientsCost + packagingMaterialsCost;
  const directMaterialsPerUnit = r.yield_qty > 0 ? totalDirectMaterials / r.yield_qty : 0;
  const ingMaterialsRatio =
    totalDirectMaterials > 0 ? Math.round((rawIngredientsCost / totalDirectMaterials) * 100) : 0;
  const pkgMaterialsRatio = totalDirectMaterials > 0 ? 100 - ingMaterialsRatio : 0;

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
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-artisan-canvas dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 transition-colors">
      <Header unpricedCount={unpricedCount} />
      <div className="flex-1 p-6 md:p-8 space-y-6 print:p-4 w-full" ref={printRef}>
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
        </div>
      </div>

      {/* ── Page Header: Title, Tags & Action Buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {r.name}
            </h1>
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

      {/* ── Production Execution Ribbon ── */}
      <div className="print:hidden">
        <ProductionTriggerPanel
          recipeId={recipeId}
          recipeName={r.name}
          onSuccess={handleProductionSuccess}
          onError={handleProductionError}
          disabled={result.line_items.length === 0}
        />
      </div>

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
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Ingredient</span>
                </button>

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
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="text-left py-3 pr-4">Ingredient</th>
                    <th className="text-right py-3 px-3">Purchase Price</th>
                    <th className="text-right py-3 px-3">Base &amp; Unit Cost</th>
                    <th className="text-center py-3 px-3">Recipe Qty</th>
                    <th className="text-right py-3 pl-3">Line Cost</th>
                    <th className="w-8 py-3 pl-2 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Box className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">No raw ingredients added yet.</p>
                        <button
                          onClick={openAddModal}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Ingredient</span>
                        </button>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {li.ingredient_name}
                            </span>
                            {li.is_orphaned_conversion && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                                ⚠️ Unit configuration missing. Please reselect.
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                            <span>
                              {li.purchase_unit || (li.package_type ? `${li.package_type} (${li.net_quantity} ${li.net_unit})` : "Package")}
                              {li.yield_factor > 0 && (
                                <span className="text-slate-400 dark:text-slate-500 ml-1 font-medium">
                                  • {li.yield_factor.toFixed(1)} {li.recipe_unit}s/pack
                                </span>
                              )}
                              {li.net_quantity && li.net_quantity > 0 && li.purchase_price > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                                  ({fmt(li.purchase_price / li.net_quantity)}/{li.net_unit || "unit"})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Purchase Price */}
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                          {fmt(li.purchase_price)}
                        </td>

                        {/* Base & Unit Cost */}
                        <td className="py-3.5 px-3 text-right tabular-nums">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {fmt(li.normalized_unit_cost)}
                          </span>
                          <span className="text-[11px] text-slate-400 block">/{li.recipe_unit}</span>
                          {li.base_unit_cost != null && li.base_unit_code && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold mt-0.5">
                              Base: {fmt(li.base_unit_cost)}/{li.base_unit_code}
                            </span>
                          )}
                        </td>

                        {/* Recipe Qty (Inline Input) */}
                        <td className="py-3.5 px-3 text-center">
                          <div className={`inline-flex items-center rounded-xl border overflow-hidden transition-all ${
                            li.is_orphaned_conversion
                              ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/20"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121826] focus-within:border-emerald-500"
                          }`}>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              defaultValue={li.batch_qty}
                              onBlur={(e) =>
                                handleUpdateQty(li.id, li.ingredient_id, parseFloat(e.target.value) || 0, li.conversion_id)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                   (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-16 px-2.5 py-1 text-xs text-center bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none tabular-nums"
                              id={`batch-qty-${li.id}`}
                            />
                            {(() => {
                              const parent = allIngredients.find((i) => i.ingredient_id === li.ingredient_id);
                              const availableConvs = parent?.conversions || [];
                              if (availableConvs.length > 1 || li.is_orphaned_conversion) {
                                return (
                                  <div className="relative border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#182030]">
                                    <select
                                      value={li.conversion_id ?? ""}
                                      onChange={(e) => {
                                        const newCid = parseInt(e.target.value, 10);
                                        if (newCid) {
                                          handleUpdateConversion(li.id, li.ingredient_id, newCid, li.batch_qty);
                                        }
                                      }}
                                      title="Change formula recipe unit"
                                      className={`px-2 py-1 pr-6 text-[11px] font-semibold bg-transparent appearance-none focus:outline-none cursor-pointer ${
                                        li.is_orphaned_conversion
                                          ? "text-amber-700 dark:text-amber-400 font-bold"
                                          : "text-slate-600 dark:text-slate-300"
                                      }`}
                                    >
                                      {li.is_orphaned_conversion && (
                                        <option value="" disabled>⚠️ Reselect</option>
                                      )}
                                      {availableConvs.map((c) => {
                                        const isUsedByOtherRow = result?.line_items.some(
                                          (otherLi) => otherLi.id !== li.id && otherLi.ingredient_id === li.ingredient_id && otherLi.conversion_id === c.conversion_id
                                        );
                                        return (
                                          <option key={c.conversion_id} value={c.conversion_id} disabled={isUsedByOtherRow} className="text-slate-900 dark:text-white bg-white dark:bg-[#121826]">
                                            {c.recipe_unit} {isUsedByOtherRow ? "(in use)" : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                );
                              }
                              return (
                                <span className="px-2 py-1 text-[11px] font-semibold text-slate-400 bg-slate-50 dark:bg-[#182030] border-l border-slate-200 dark:border-slate-800">
                                  {li.recipe_unit}
                                </span>
                              );
                            })()}
                          </div>
                          {li.normalized_quantity != null && li.base_unit_code && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-medium mt-0.5" title="Normalized canonical base quantity used for costing">
                              ≈ {li.normalized_quantity.toFixed(1)} {li.base_unit_code}
                            </span>
                          )}
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
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors print:hidden cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Row</span>
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Subtotal Ingredients:{" "}
                  <strong className="font-black text-slate-900 dark:text-white text-sm">
                    {fmt(result.total_ingredient_cost ?? result.total_variable_cost)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* ── Card: Recipe Packaging & Presentation ── */}
          <div className="relative overflow-hidden rounded-3xl p-6 bg-white/90 dark:bg-[#0c101a] backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                      Recipe Packaging &amp; Presentation
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                      {result.packaging_items?.length || 0} items
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Direct packaging materials, boxes, liners, and containers allocated per batch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
                <button
                  type="button"
                  onClick={() => setAddPkgModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    text-white bg-amber-600 hover:bg-amber-500 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Packaging</span>
                </button>
              </div>
            </div>

            {/* Packaging Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="text-left py-3 pr-4">Packaging Material</th>
                    <th className="text-left py-3 px-3">Type</th>
                    <th className="text-right py-3 px-3">Unit Cost</th>
                    <th className="text-center py-3 px-3">Batch Qty</th>
                    <th className="text-right py-3 pl-3">Line Cost</th>
                    <th className="w-8 py-3 pl-2 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {!result.packaging_items || result.packaging_items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                        <Box className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                        <p className="font-semibold text-sm">No packaging materials assigned to this recipe.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Product will be calculated without packaging containers (bulk unpackaged product).
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddPkgModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Packaging</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    result.packaging_items.map((pkg) => (
                      <tr
                        key={pkg.id}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {pkg.packaging_name}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              SKU: {pkg.packaging_code}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                            {pkg.packaging_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {fmt(pkg.current_unit_cost)} / {pkg.unit}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            {pkg.batch_qty}
                          </span>{" "}
                          <span className="text-[11px] text-slate-400 font-sans">{pkg.unit}s</span>
                        </td>

                        <td className="py-3.5 pl-3 text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {fmt(pkg.line_item_cost)}
                        </td>

                        <td className="py-3.5 pl-2 text-right print:hidden">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await removeRecipePackaging(pkg.id);
                                load();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove packaging from recipe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Packaging Card Footer */}
            {result.packaging_items && result.packaging_items.length > 0 && (
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  Packaging items deduct automatically during batch production.
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Subtotal Packaging:{" "}
                  <strong className="font-black text-amber-700 dark:text-amber-400 text-sm font-mono">
                    {fmt(result.total_packaging_cost || 0)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* ── Card: Consolidated Direct Materials Summary ── */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-white/95 via-emerald-50/20 to-white/95 dark:from-[#0c101a] dark:via-emerald-950/10 dark:to-[#0c101a] backdrop-blur-xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-300/60 dark:border-emerald-700/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                      Total Direct Materials
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/40">
                      Consolidated
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Combined raw ingredients & packaging materials cost per batch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-300/60 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs tabular-nums">
                  <span>Unit Material Cost:</span>
                  <span className="font-extrabold font-mono text-sm">{fmt(directMaterialsPerUnit)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">/ unit</span>
                </span>
              </div>
            </div>

            {/* 3-Column Metric Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-2xl p-3 bg-white/80 dark:bg-[#121826]/80 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Ingredients Subtotal:</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                    {result.line_items.length} items
                  </span>
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums font-mono">
                  {fmt(rawIngredientsCost)}
                </div>
              </div>

              <div className="rounded-2xl p-3 bg-white/80 dark:bg-[#121826]/80 border border-slate-200/70 dark:border-slate-800/70 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Packaging Subtotal:</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                    {result.packaging_items?.length || 0} items
                  </span>
                </div>
                <div className="text-base font-extrabold text-amber-700 dark:text-amber-400 tabular-nums font-mono">
                  {fmt(packagingMaterialsCost)}
                </div>
              </div>

              <div className="rounded-2xl p-3 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300/70 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold">Total Direct Materials:</span>
                  <span className="text-[10px] font-mono font-semibold">100% Prime</span>
                </div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
                  {fmt(totalDirectMaterials)}
                </div>
              </div>
            </div>

            {/* Proportional Ratio Bar */}
            {totalDirectMaterials > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{ width: `${ingMaterialsRatio}%` }}
                    className="bg-emerald-500 transition-all duration-300"
                    title={`Ingredients: ${ingMaterialsRatio}%`}
                  />
                  <div
                    style={{ width: `${pkgMaterialsRatio}%` }}
                    className="bg-amber-500 transition-all duration-300"
                    title={`Packaging: ${pkgMaterialsRatio}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Ingredients Share ({ingMaterialsRatio}%)
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Packaging Share ({pkgMaterialsRatio}%)
                  </span>
                </div>
              </div>
            )}
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
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Overheads</span>
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

            {/* Cost Details & Visual Ratio Bar */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Raw Ingredients:</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {fmt(result.total_ingredient_cost ?? result.total_variable_cost)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Packaging &amp; Materials:</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {fmt(packagingMaterialsCost)}
                </span>
              </div>

              {/* Subtotal: Total Direct Materials */}
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800/80 font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Total Direct Materials:</span>
                </span>
                <div className="text-right">
                  <span className="font-black text-slate-900 dark:text-white tabular-nums font-mono">
                    {fmt(totalDirectMaterials)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-normal leading-tight">
                    {fmt(directMaterialsPerUnit)}/unit
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Fixed Overhead:</span>
                </span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {fmt(result.total_overhead)}
                </span>
              </div>

              {/* ── Visual Cost Ratio Distribution Bar ── */}
              {result.total_cost_per_batch > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
                    <div
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((result.total_ingredient_cost ?? result.total_variable_cost) /
                              result.total_cost_per_batch) *
                              100
                          )
                        )}%`,
                      }}
                      className="bg-emerald-500 transition-all duration-300"
                      title={`Ingredients: ${(
                        ((result.total_ingredient_cost ?? result.total_variable_cost) /
                          result.total_cost_per_batch) *
                        100
                      ).toFixed(1)}%`}
                    />
                    <div
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((result.total_packaging_cost || 0) / result.total_cost_per_batch) * 100
                          )
                        )}%`,
                      }}
                      className="bg-amber-500 transition-all duration-300"
                      title={`Packaging: ${(
                        ((result.total_packaging_cost || 0) / result.total_cost_per_batch) *
                        100
                      ).toFixed(1)}%`}
                    />
                    <div
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (result.total_overhead / result.total_cost_per_batch) * 100)
                        )}%`,
                      }}
                      className="bg-sky-500 transition-all duration-300"
                      title={`Overhead: ${(
                        (result.total_overhead / result.total_cost_per_batch) *
                        100
                      ).toFixed(1)}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {`${(((result.total_ingredient_cost ?? result.total_variable_cost) / result.total_cost_per_batch) * 100).toFixed(0)}% Ingredients`}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {`${(((result.total_packaging_cost || 0) / result.total_cost_per_batch) * 100).toFixed(0)}% Packaging`}
                    </span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">
                      {`${((result.total_overhead / result.total_cost_per_batch) * 100).toFixed(0)}% Overhead`}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                <span className="text-slate-900 dark:text-white">Total Batch Cost:</span>
                <span className="text-sm text-slate-900 dark:text-white tabular-nums font-mono font-black">
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
            <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Quick Markup Simulation:
                </span>
                {optimalMarkupPct > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    +{optimalMarkupPct}% needed for {fmt(r.desired_profit_alert)}
                  </span>
                )}
              </div>

              {/* Standard Industry Presets (20%, 30%, 40%, 50%, 60%, 75%, 100%) */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Standard Presets
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[20, 30, 40, 50, 60, 75, 100].map((pct) => {
                    const isActive = Math.round(r.target_markup_pct) === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleQuickMarkup(pct)}
                        className={`py-1.5 px-1.5 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer ${
                          isActive
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-extrabold ring-1 ring-emerald-500/50"
                            : "bg-white dark:bg-[#121826] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                        }`}
                        title={`Simulate +${pct}% markup`}
                        data-purpose={`quick-markup-preset-${pct}`}
                      >
                        +{pct}%
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Objective Tiers: Current & Benchmark Optimal */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickMarkup(r.target_markup_pct)}
                  className="py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                  data-purpose="quick-markup-current"
                >
                  +{r.target_markup_pct.toFixed(0)}% (Current)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickMarkup(optimalMarkupPct)}
                  disabled={optimalMarkupPct === 0}
                  className="py-1.5 px-2 rounded-xl text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-white dark:bg-[#121826] border-slate-200 dark:border-slate-800 hover:border-emerald-500
                    text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  data-purpose="quick-markup-optimal"
                >
                  +{optimalMarkupPct}% (Optimal)
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

              <div className="grid grid-cols-2 gap-3">
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

      {/* ── Add Ingredient to Recipe Modal (Reference Match & Luminous Design) ── */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 ${
          addModalOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setAddModalOpen(false)}
        />
        <div
          className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200/90 dark:border-slate-800
            bg-white dark:bg-[#0c101a] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 md:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0c101a] flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Add Ingredient to Recipe
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                    ₱ PHP
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Select an item from your pantry master inventory or convert units on the fly.
                </p>
              </div>
            </div>

            <button
              onClick={() => setAddModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1 bg-white dark:bg-[#0c101a]">
            {/* Search & Category Header Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>SEARCH PANTRY ITEMS</span>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {addSearch ? (
                    <span>
                      {filteredIngredients.length} {filteredIngredients.length === 1 ? "item" : "items"} matching "{addSearch}"
                    </span>
                  ) : (
                    <span>{filteredIngredients.length} items available</span>
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type ingredient name (e.g. Flour, Sugar, Butter)..."
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#141b2c] text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  {addSearch && (
                    <button
                      type="button"
                      onClick={() => setAddSearch("")}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c101a] text-[10px] font-mono font-medium text-slate-400 shadow-2xs">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {categoryPills.map((cat) => {
                  const isActive = addCategory === cat.id;
                  const showCount = cat.id !== "all" && cat.count > 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAddCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#0f766e] dark:bg-emerald-600 text-white font-bold shadow-xs"
                          : "bg-slate-100/90 dark:bg-[#141b2c] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 font-medium"
                      }`}
                    >
                      {cat.label} {showCount ? `(${cat.count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inventory List Header */}
            <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>INVENTORY ITEM & YIELD SPECIFICATION</span>
              <span>MASTER UNIT COST</span>
            </div>

            {/* Scrollable Inventory Items List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {addModalLoading ? (
                /* Shimmer loading skeletons */
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3, 4].map((s) => (
                    <div
                      key={s}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0f1422] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="h-3 w-48 rounded bg-slate-100 dark:bg-slate-800/60" />
                        </div>
                      </div>
                      <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : filteredIngredients.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#121826]/30">
                  <Box className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">No matching ingredients</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {addSearch
                      ? `No items match "${addSearch}". Try a different keyword or category.`
                      : "All ingredients in your inventory have already been added to this recipe."}
                  </p>
                </div>
              ) : (
                filteredIngredients.map((ing) => {
                  const isSelected = selectedIngId === ing.ingredient_id;
                  const unitCost =
                    ing.purchase_price > 0 && ing.yield_factor > 0
                      ? ing.purchase_price / ing.yield_factor
                      : 0;

                  return (
                    <div
                      key={ing.ingredient_id}
                      onClick={() => handleSelectIngredient(ing)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500 shadow-xs shadow-emerald-500/10"
                          : "bg-white dark:bg-[#0f1422] border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {ing.name}
                            </span>
                            {isSelected ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                Selected
                              </span>
                            ) : (() => {
                              const alreadyAddedCount = result?.line_items.filter((li) => li.ingredient_id === ing.ingredient_id).length || 0;
                              if (alreadyAddedCount > 0) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/50 shrink-0">
                                    Multi-unit ({alreadyAddedCount} in recipe)
                                  </span>
                                );
                              }
                              if (ing.purchase_price <= 0) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/50 shrink-0">
                                    Unpriced
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate font-medium">
                            Pkg: {ing.purchase_unit || (ing.package_type ? `${ing.package_type} (${ing.net_quantity ?? 1} ${ing.net_unit ?? "kg"})` : "Package")} • {ing.conversions && ing.conversions.length > 1 ? `${ing.conversions.length} Unit Types (${ing.conversions.map((c) => c.recipe_unit).join(", ")})` : `Yield: ${ing.yield_factor} ${ing.recipe_unit}s`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <div
                          className={`font-bold tabular-nums text-sm ${
                            isSelected
                              ? "text-emerald-600 dark:text-emerald-400"
                              : ing.purchase_price <= 0
                              ? "text-slate-400 dark:text-slate-500 font-semibold"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {fmt(unitCost)} / {ing.recipe_unit}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Configure Portion Drawer (When Selected) ── */}
            {selectedIng && (
              <div className="rounded-2xl p-4 sm:p-4.5 bg-slate-50/80 dark:bg-[#121826]/80 border border-slate-200/90 dark:border-slate-800 space-y-3.5 backdrop-blur-xs animate-in fade-in duration-150">
                {/* Portion Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Configure Portion: {selectedIng.name}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span>Active Unit Cost:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-[#182032] border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs shadow-2xs">
                      {fmt(activeUnitCost)} / {activeRecipeUnit}
                    </span>
                    {selectedIng.purchase_price > 0 && (
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                        ({fmt(selectedIng.purchase_price)} / {selectedIng.purchase_unit || selectedIng.package_type || "pkg"})
                      </span>
                    )}
                  </div>
                </div>

                {/* Input Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Batch Quantity with Stepper */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Batch Quantity ({activeRecipeUnit})
                      </label>
                      <span className="text-[10px] text-slate-400">e.g. 250 or 1.5</span>
                    </div>
                    <div className="flex rounded-xl overflow-hidden shadow-2xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c101a] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={batchQty === 0 ? "" : batchQty}
                        onChange={(e) => setBatchQty(parseFloat(e.target.value) || 0)}
                        placeholder="250"
                        className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none tabular-nums"
                      />
                      <div className="flex border-l border-slate-200 dark:border-slate-700 divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50 dark:bg-[#141b2c]">
                        <button
                          type="button"
                          onClick={() => handleStepQty(-1)}
                          disabled={batchQty <= 0}
                          className="px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-base flex items-center justify-center cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepQty(1)}
                          className="px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold text-base flex items-center justify-center cursor-pointer active:scale-90"
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Measure Unit Dropdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Recipe Measure Unit
                      </label>
                      {selectedIng.conversions && selectedIng.conversions.length > 1 && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {selectedIng.conversions.length} conversions
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      {selectedIng.conversions && selectedIng.conversions.length > 0 ? (
                        <select
                          value={selectedConversionId ?? selectedIng.conversions[0].conversion_id}
                          onChange={(e) => {
                            const cid = parseInt(e.target.value, 10);
                            setSelectedConversionId(cid);
                            const found = selectedIng.conversions?.find((c) => c.conversion_id === cid);
                            if (found) setSelectedMeasureUnit(found.recipe_unit);
                          }}
                          className="w-full appearance-none px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c101a] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer pr-9 shadow-2xs"
                        >
                          {selectedIng.conversions.map((conv) => {
                            const isAlreadyUsed = result?.line_items.some(
                              (li) => li.ingredient_id === selectedIng.ingredient_id && li.conversion_id === conv.conversion_id
                            );
                            return (
                              <option key={conv.conversion_id} value={conv.conversion_id} disabled={isAlreadyUsed}>
                                {conv.recipe_unit} {isAlreadyUsed ? "(Already in recipe)" : `— ${conv.yield_factor.toLocaleString()} ${conv.recipe_unit}s / bulk (${fmt(selectedIng.purchase_price / conv.yield_factor)}/${conv.recipe_unit})`}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <select
                          value={selectedMeasureUnit}
                          onChange={(e) => setSelectedMeasureUnit(e.target.value)}
                          className="w-full appearance-none px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c101a] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer pr-9 shadow-2xs"
                        >
                          <option value={selectedIng.recipe_unit}>
                            {selectedIng.recipe_unit} (Default)
                          </option>
                          {MODAL_MEASURE_UNITS.filter((u) => u.value !== selectedIng.recipe_unit).map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Presets and Batch Line Cost Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-semibold mr-1">Presets:</span>
                    {currentPresets.map((preset) => {
                      const isActive = isPresetActive(preset);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
                            isActive
                              ? "bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-2xs"
                              : "bg-white dark:bg-[#141b2c] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums shadow-xs flex items-center gap-1.5">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Batch Line Cost:</span>
                      <span>{fmt(batchLineCost)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 md:p-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0c101a] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={!selectedIngId || batchQty <= 0 || addSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {addSaving ? (
                <>
                  <Spinner className="w-3.5 h-3.5 text-white" />
                  <span>Adding Ingredient...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to Recipe</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stock Deficit Hard Stop Modal ── */}
      <StockDeficitModal
        isOpen={deficitModalOpen}
        onClose={() => setDeficitModalOpen(false)}
        recipeName={r.name}
        batches={failedBatches}
        deficits={activeDeficits}
        onQuickReceive={handleQuickReceiveFromDeficit}
      />

      {/* ── Quick Receive Delivery Modal ── */}
      <ReceiveDeliveryModal
        isOpen={receiveDeliveryModalOpen}
        onClose={() => setReceiveDeliveryModalOpen(false)}
        preselectedIngredientId={preselectedReceiveIngId}
        onSuccess={async (item) => {
          await load();
          setDeficitModalOpen(false);
          showToast(
            "Stock Intake Recorded",
            `Received delivery for ${item.name}. Active LRC price updated to ₱${item.purchase_price.toFixed(2)}.`,
            "success"
          );
        }}
      />

      {/* ── Quick Receive Packaging Modal ── */}
      <ReceivePackagingModal
        isOpen={receivePackagingModalOpen}
        onClose={() => setReceivePackagingModalOpen(false)}
        preselectedPackagingId={preselectedReceivePkgId}
        onSuccess={async () => {
          await load();
          setDeficitModalOpen(false);
          showToast(
            "Packaging Stock Intake Recorded",
            "Received packaging material delivery. Inventory balance updated.",
            "success"
          );
        }}
      />

      {/* ── Add Packaging Modal ── */}
      <AddPackagingModal
        isOpen={addPkgModalOpen}
        onClose={() => setAddPkgModalOpen(false)}
        recipeId={recipeId}
        onSuccess={load}
      />

      {/* ── Toast Notification Banner ── */}
      {toast?.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md max-w-sm ${
              toast.type === "success"
                ? "bg-white/95 dark:bg-[#0f1422]/95 border-emerald-500/80 shadow-emerald-500/10 text-slate-900 dark:text-white"
                : toast.type === "error"
                ? "bg-white/95 dark:bg-[#0f1422]/95 border-rose-500/80 shadow-rose-500/10 text-slate-900 dark:text-white"
                : "bg-white/95 dark:bg-[#0f1422]/95 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === "success"
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                  : toast.type === "error"
                  ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                  : "bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toast.type === "error" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-sm font-bold tracking-tight">{toast.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

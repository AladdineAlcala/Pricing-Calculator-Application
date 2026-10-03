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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F] transition-colors">
        <Header unpricedCount={unpricedCount} />
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Spinner className="w-10 h-10 text-[#D97A34]" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F] transition-colors">
        <Header unpricedCount={unpricedCount} />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
          <p className="text-[#6B6B6B] font-medium">Recipe formula not found.</p>
          <button
            onClick={() => navigate("/recipes")}
            className="text-[#D97A34] font-bold hover:underline cursor-pointer"
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
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F] transition-colors">
      <Header unpricedCount={unpricedCount} />
      <div className="flex-1 p-6 md:p-8 space-y-6 print:p-4 w-full" ref={printRef}>
        {/* ── Top Breadcrumb & Status Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-[#E5E3DF] pb-4 print:hidden">
        <div className="flex items-center gap-2 text-[#6B6B6B] flex-wrap">
          <button
            onClick={() => navigate("/recipes")}
            className="flex items-center gap-1.5 hover:text-[#D97A34] font-semibold transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Recipes</span>
          </button>
          <span>/</span>
          <span className="hover:text-[#0F0F0F] transition-colors">
            Recipe Formulas & Pricing
          </span>
          <span>/</span>
          <span className="font-bold text-[#0F0F0F]">
            {r.name} ({skuCode})
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30">
            <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
            <span>Production Active</span>
          </span>
        </div>
      </div>

      {/* ── Page Header: Title, Tags & Action Buttons ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-4xl md:text-5xl font-black text-[#0F0F0F] tracking-tight uppercase">
              {r.name}
            </h1>
          </div>

          {/* Meta Info Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#6B6B6B]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E3DF] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <Layers className="w-3.5 h-3.5 text-[#6B6B6B]" />
              <span>Yield: <strong className="font-mono font-bold text-[#0F0F0F]">{r.yield_qty} units</strong></span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E3DF] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <User className="w-3.5 h-3.5 text-[#6B6B6B]" />
              <span>Allocated Labor: <strong className="font-mono font-bold text-[#0F0F0F]">{fmt(r.labor_cost)}</strong></span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E3DF] shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <Zap className="w-3.5 h-3.5 text-[#6B6B6B]" />
              <span>Electricity & Gas: <strong className="font-mono font-bold text-[#0F0F0F]">{fmt(r.electricity_cost)}</strong></span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            id="export-csv-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
              bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6B6B6B]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            id="print-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
              bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#6B6B6B]" />
            <span>Print Spec Sheet</span>
          </button>

          <button
            onClick={openEdit}
            id="edit-recipe-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold
              bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)] cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-[#6B6B6B]" />
            <span>Edit Recipe</span>
          </button>

          <button
            onClick={() => {
              setAddSearch("");
              setAddModalOpen(true);
            }}
            id="add-ingredient-to-recipe-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white
              bg-[#D97A34] hover:bg-[#c26827] active:bg-[#a6541b]
              shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:-translate-y-0.5
              active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* ── Target Gap Alert Banner ── */}
      {result.profit_alert_triggered && !alertDismissed && (
        <div className="relative overflow-hidden rounded-2xl p-4 bg-amber-50/95 border border-amber-200 shadow-xs print:hidden">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wide text-amber-800">
                  TARGET GAP ALERT • Batch Profitability Below Benchmark
                </p>
                <p className="text-[#6B6B6B] mt-0.5 leading-relaxed">
                  Gross profit (<strong className="text-[#0F0F0F] font-mono font-bold">{fmt(result.gross_profit_per_batch)}/batch</strong>) is{" "}
                  <strong className="text-amber-700 font-mono font-bold">{fmt(profitGap)} below</strong> the target threshold of{" "}
                  <strong className="text-[#0F0F0F] font-mono font-bold">{fmt(r.desired_profit_alert)}</strong>. Consider increasing retail markup to ≥{optimalMarkupPct}% or negotiating supplier bulk pricing.
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
                className="p-1.5 text-[#6B6B6B] hover:text-[#0F0F0F] transition-colors cursor-pointer"
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
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-[#4A7C59] flex items-center justify-center shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F0F0F] tracking-tight">
                      Recipe Ingredients
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30">
                      {result.line_items.length} items
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Raw materials yield calculation & variable input costs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    text-white bg-[#D97A34] hover:bg-[#c26827] shadow-[0_2px_4px_rgba(0,0,0,0.05)] active:scale-95 transition-all cursor-pointer"
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
                    bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B6B6B]" />
                  <span>Sort {ingSortBy !== "default" ? `(${ingSortBy})` : ""}</span>
                </button>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[11px] font-semibold text-[#6B6B6B]">
                    <th className="text-left py-3 px-3">Ingredient</th>
                    <th className="text-right py-3 px-3">Purchase Price</th>
                    <th className="text-right py-3 px-3">Base &amp; Unit Cost</th>
                    <th className="text-center py-3 px-3">Recipe Qty</th>
                    <th className="text-right py-3 px-3">Line Cost</th>
                    <th className="w-8 py-3 px-2 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF]">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#6B6B6B]">
                        <Box className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#0F0F0F]" />
                        <p className="font-semibold text-sm text-[#0F0F0F]">No raw ingredients added yet.</p>
                        <button
                          onClick={openAddModal}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] shadow-sm active:scale-95 transition-all cursor-pointer"
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
                        className="min-h-[48px] h-12 even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80 transition-colors group"
                      >
                        {/* Ingredient Name & Source category */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#0F0F0F] text-sm">
                              {li.ingredient_name}
                            </span>
                            {li.is_orphaned_conversion && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                ⚠️ Unit configuration missing. Please reselect.
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B] mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59]" />
                            <span>
                              {li.purchase_unit || (li.package_type ? `${li.package_type} (${li.net_quantity} ${li.net_unit})` : "Package")}
                              {li.yield_factor > 0 && (
                                <span className="text-[#6B6B6B] ml-1 font-medium">
                                  • {li.yield_factor.toFixed(1)} {li.recipe_unit}s/pack
                                </span>
                              )}
                              {li.net_quantity && li.net_quantity > 0 && li.purchase_price > 0 && (
                                <span className="text-[#4A7C59] font-mono font-semibold ml-1">
                                  ({fmt(li.purchase_price / li.net_quantity)}/{li.net_unit || "unit"})
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Purchase Price */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-[#0F0F0F] tabular-nums">
                          {fmt(li.purchase_price)}
                        </td>

                        {/* Base & Unit Cost */}
                        <td className="py-3 px-3 text-right tabular-nums">
                          <span className="font-mono font-bold text-[#0F0F0F]">
                            {fmt(li.normalized_unit_cost)}
                          </span>
                          <span className="text-[11px] text-[#6B6B6B] block">/{li.recipe_unit}</span>
                          {li.base_unit_cost != null && li.base_unit_code && (
                            <span className="text-[10px] font-mono text-[#4A7C59] block font-semibold mt-0.5">
                              Base: {fmt(li.base_unit_cost)}/{li.base_unit_code}
                            </span>
                          )}
                        </td>

                        {/* Recipe Qty (Inline Input) */}
                        <td className="py-3 px-3 text-center">
                          <div className={`inline-flex items-center rounded-lg border overflow-hidden transition-all ${
                            li.is_orphaned_conversion
                              ? "border-amber-400 bg-amber-50/20"
                              : "border-[#E5E3DF] bg-white focus-within:border-[#D97A34]"
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
                              className="w-16 px-2.5 py-1 text-xs text-center bg-transparent font-mono font-bold text-[#0F0F0F] focus:outline-none tabular-nums"
                              id={`batch-qty-${li.id}`}
                            />
                            {(() => {
                              const parent = allIngredients.find((i) => i.ingredient_id === li.ingredient_id);
                              const availableConvs = parent?.conversions || [];
                              if (availableConvs.length > 1 || li.is_orphaned_conversion) {
                                return (
                                  <div className="relative border-l border-[#E5E3DF] bg-[#F9F8F6]">
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
                                          ? "text-amber-700 font-bold"
                                          : "text-[#0F0F0F]"
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
                                          <option key={c.conversion_id} value={c.conversion_id} disabled={isUsedByOtherRow} className="text-[#0F0F0F] bg-white">
                                            {c.recipe_unit} {isUsedByOtherRow ? "(in use)" : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-[#6B6B6B] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                );
                              }
                              return (
                                <span className="px-2 py-1 text-[11px] font-semibold text-[#6B6B6B] bg-[#F9F8F6] border-l border-[#E5E3DF]">
                                  {li.recipe_unit}
                                </span>
                              );
                            })()}
                          </div>
                          {li.normalized_quantity != null && li.base_unit_code && (
                            <span className="text-[10px] text-[#6B6B6B] block font-mono font-medium mt-0.5" title="Normalized canonical base quantity used for costing">
                              ≈ {li.normalized_quantity.toFixed(1)} {li.base_unit_code}
                            </span>
                          )}
                        </td>

                        {/* Line Cost */}
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-sm text-[#0F0F0F] tabular-nums">
                          {fmt(li.line_item_cost)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-3 px-2 text-right print:hidden">
                          <button
                            onClick={() => handleRemoveIngredient(li.id)}
                            className="p-1 rounded-lg text-[#6B6B6B] hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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
            <div className="pt-5 mt-4 border-t border-[#E5E3DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                <span>All line items calculated with standard culinary recipe yields.</span>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97A34] hover:text-[#c26827] transition-colors print:hidden cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Row</span>
                </button>
                <span className="text-xs text-[#6B6B6B]">
                  Subtotal Ingredients:{" "}
                  <strong className="font-mono font-black text-[#0F0F0F] text-sm">
                    {fmt(result.total_ingredient_cost ?? result.total_variable_cost)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* ── Card: Recipe Packaging & Presentation ── */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D97A34]/10 border border-[#D97A34]/30 text-[#D97A34] flex items-center justify-center shadow-xs">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#0F0F0F] tracking-tight">
                      Recipe Packaging &amp; Presentation
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30">
                      {result.packaging_items?.length || 0} items
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Direct packaging materials, boxes, liners, and containers allocated per batch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
                <button
                  type="button"
                  onClick={() => setAddPkgModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    bg-transparent border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Packaging</span>
                </button>
              </div>
            </div>

            {/* Packaging Table */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E3DF] bg-[#F9F8F6] text-[11px] font-semibold text-[#6B6B6B]">
                    <th className="text-left py-3 px-3">Packaging Material</th>
                    <th className="text-left py-3 px-3">Type</th>
                    <th className="text-right py-3 px-3">Unit Cost</th>
                    <th className="text-center py-3 px-3">Batch Qty</th>
                    <th className="text-right py-3 px-3">Line Cost</th>
                    <th className="w-8 py-3 px-2 print:hidden" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF]">
                  {!result.packaging_items || result.packaging_items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#6B6B6B]">
                        <Box className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D97A34]" />
                        <p className="font-semibold text-sm text-[#0F0F0F]">No packaging materials assigned to this recipe.</p>
                        <p className="text-xs text-[#6B6B6B] mt-1 max-w-sm mx-auto">
                          Product will be calculated without packaging containers (bulk unpackaged product).
                        </p>
                        <button
                          type="button"
                          onClick={() => setAddPkgModalOpen(true)}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] shadow-xs active:scale-95 transition-all cursor-pointer"
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
                        className="min-h-[48px] h-12 even:bg-[#F9F8F6] odd:bg-white hover:bg-[#F9F8F6]/80 transition-colors group"
                      >
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0F0F0F] text-sm">
                              {pkg.packaging_name}
                            </span>
                            <span className="text-[11px] text-[#6B6B6B] font-mono">
                              SKU: {pkg.packaging_code}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30">
                            {pkg.packaging_type}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-medium text-[#0F0F0F]">
                          {fmt(pkg.current_unit_cost)} / {pkg.unit}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-bold text-sm text-[#0F0F0F]">
                            {pkg.batch_qty}
                          </span>{" "}
                          <span className="text-[11px] text-[#6B6B6B] font-sans">{pkg.unit}s</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-[#0F0F0F] text-sm">
                          {fmt(pkg.line_item_cost)}
                        </td>

                        <td className="py-3 px-2 text-right print:hidden">
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
                            className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
              <div className="pt-4 mt-2 border-t border-[#E5E3DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-[#6B6B6B]">
                  Packaging items deduct automatically during batch production.
                </span>
                <span className="text-xs text-[#6B6B6B]">
                  Subtotal Packaging:{" "}
                  <strong className="font-black text-[#D97A34] text-sm font-mono">
                    {fmt(result.total_packaging_cost || 0)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* ── Card: Consolidated Direct Materials Summary ── */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-[#4A7C59] flex items-center justify-center shadow-2xs">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0F0F0F] tracking-tight uppercase">
                      Total Direct Materials
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30">
                      Consolidated
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    Combined raw ingredients & packaging materials cost per batch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F9F8F6] border border-[#E5E3DF] text-[#0F0F0F] font-bold text-xs tabular-nums">
                  <span className="text-[#6B6B6B]">Unit Material Cost:</span>
                  <span className="font-extrabold font-mono text-sm text-[#0F0F0F]">{fmt(directMaterialsPerUnit)}</span>
                  <span className="text-[10px] text-[#6B6B6B] font-normal">/ unit</span>
                </span>
              </div>
            </div>

            {/* 3-Column Metric Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-xl p-3 bg-[#F9F8F6] border border-[#E5E3DF] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                    <span>Ingredients Subtotal:</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E5E3DF] font-mono text-[#0F0F0F]">
                    {result.line_items.length} items
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#0F0F0F] tabular-nums font-mono">
                  {fmt(rawIngredientsCost)}
                </div>
              </div>

              <div className="rounded-xl p-3 bg-[#F9F8F6] border border-[#E5E3DF] space-y-1">
                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#D97A34]" />
                    <span>Packaging Subtotal:</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-[#E5E3DF] font-mono text-[#0F0F0F]">
                    {result.packaging_items?.length || 0} items
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#D97A34] tabular-nums font-mono">
                  {fmt(packagingMaterialsCost)}
                </div>
              </div>

              <div className="rounded-xl p-3 bg-[#4A7C59]/10 border border-[#4A7C59]/30 space-y-1">
                <div className="flex items-center justify-between text-xs text-[#4A7C59]">
                  <span className="font-bold">Total Direct Materials:</span>
                  <span className="text-[10px] font-mono font-semibold">100% Prime</span>
                </div>
                <div className="text-base font-black text-[#4A7C59] tabular-nums font-mono">
                  {fmt(totalDirectMaterials)}
                </div>
              </div>
            </div>

            {/* Proportional Ratio Bar */}
            {totalDirectMaterials > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-[#E5E3DF]">
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-[#E5E3DF]">
                  <div
                    style={{ width: `${ingMaterialsRatio}%` }}
                    className="bg-[#4A7C59] transition-all duration-300"
                    title={`Ingredients: ${ingMaterialsRatio}%`}
                  />
                  <div
                    style={{ width: `${pkgMaterialsRatio}%` }}
                    className="bg-[#D97A34] transition-all duration-300"
                    title={`Packaging: ${pkgMaterialsRatio}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-[#6B6B6B]">
                  <span className="text-[#4A7C59] font-semibold">
                    Ingredients Share ({ingMaterialsRatio}%)
                  </span>
                  <span className="text-[#D97A34] font-semibold">
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
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D97A34]/10 text-[#D97A34] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F0F0F] tracking-tight">
                    Production Overheads
                  </h3>
                  <p className="text-[11px] text-[#6B6B6B]">
                    Fixed utility & labor allocation per batch
                  </p>
                </div>
              </div>
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D97A34] hover:text-[#c26827] transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Overheads</span>
              </button>
            </div>

            {/* Overhead Line Items */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#6B6B6B]">
                  <span className="w-2 h-2 rounded-full bg-[#0F0F0F]" />
                  <span>Labor Allocation</span>
                </div>
                <span className="font-mono font-bold text-[#0F0F0F] tabular-nums">
                  {fmt(r.labor_cost)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#6B6B6B]">
                  <span className="w-2 h-2 rounded-full bg-[#D97A34]" />
                  <span>Electricity / Gas</span>
                </div>
                <span className="font-mono font-bold text-[#0F0F0F] tabular-nums">
                  {fmt(r.electricity_cost)}
                </span>
              </div>
            </div>

            {/* Visual Distribution Bar */}
            <div className="pt-2">
              <div className="h-2 rounded-full bg-[#E5E3DF] flex overflow-hidden">
                <div
                  style={{ width: `${laborPct}%` }}
                  className="bg-[#0F0F0F] transition-all duration-300"
                  title={`Labor: ${laborPct}%`}
                />
                <div
                  style={{ width: `${utilPct}%` }}
                  className="bg-[#D97A34] transition-all duration-300"
                  title={`Utilities: ${utilPct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#6B6B6B] mt-1.5 font-medium">
                <span>Labor ({laborPct}%)</span>
                <span>Utilities ({utilPct}%)</span>
              </div>
            </div>

            {/* Total Overhead Footer */}
            <div className="pt-3 border-t border-[#E5E3DF] flex items-center justify-between text-xs">
              <span className="font-bold text-[#6B6B6B]">Total Fixed Overhead:</span>
              <span className="font-mono font-extrabold text-sm text-[#0F0F0F] tabular-nums">
                {fmt(result.total_overhead)}
              </span>
            </div>
          </div>

          {/* ── Card 2: Pricing & Margin Engine ── */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-[#4A7C59] flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F0F0F] tracking-tight">
                    Pricing & Margin Engine
                  </h3>
                  <p className="text-[11px] text-[#6B6B6B]">
                    Yield: {r.yield_qty} Finished Units
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30">
                LIVE CALC
              </span>
            </div>

            {/* Cost Details & Visual Ratio Bar */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                  <span>Raw Ingredients:</span>
                </span>
                <span className="font-mono font-semibold text-[#0F0F0F] tabular-nums">
                  {fmt(result.total_ingredient_cost ?? result.total_variable_cost)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D97A34]" />
                  <span>Packaging &amp; Materials:</span>
                </span>
                <span className="font-mono font-semibold text-[#0F0F0F] tabular-nums">
                  {fmt(packagingMaterialsCost)}
                </span>
              </div>

              {/* Subtotal: Total Direct Materials */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F9F8F6] border border-[#E5E3DF] font-bold text-[#0F0F0F]">
                <span className="flex items-center gap-1.5 text-xs text-[#0F0F0F]">
                  <PackageCheck className="w-3.5 h-3.5 text-[#4A7C59]" />
                  <span>Total Direct Materials:</span>
                </span>
                <div className="text-right">
                  <span className="font-black text-[#0F0F0F] tabular-nums font-mono">
                    {fmt(totalDirectMaterials)}
                  </span>
                  <span className="text-[10px] text-[#6B6B6B] block font-normal leading-tight font-mono">
                    {fmt(directMaterialsPerUnit)}/unit
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0F0F0F]" />
                  <span>Fixed Overhead:</span>
                </span>
                <span className="font-mono font-semibold text-[#0F0F0F] tabular-nums">
                  {fmt(result.total_overhead)}
                </span>
              </div>

              {/* ── Visual Cost Ratio Distribution Bar ── */}
              {result.total_cost_per_batch > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#E5E3DF]">
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
                      className="bg-[#4A7C59] transition-all duration-300"
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
                      className="bg-[#D97A34] transition-all duration-300"
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
                      className="bg-[#0F0F0F] transition-all duration-300"
                      title={`Overhead: ${(
                        (result.total_overhead / result.total_cost_per_batch) *
                        100
                      ).toFixed(1)}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#4A7C59] font-bold">
                      {`${(((result.total_ingredient_cost ?? result.total_variable_cost) / result.total_cost_per_batch) * 100).toFixed(0)}% Ingredients`}
                    </span>
                    <span className="text-[#D97A34] font-bold">
                      {`${(((result.total_packaging_cost || 0) / result.total_cost_per_batch) * 100).toFixed(0)}% Packaging`}
                    </span>
                    <span className="text-[#0F0F0F] font-bold">
                      {`${((result.total_overhead / result.total_cost_per_batch) * 100).toFixed(0)}% Overhead`}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#E5E3DF] flex items-center justify-between font-bold">
                <span className="text-[#0F0F0F]">Total Batch Cost:</span>
                <span className="text-sm text-[#0F0F0F] tabular-nums font-mono font-black">
                  {fmt(result.total_cost_per_batch)}
                </span>
              </div>
            </div>

            {/* Base Cost Box */}
            <div className="rounded-lg p-3 bg-[#F9F8F6] border border-[#E5E3DF] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#6B6B6B]">
                <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                <span>Base Cost per Item:</span>
              </div>
              <span className="text-base font-mono font-black text-[#0F0F0F] tabular-nums">
                {fmt(result.cost_per_item)}
              </span>
            </div>
          </div>

          {/* ── Card 3: Channel Pricing & Target Margins ── */}
          <div className="rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-[#4A7C59] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F0F0F] tracking-tight uppercase">
                  CHANNEL PRICING & TARGET MARGINS
                </h3>
                <p className="text-[11px] text-[#6B6B6B]">
                  Multi-tier distribution pricing
                </p>
              </div>
            </div>

            {/* Box 1: Recommended Retail (RRP) */}
            <div className="rounded-xl p-4 bg-[#4A7C59]/5 border border-[#4A7C59]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#0F0F0F]">
                    Recommended Retail (RRP)
                  </span>
                  <Tooltip
                    position="top"
                    content={
                      <div className="space-y-1 text-left max-w-[200px]">
                        <p className="font-semibold text-[#0F0F0F]">Retail Markup (+{r.target_markup_pct.toFixed(0)}%)</p>
                        <p className="text-[11px] text-[#6B6B6B] leading-snug">
                          Applied over unit cost ({fmt(result.cost_per_item)}) to determine customer selling price.
                        </p>
                      </div>
                    }
                  >
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 cursor-help">
                      +{r.target_markup_pct.toFixed(0)}%
                    </span>
                  </Tooltip>
                </div>
                <span className="text-lg font-mono font-black text-[#4A7C59] tabular-nums">
                  {fmt(result.recommended_retail_price_item)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] pt-1 border-t border-[#4A7C59]/20">
                <span>Gross Profit / Item: <strong className="text-[#0F0F0F] font-mono font-bold">{fmt(result.gross_profit_item)}</strong></span>
                <span>Gross Margin: <strong className="text-[#4A7C59] font-mono font-bold">{result.gross_margin_pct.toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* Box 2: Reseller / Wholesale */}
            <div className="rounded-xl p-4 bg-[#F9F8F6] border border-[#E5E3DF] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#0F0F0F]">
                    Reseller / Wholesale <span className="text-[#6B6B6B] font-normal text-[11px]">(Base + Markup)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white border border-[#E5E3DF] text-[#0F0F0F]">
                    +{r.reseller_markup_pct.toFixed(0)}%
                  </span>
                </div>
                <span className="text-lg font-mono font-black text-[#0F0F0F] tabular-nums">
                  {fmt(result.reseller_price_per_item)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] pt-1 border-t border-[#E5E3DF]">
                <span>Profit / Item: <strong className="text-[#0F0F0F] font-mono font-bold">{fmt(resellerProfitItem)}</strong></span>
                <span>Channel Margin: <strong className="text-[#0F0F0F] font-mono font-bold">{resellerMarginPct.toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* Revenue & Gross Profit Breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span>Retail Revenue / Batch:</span>
                <span className="font-mono font-black text-[#4A7C59] tabular-nums text-sm">
                  {fmt(result.retail_revenue_batch)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#6B6B6B]">
                <span>Gross Profit / Batch:</span>
                <span
                  className={`font-mono font-black tabular-nums text-sm ${
                    result.profit_alert_triggered
                      ? "text-rose-600"
                      : "text-[#4A7C59]"
                  }`}
                >
                  {fmt(result.gross_profit_per_batch)}
                </span>
              </div>
            </div>

            {/* Benchmark Objective Status Box */}
            <div className="rounded-xl p-3 bg-[#F9F8F6] border border-[#E5E3DF] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#6B6B6B] block font-medium">Benchmark Objective</span>
                <span className="font-bold text-[#0F0F0F]">
                  Target: ≥ {fmt(r.desired_profit_alert)}
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  result.profit_alert_triggered
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    result.profit_alert_triggered ? "bg-rose-500" : "bg-[#4A7C59]"
                  }`}
                />
                <span>{result.profit_alert_triggered ? "Below Target" : "On Target ✓"}</span>
              </span>
            </div>

            {/* Quick Markup Simulations */}
            <div className="space-y-2.5 pt-2.5 border-t border-[#E5E3DF]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#0F0F0F]">
                  Quick Markup Simulation:
                </span>
                {optimalMarkupPct > 0 && (
                  <span className="text-[#4A7C59] font-bold">
                    +{optimalMarkupPct}% needed for {fmt(r.desired_profit_alert)}
                  </span>
                )}
              </div>

              {/* Standard Industry Presets (20%, 30%, 40%, 50%, 60%, 75%, 100%) */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
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
                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-mono font-bold text-center border transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#0F0F0F] text-white border-[#0F0F0F] shadow-sm font-extrabold"
                            : "bg-white border-[#E5E3DF] text-[#0F0F0F] hover:border-[#D97A34]"
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
                  className="py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-[#F9F8F6] border-[#E5E3DF] text-[#0F0F0F] shadow-2xs hover:bg-[#E5E3DF]/50"
                  data-purpose="quick-markup-current"
                >
                  +{r.target_markup_pct.toFixed(0)}% (Current)
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickMarkup(optimalMarkupPct)}
                  disabled={optimalMarkupPct === 0}
                  className="py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer
                    bg-white border-[#E5E3DF] hover:border-[#D97A34]
                    text-[#0F0F0F] hover:text-[#D97A34] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
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
              className="w-full py-3.5 px-4 rounded-lg font-bold text-xs text-white uppercase tracking-wider
                bg-[#D97A34] hover:bg-[#c26827] active:bg-[#a6541b]
                shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:translate-y-0
                transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {committedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-white" />
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
            className="relative z-10 w-full max-w-lg rounded-2xl border border-[#E5E3DF]
              bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] animate-in zoom-in-95 duration-200 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E5E3DF] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F0F0F] tracking-tight">
                  Edit Recipe Settings
                </h2>
                <p className="text-xs text-[#6B6B6B]">Configure yields, overheads, and target pricing tiers</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-[#6B6B6B] hover:text-[#0F0F0F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#0F0F0F]">Recipe Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#0F0F0F]">Batch Yield (units)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.yield_qty}
                    onChange={(e) =>
                      setEditForm({ ...editForm, yield_qty: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F0F0F]">Profit Alert Target (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.desired_profit_alert}
                    onChange={(e) =>
                      setEditForm({ ...editForm, desired_profit_alert: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#0F0F0F]">Labor (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.labor_cost}
                    onChange={(e) =>
                      setEditForm({ ...editForm, labor_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F0F0F]">Electricity (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.electricity_cost}
                    onChange={(e) =>
                      setEditForm({ ...editForm, electricity_cost: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#0F0F0F]">Retail Markup (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.target_markup_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, target_markup_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium font-mono tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#0F0F0F]">Reseller Markup (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.reseller_markup_pct}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reseller_markup_pct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] font-medium font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E3DF] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecipe}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] transition-colors shadow-sm cursor-pointer"
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
          className="relative z-10 w-full max-w-2xl rounded-2xl border border-[#E5E3DF]
            bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 md:p-6 pb-4 border-b border-[#E5E3DF] bg-white flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 border border-[#4A7C59]/30 flex items-center justify-center text-[#4A7C59] shrink-0 shadow-xs">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0F0F0F] tracking-tight">
                    Add Ingredient to Recipe
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30">
                    ₱ PHP
                  </span>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">
                  Select an item from your pantry master inventory or convert units on the fly.
                </p>
              </div>
            </div>

            <button
              onClick={() => setAddModalOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B6B6B] hover:text-[#0F0F0F] hover:bg-[#F9F8F6] transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 md:p-6 space-y-4 overflow-y-auto flex-1 bg-white">
            {/* Search & Category Header Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#6B6B6B] text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                  <span>SEARCH PANTRY ITEMS</span>
                </div>
                <div className="text-xs text-[#6B6B6B] font-medium font-mono">
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
                <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type ingredient name (e.g. Flour, Sugar, Butter)..."
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  className="w-full pl-10 pr-20 py-2.5 rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] placeholder:text-[#6B6B6B] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#D97A34] transition-all shadow-2xs"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  {addSearch && (
                    <button
                      type="button"
                      onClick={() => setAddSearch("")}
                      className="p-1 rounded-md text-[#6B6B6B] hover:text-[#0F0F0F] transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-[#E5E3DF] bg-[#F9F8F6] text-[10px] font-mono font-medium text-[#6B6B6B]">
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
                          ? "bg-[#0F0F0F] text-white font-bold shadow-xs"
                          : "bg-[#F9F8F6] text-[#0F0F0F] border border-[#E5E3DF] hover:bg-[#E5E3DF]/50 font-medium"
                      }`}
                    >
                      {cat.label} {showCount ? `(${cat.count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inventory List Header */}
            <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
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
                      className="p-3.5 rounded-xl border border-[#E5E3DF] bg-white flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#E5E3DF]" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-36 rounded bg-[#E5E3DF]" />
                          <div className="h-3 w-48 rounded bg-[#F9F8F6]" />
                        </div>
                      </div>
                      <div className="h-4 w-20 rounded bg-[#E5E3DF]" />
                    </div>
                  ))}
                </div>
              ) : filteredIngredients.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E3DF] bg-[#F9F8F6]">
                  <Box className="w-8 h-8 mx-auto text-[#6B6B6B] mb-2" />
                  <p className="font-bold text-[#0F0F0F] text-xs">No matching ingredients</p>
                  <p className="text-[11px] text-[#6B6B6B] mt-1">
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
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-[#D97A34]/5 border-2 border-[#D97A34] shadow-xs"
                          : "bg-white border-[#E5E3DF] hover:border-[#D97A34]/50 hover:bg-[#F9F8F6]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-[#D97A34] text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[#E5E3DF] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0F0F0F] text-sm truncate">
                              {ing.name}
                            </span>
                            {isSelected ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30 shrink-0">
                                Selected
                              </span>
                            ) : (() => {
                              const alreadyAddedCount = result?.line_items.filter((li) => li.ingredient_id === ing.ingredient_id).length || 0;
                              if (alreadyAddedCount > 0) {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0F0F0F]/10 text-[#0F0F0F] border border-[#E5E3DF] shrink-0">
                                    Multi-unit ({alreadyAddedCount} in recipe)
                                  </span>
                                );
                              }
                              if (ing.purchase_price <= 0) {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    Unpriced
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-xs text-[#6B6B6B] mt-0.5 truncate font-medium">
                            Pkg: {ing.purchase_unit || (ing.package_type ? `${ing.package_type} (${ing.net_quantity ?? 1} ${ing.net_unit ?? "kg"})` : "Package")} • {ing.conversions && ing.conversions.length > 1 ? `${ing.conversions.length} Unit Types (${ing.conversions.map((c) => c.recipe_unit).join(", ")})` : `Yield: ${ing.yield_factor} ${ing.recipe_unit}s`}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <div
                          className={`font-mono font-bold tabular-nums text-sm ${
                            isSelected
                              ? "text-[#D97A34]"
                              : ing.purchase_price <= 0
                              ? "text-[#6B6B6B] font-semibold"
                              : "text-[#0F0F0F]"
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
              <div className="rounded-xl p-4 sm:p-4.5 bg-[#F9F8F6] border border-[#E5E3DF] space-y-3.5 animate-in fade-in duration-150">
                {/* Portion Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-[#E5E3DF]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                    <h3 className="font-bold text-[#0F0F0F] text-sm">
                      Configure Portion: {selectedIng.name}
                    </h3>
                  </div>
                  <div className="text-xs text-[#6B6B6B] flex items-center gap-1.5 flex-wrap">
                    <span>Active Unit Cost:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-white border border-[#E5E3DF] font-mono font-bold text-[#0F0F0F] text-xs shadow-2xs">
                      {fmt(activeUnitCost)} / {activeRecipeUnit}
                    </span>
                    {selectedIng.purchase_price > 0 && (
                      <span className="text-[#6B6B6B] text-[11px] font-mono">
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
                      <label className="text-xs font-bold text-[#0F0F0F]">
                        Batch Quantity ({activeRecipeUnit})
                      </label>
                      <span className="text-[10px] text-[#6B6B6B]">e.g. 250 or 1.5</span>
                    </div>
                    <div className="flex rounded-lg overflow-hidden shadow-2xs border border-[#E5E3DF] bg-white focus-within:border-[#D97A34] transition-all">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={batchQty === 0 ? "" : batchQty}
                        onChange={(e) => setBatchQty(parseFloat(e.target.value) || 0)}
                        placeholder="250"
                        className="w-full px-3.5 py-2 text-sm font-mono font-bold text-[#0F0F0F] bg-transparent focus:outline-none tabular-nums"
                      />
                      <div className="flex border-l border-[#E5E3DF] divide-x divide-[#E5E3DF] bg-[#F9F8F6]">
                        <button
                          type="button"
                          onClick={() => handleStepQty(-1)}
                          disabled={batchQty <= 0}
                          className="px-3 text-[#0F0F0F] hover:bg-[#E5E3DF] transition-colors font-bold text-base flex items-center justify-center cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepQty(1)}
                          className="px-3 text-[#0F0F0F] hover:bg-[#E5E3DF] transition-colors font-bold text-base flex items-center justify-center cursor-pointer active:scale-90"
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
                      <label className="text-xs font-bold text-[#0F0F0F]">
                        Recipe Measure Unit
                      </label>
                      {selectedIng.conversions && selectedIng.conversions.length > 1 && (
                        <span className="text-[10px] font-semibold text-[#4A7C59]">
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
                          className="w-full appearance-none px-3.5 py-2 text-sm font-semibold rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] transition-all cursor-pointer pr-9 shadow-2xs"
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
                          className="w-full appearance-none px-3.5 py-2 text-sm font-semibold rounded-lg border border-[#E5E3DF] bg-white text-[#0F0F0F] focus:outline-none focus:border-[#D97A34] transition-all cursor-pointer pr-9 shadow-2xs"
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
                      <ChevronDown className="w-4 h-4 text-[#6B6B6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Presets and Batch Line Cost Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-[#6B6B6B] font-semibold mr-1">Presets:</span>
                    {currentPresets.map((preset) => {
                      const isActive = isPresetActive(preset);
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer active:scale-95 ${
                            isActive
                              ? "bg-[#0F0F0F] text-white border-[#0F0F0F] shadow-2xs"
                              : "bg-white border-[#E5E3DF] text-[#0F0F0F] hover:bg-[#F9F8F6] hover:border-[#D97A34]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="px-3.5 py-1.5 rounded-full bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-xs font-mono font-bold text-[#4A7C59] tabular-nums shadow-xs flex items-center gap-1.5">
                      <span className="text-[#6B6B6B] font-sans font-medium">Batch Line Cost:</span>
                      <span>{fmt(batchLineCost)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 md:p-6 pt-4 border-t border-[#E5E3DF] bg-[#F9F8F6] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#0F0F0F]/5 active:scale-[0.98] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={!selectedIngId || batchQty <= 0 || addSaving}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-[#D97A34] hover:bg-[#c26827] shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border border-[#E5E3DF] bg-white text-[#0F0F0F] max-w-sm`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                toast.type === "success"
                  ? "bg-[#4A7C59]/10 text-[#4A7C59]"
                  : toast.type === "error"
                  ? "bg-rose-100 text-rose-600"
                  : "bg-[#F9F8F6] text-[#0F0F0F]"
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
              <h4 className="text-sm font-bold tracking-tight text-[#0F0F0F]">{toast.title}</h4>
              <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => setToast(null)}
              className="text-[#6B6B6B] hover:text-[#0F0F0F] transition-colors p-1 rounded-lg cursor-pointer"
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

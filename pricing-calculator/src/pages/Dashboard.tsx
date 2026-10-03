// Dashboard / home page — Executive bakery intelligence overview matching Stitch design specification
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ChefHat,
  CheckCircle2,
  SlidersHorizontal,
  Coins,
} from "lucide-react";
import {
  getIngredients,
  getRecipes,
  updateIngredient,
  type Ingredient,
  type Recipe,
} from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";

// Sample Manila artisan bakery supplier costs for 1-click seeding
const MANILA_MARKET_PRICES: Record<string, { price: number; packageType?: string; netQty?: number; netUnit?: string }> = {
  "all-purpose flour": { price: 1850, packageType: "Sack", netQty: 25, netUnit: "kg" },
  "bread flour": { price: 1950, packageType: "Sack", netQty: 25, netUnit: "kg" },
  "granulated sugar": { price: 78, packageType: "Bag", netQty: 1, netUnit: "kg" },
  "unsalted butter": { price: 145, packageType: "Box", netQty: 225, netUnit: "g" },
  "fresh milk": { price: 98, packageType: "Bottle", netQty: 1, netUnit: "L" },
  "fresh whole milk": { price: 98, packageType: "Bottle", netQty: 1, netUnit: "L" },
  "eggs": { price: 280, packageType: "Carton", netQty: 30, netUnit: "pc" },
  "farm eggs": { price: 280, packageType: "Carton", netQty: 30, netUnit: "pc" },
  "baking powder": { price: 48, packageType: "Can", netQty: 100, netUnit: "g" },
  "vanilla extract": { price: 135, packageType: "Bottle", netQty: 50, netUnit: "ml" },
  "iodized salt": { price: 25, packageType: "Pack", netQty: 500, netUnit: "g" },
  "salt": { price: 25, packageType: "Pack", netQty: 500, netUnit: "g" },
  "cocoa powder": { price: 195, packageType: "Tub", netQty: 250, netUnit: "g" },
  "dark chocolate chips": { price: 340, packageType: "Bag", netQty: 500, netUnit: "g" },
  "active dry yeast": { price: 68, packageType: "Jar", netQty: 100, netUnit: "g" },
  "instant yeast": { price: 68, packageType: "Pack", netQty: 100, netUnit: "g" },
};

const DEFAULT_SEEDED_ITEMS: Ingredient[] = [
  { ingredient_id: 1, name: "All-Purpose Flour", purchase_unit: "Sack", purchase_price: 0, recipe_unit: "Cup", yield_factor: 208.25, package_type: "Sack", net_quantity: 25, net_unit: "kg" },
  { ingredient_id: 2, name: "Granulated Sugar", purchase_unit: "Bag", purchase_price: 0, recipe_unit: "Cup", yield_factor: 5.0, package_type: "Bag", net_quantity: 1, net_unit: "kg" },
  { ingredient_id: 3, name: "Unsalted Butter", purchase_unit: "Box", purchase_price: 0, recipe_unit: "Cup", yield_factor: 0.9912, package_type: "Box", net_quantity: 225, net_unit: "g" },
  { ingredient_id: 4, name: "Fresh Whole Milk", purchase_unit: "Bottle", purchase_price: 0, recipe_unit: "Cup", yield_factor: 4.1667, package_type: "Bottle", net_quantity: 1, net_unit: "L" },
  { ingredient_id: 5, name: "Farm Eggs", purchase_unit: "Carton", purchase_price: 0, recipe_unit: "pc", yield_factor: 30, package_type: "Carton", net_quantity: 30, net_unit: "pc" },
  { ingredient_id: 6, name: "Baking Powder", purchase_unit: "Can", purchase_price: 0, recipe_unit: "tsp", yield_factor: 20, package_type: "Can", net_quantity: 100, net_unit: "g" },
  { ingredient_id: 7, name: "Vanilla Extract", purchase_unit: "Bottle", purchase_price: 0, recipe_unit: "tsp", yield_factor: 10, package_type: "Bottle", net_quantity: 50, net_unit: "ml" },
  { ingredient_id: 8, name: "Iodized Salt", purchase_unit: "Pack", purchase_price: 0, recipe_unit: "tsp", yield_factor: 85, package_type: "Pack", net_quantity: 500, net_unit: "g" },
  { ingredient_id: 9, name: "Cocoa Powder", purchase_unit: "Tub", purchase_price: 0, recipe_unit: "Cup", yield_factor: 2.5, package_type: "Tub", net_quantity: 250, net_unit: "g" },
  { ingredient_id: 10, name: "Dark Chocolate Chips", purchase_unit: "Bag", purchase_price: 0, recipe_unit: "Cup", yield_factor: 3.0, package_type: "Bag", net_quantity: 500, net_unit: "g" },
  { ingredient_id: 11, name: "Instant Yeast", purchase_unit: "Pack", purchase_price: 0, recipe_unit: "tsp", yield_factor: 28, package_type: "Pack", net_quantity: 100, net_unit: "g" },
];

export default function Dashboard() {
  const { fmt } = useApp();
  const [ingredients, setIngredients] = useState<Ingredient[]>(DEFAULT_SEEDED_ITEMS);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [seedSuccessNotice, setSeedSuccessNotice] = useState(false);

  const loadData = async () => {
    try {
      const [ings, recs] = await Promise.all([getIngredients(), getRecipes()]);
      if (ings && ings.length > 0) {
        setIngredients(ings);
      } else {
        // Fallback for browser mock preview where Tauri database is not mounted
        setIngredients(DEFAULT_SEEDED_ITEMS);
      }
      setRecipes(recs || []);
    } catch (err) {
      console.warn("Tauri IPC unavailable (browser mock mode), applying seeded bakery items:", err);
      setIngredients(DEFAULT_SEEDED_ITEMS);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pricedIngredientsCount = useMemo(
    () => ingredients.filter((i) => i.purchase_price > 0).length,
    [ingredients]
  );

  const unpricedCount = useMemo(
    () => ingredients.length - pricedIngredientsCount,
    [ingredients.length, pricedIngredientsCount]
  );

  const pricingCoverage = useMemo(
    () => (ingredients.length ? Math.round((pricedIngredientsCount / ingredients.length) * 100) : 0),
    [ingredients.length, pricedIngredientsCount]
  );

  const avgMarkup = useMemo(() => {
    if (!recipes.length) return null;
    const sum = recipes.reduce((s, r) => s + r.target_markup_pct, 0);
    return ((sum / recipes.length) * 100).toFixed(1);
  }, [recipes]);

  // One-click Manila Artisan Bakery Seed Data populator
  const handleLoadSampleData = async () => {
    setSeedingLoading(true);
    try {
      for (const ing of ingredients) {
        const key = ing.name.toLowerCase().trim();
        const marketMatch = MANILA_MARKET_PRICES[key];
        if (marketMatch && ing.purchase_price === 0) {
          await updateIngredient(ing.ingredient_id, {
            name: ing.name,
            purchase_unit: ing.purchase_unit,
            purchase_price: marketMatch.price,
            recipe_unit: ing.recipe_unit,
            yield_factor: ing.yield_factor,
            package_type: marketMatch.packageType || ing.package_type || "Package",
            net_quantity: marketMatch.netQty || ing.net_quantity || 1,
            net_unit: marketMatch.netUnit || ing.net_unit || "kg",
          });
        }
      }
      await loadData();
      setSeedSuccessNotice(true);
    } catch (err) {
      console.warn("Tauri updateIngredient failed (browser mock mode), applying in-memory sample prices:", err);
      setIngredients((prev) =>
        prev.map((ing) => {
          const key = ing.name.toLowerCase().trim();
          const match = MANILA_MARKET_PRICES[key];
          if (match) {
            return {
              ...ing,
              purchase_price: match.price,
              package_type: match.packageType || ing.package_type || "Package",
              net_quantity: match.netQty || ing.net_quantity || 1,
              net_unit: match.netUnit || ing.net_unit || "kg",
            };
          }
          return ing;
        })
      );
      setSeedSuccessNotice(true);
      setTimeout(() => setSeedSuccessNotice(false), 5000);
    } finally {
      setSeedingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F]">
        <Header unpricedCount={0} />
        <main className="flex-1 p-6 md:p-8 w-full space-y-8 animate-pulse">
          {/* Skeleton Header */}
          <div className="space-y-3">
            <div className="h-5 w-44 bg-[#E5E3DF] rounded-full" />
            <div className="h-12 w-72 bg-[#E5E3DF] rounded-2xl" />
            <div className="h-4 w-96 bg-[#E5E3DF] rounded-lg" />
          </div>

          {/* Skeleton Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-48 rounded-2xl bg-white border border-[#E5E3DF] p-6 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-lg bg-[#E5E3DF]" />
                  <div className="w-20 h-5 rounded-full bg-[#E5E3DF]" />
                </div>
                <div className="h-9 w-24 bg-[#E5E3DF] rounded-lg" />
                <div className="h-4 w-36 bg-[#E5E3DF] rounded-lg" />
              </div>
            ))}
          </div>

          {/* Skeleton Hero */}
          <div className="h-80 rounded-2xl bg-white border border-[#E5E3DF] p-8" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9F8F6] text-[#0F0F0F]">
      {/* ── TopBar Header ── */}
      <Header unpricedCount={unpricedCount} />

      {/* ── Main Scrollable Dashboard Content ── */}
      <main className="flex-1 p-6 md:p-8 w-full space-y-8">
        {/* Seed Data Success Toast */}
        {seedSuccessNotice && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#4A7C59]/10 border border-[#4A7C59]/30 text-[#4A7C59] text-xs shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A7C59]" />
              <span className="font-semibold">
                Manila Artisan Bakery Wholesale Seed Data applied! All 11 ingredients now have live market costs.
              </span>
            </div>
            <button
              onClick={() => setSeedSuccessNotice(false)}
              className="text-xs font-bold text-[#4A7C59] hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── BEGIN: DashboardHeader ── */}
        <section
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
          data-purpose="dashboard-heading"
        >
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-[#4A7C59] mb-1">
              <span>● Production Telemetry</span>
              <span className="text-[#E5E3DF]">/</span>
              <span>Kitchen Master Batch</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#0F0F0F] tracking-tight">
              BakeIQ Operations Dashboard
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1 max-w-2xl">
              Real-time recipe costing, ingredient inventory yields, and pricing telemetry.
            </p>
          </div>

          {/* Quick Metric Status Pill */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-white border border-[#E5E3DF] px-3.5 py-1.5 rounded-lg shadow-sm text-xs">
            <span className="text-[#6B6B6B]">Valuation:</span>
            <span className="font-bold text-[#0F0F0F] font-mono">Weighted FIFO</span>
          </div>
        </section>
        {/* ── END: DashboardHeader ── */}

        {/* ── BEGIN: FourKPICards (Bento Box Style) ── */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
          data-purpose="metric-summary-grid"
        >
          {/* KPI CARD 1: Total Ingredients */}
          <div className="bg-white border border-[#E5E3DF] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <Link
                  to="/ingredients"
                  className="text-xs font-semibold text-[#6B6B6B] bg-[#F9F8F6] border border-[#E5E3DF] px-2.5 py-0.5 rounded-full flex items-center gap-1 group-hover:text-[#0F0F0F] transition-colors"
                >
                  Pantry Master <span className="text-[10px]">↗</span>
                </Link>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#0F0F0F] tracking-tight font-mono">
                  {ingredients.length}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                  Items
                </span>
              </div>
              <p className="text-xs font-medium text-[#6B6B6B] mt-1">
                Total Ingredients
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E5E3DF] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D97A34] font-medium flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97A34]" />
                  {pricedIngredientsCount} of {ingredients.length} priced
                </span>
                <Link
                  to="/ingredients"
                  className="text-[#4A7C59] hover:underline font-bold flex items-center gap-0.5"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-[#F9F8F6] border border-[#E5E3DF]/50 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pricingCoverage === 100 ? "bg-[#4A7C59]" : "bg-[#D97A34]"
                  }`}
                  style={{ width: `${Math.max(pricingCoverage, 6)}%` }}
                  title={`${pricingCoverage}% Completed`}
                />
              </div>
            </div>
          </div>

          {/* KPI CARD 2: Active Recipes */}
          <div className="bg-white border border-[#E5E3DF] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <Link
                  to="/recipes"
                  className="text-xs font-semibold text-[#6B6B6B] bg-[#F9F8F6] border border-[#E5E3DF] px-2.5 py-0.5 rounded-full flex items-center gap-1 group-hover:text-[#0F0F0F] transition-colors"
                >
                  Cost Engine <span className="text-[10px]">↗</span>
                </Link>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#0F0F0F] tracking-tight font-mono">
                  {recipes.length}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                  Formulas
                </span>
              </div>
              <p className="text-xs font-medium text-[#6B6B6B] mt-1">
                Active Recipes
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E5E3DF] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6B6B] font-medium font-mono">
                  {recipes.length} ready for batch costing
                </span>
                <Link
                  to="/recipes"
                  className="text-[#4A7C59] hover:underline font-bold flex items-center gap-0.5"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-[#F9F8F6] border border-[#E5E3DF]/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#D97A34] h-full rounded-full transition-all duration-500"
                  style={{ width: `${recipes.length > 0 ? 100 : 0}%` }}
                  title={`${recipes.length} Active Recipes`}
                />
              </div>
            </div>
          </div>

          {/* KPI CARD 3: Avg Target Markup */}
          <div className="bg-white border border-[#E5E3DF] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white bg-[#4A7C59] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  Target: 50%+ <span className="text-[10px]">↗</span>
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#0F0F0F] tracking-tight font-mono">
                  {avgMarkup ? avgMarkup : "50.0"}
                  <span className="text-xl font-bold">%</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#D97A34] px-2 py-0.5 rounded-full">
                  Retail
                </span>
              </div>
              <p className="text-xs font-medium text-[#6B6B6B] mt-1">
                Avg Target Markup
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E5E3DF] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6B6B] font-medium truncate">
                  Target gross margin benchmark
                </span>
                <Link
                  to="/recipes"
                  className="text-[#4A7C59] hover:underline font-bold flex items-center gap-0.5 shrink-0"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-[#F9F8F6] border border-[#E5E3DF]/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#4A7C59] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(avgMarkup ? parseFloat(avgMarkup) : 50, 100)}%` }}
                  title="Configured benchmark"
                />
              </div>
            </div>
          </div>

          {/* KPI CARD 4: Pricing Coverage */}
          <div className="bg-white border border-[#E5E3DF] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#D97A34]/10 text-[#D97A34] border border-[#D97A34]/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 text-white ${
                    pricingCoverage === 100 ? "bg-[#4A7C59]" : "bg-[#D97A34]"
                  }`}
                >
                  {pricingCoverage === 100 ? "Fully Costed" : "Action Required"}{" "}
                  <span className="text-[10px]">↗</span>
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#0F0F0F] tracking-tight font-mono">
                  {pricingCoverage}
                  <span className="text-xl font-bold">%</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                  Complete
                </span>
              </div>
              <p className="text-xs font-medium text-[#6B6B6B] mt-1">
                Pricing Coverage
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E5E3DF] flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6B6B] font-medium truncate font-mono">
                  {unpricedCount > 0 ? `${unpricedCount} ingredients need price` : "All ingredients costed"}
                </span>
                <Link
                  to="/ingredients"
                  className="text-[#D97A34] hover:underline font-bold flex items-center gap-0.5 shrink-0"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-[#F9F8F6] border border-[#E5E3DF]/50 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pricingCoverage === 100 ? "bg-[#4A7C59]" : "bg-[#D97A34]"
                  }`}
                  style={{ width: `${Math.max(pricingCoverage, 2)}%` }}
                  title="Pricing Coverage"
                />
              </div>
            </div>
          </div>
        </section>
        {/* ── END: FourKPICards ── */}

        {/* ── BEGIN: ElevatedOnboardingHero ── */}
        <section
          className="bg-white border border-[#E5E3DF] rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative overflow-hidden"
          data-purpose="onboarding-launchpad"
        >
          {/* Subtle decorative background warmth curves */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#F9F8F6] pointer-events-none -z-0" />
          <div className="absolute right-40 -bottom-24 w-64 h-64 rounded-full bg-[#D97A34]/5 pointer-events-none -z-0" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            {/* Central Action Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0F0F0F] text-[#D97A34] shadow-md mb-5 border border-[#E5E3DF] ring-4 ring-[#F9F8F6]">
              <SlidersHorizontal className="w-8 h-8 text-[#D97A34]" />
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F0F0F] tracking-tight">
              Ready to Price Your First Bakery Product?
            </h2>

            {/* Narrative / Guide */}
            <p className="text-sm sm:text-base text-[#6B6B6B] mt-3 leading-relaxed">
              Your{" "}
              <strong className="text-[#0F0F0F] font-semibold font-mono">
                {ingredients.length || 11} common baking ingredients
              </strong>{" "}
              are already seeded into the database (All-Purpose Flour, Unsalted Butter, Cane Sugar, Eggs,
              etc.). Complete the quick 3-step workflow to calibrate accurate batch margins and generate
              wholesale / retail selling prices.
            </p>

            {/* 3-Step Visual Micro Stepper */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {/* Step 1 (Active Pending) */}
              <div
                className={`rounded-2xl p-4 relative transition-all ${
                  unpricedCount > 0
                    ? "bg-[#F9F8F6] border-2 border-[#D97A34]"
                    : "bg-[#F9F8F6] border border-[#4A7C59]/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${
                      unpricedCount > 0
                        ? "bg-[#D97A34]"
                        : "bg-[#4A7C59]"
                    }`}
                  >
                    {unpricedCount > 0 ? "Step 1 • Action" : "Step 1 • Done ✓"}
                  </span>
                  {unpricedCount > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-[#D97A34] animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#4A7C59]" />
                  )}
                </div>
                <h4 className="text-xs font-bold text-[#0F0F0F]">
                  Input Purchase Costs
                </h4>
                <p className="text-[11px] text-[#6B6B6B] mt-1 leading-snug">
                  Set invoice prices per kg or pack for your {ingredients.length || 11} seeded pantry items.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#F9F8F6] border border-[#E5E3DF] rounded-2xl p-4 opacity-90">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] bg-white border border-[#E5E3DF] px-2.5 py-0.5 rounded-full">
                    Step 2
                  </span>
                  <span className="text-xs text-[#6B6B6B]">Next</span>
                </div>
                <h4 className="text-xs font-bold text-[#0F0F0F]">
                  Assemble Recipe Formula
                </h4>
                <p className="text-[11px] text-[#6B6B6B] mt-1 leading-snug">
                  Combine cups/grams with waste factors and batch yields.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#F9F8F6] border border-[#E5E3DF] rounded-2xl p-4 opacity-90">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] bg-white border border-[#E5E3DF] px-2.5 py-0.5 rounded-full">
                    Step 3
                  </span>
                  <span className="text-xs text-[#6B6B6B]">Target</span>
                </div>
                <h4 className="text-xs font-bold text-[#0F0F0F]">
                  Auto Gross Margin
                </h4>
                <p className="text-[11px] text-[#6B6B6B] mt-1 leading-snug">
                  Lock in 50%+ profit margin telemetry for retail and cafe wholesale.
                </p>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/ingredients"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-transparent hover:bg-[#0F0F0F]/5 text-[#0F0F0F] font-bold text-sm border border-[#0F0F0F] transition-all cursor-pointer min-h-[44px]"
              >
                <Coins className="w-4 h-4 text-[#D97A34]" />
                <span>Set Ingredient Purchase Prices</span>
                <span className="bg-[#D97A34]/10 text-[#D97A34] text-xs px-2 py-0.5 rounded-full font-mono font-medium ml-1">
                  {ingredients.length || 11} Items
                </span>
              </Link>

              <Link
                to="/recipes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#D97A34] hover:bg-[#c26827] text-white font-bold text-sm shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Create First Recipe</span>
              </Link>
            </div>

            {/* Small helper text with sample data loader */}
            <p className="text-[11px] text-[#6B6B6B] mt-4">
              ✨ Need sample bakery costs?{" "}
              <button
                onClick={handleLoadSampleData}
                disabled={seedingLoading}
                className="text-[#D97A34] hover:underline font-semibold cursor-pointer disabled:opacity-50"
                type="button"
              >
                {seedingLoading
                  ? "Seeding Manila Bakery Costs..."
                  : "Load Manila Artisan Bakery Seed Data"}
              </button>{" "}
              to preview real-time margin formulas instantly.
            </p>
          </div>
        </section>
        {/* ── END: ElevatedOnboardingHero ── */}

        {/* ── Active Recipes Showcase (If Any Exist) ── */}
        {recipes.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-[#E5E3DF]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4A7C59]/10 text-[#4A7C59] border border-[#4A7C59]/30 flex items-center justify-center">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F0F0F] tracking-tight">
                    Active Recipe Formulas
                  </h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Batches with computed unit and retail prices
                  </p>
                </div>
              </div>

              <Link
                to="/recipes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D97A34] hover:underline group"
              >
                <span>Explore all {recipes.length} recipes</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {recipes.slice(0, 6).map((r) => {
                const markupPercent = Math.round(r.target_markup_pct * 100);
                return (
                  <Link
                    key={r.recipe_id}
                    to={`/recipes/${r.recipe_id}`}
                    className="group outline-none"
                  >
                    <div className="relative overflow-hidden rounded-2xl p-6 bg-white border border-[#E5E3DF] shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:border-[#D97A34] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-[#0F0F0F] group-hover:text-[#D97A34] transition-colors">
                            {r.name}
                          </h3>
                          <p className="text-xs text-[#6B6B6B] mt-0.5">
                            Standard Yield:{" "}
                            <strong className="text-[#0F0F0F] font-semibold font-mono">
                              {r.yield_qty} units
                            </strong>
                          </p>
                        </div>

                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D97A34] text-white">
                          {markupPercent}% Markup
                        </span>
                      </div>

                      <div className="bg-[#F9F8F6] rounded-xl p-3 border border-[#E5E3DF] grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block font-medium">
                            Labor Overhead
                          </span>
                          <span className="font-bold text-[#0F0F0F] font-mono">
                            {fmt(r.labor_cost)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] block font-medium">
                            Profit Alert At
                          </span>
                          <span className="font-bold text-[#0F0F0F] font-mono">
                            {fmt(r.desired_profit_alert)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-xs text-[#6B6B6B] pt-2 border-t border-[#E5E3DF]">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C59]" />
                          Formula active
                        </span>
                        <span className="font-semibold text-[#D97A34] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Open Calculator →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

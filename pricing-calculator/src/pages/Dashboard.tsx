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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-flour-100 dark:bg-[#080c14]">
        <Header unpricedCount={0} />
        <main className="flex-1 p-6 md:p-8 w-full space-y-8 animate-pulse">
          {/* Skeleton Header */}
          <div className="space-y-3">
            <div className="h-5 w-44 bg-flour-100 dark:bg-slate-800 rounded-full" />
            <div className="h-9 w-72 bg-flour-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-96 bg-flour-100 dark:bg-slate-800 rounded" />
          </div>

          {/* Skeleton Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-44 rounded-xl bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 p-5 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="w-10 h-10 rounded-lg bg-flour-100 dark:bg-slate-800" />
                  <div className="w-20 h-5 rounded-md bg-flour-100 dark:bg-slate-800" />
                </div>
                <div className="h-8 w-24 bg-flour-100 dark:bg-slate-800 rounded" />
                <div className="h-4 w-36 bg-flour-100 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>

          {/* Skeleton Hero */}
          <div className="h-80 rounded-2xl bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 p-8" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-flour-100 dark:bg-[#080c14] text-espresso-850 dark:text-slate-100 transition-colors">
      {/* ── TopBar Header ── */}
      <Header unpricedCount={unpricedCount} />

      {/* ── Main Scrollable Dashboard Content ── */}
      <main className="flex-1 p-6 md:p-8 w-full space-y-8">
        {/* Seed Data Success Toast */}
        {seedSuccessNotice && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-culinary-50 dark:bg-emerald-950/70 border border-culinary-200 dark:border-emerald-800 text-culinary-800 dark:text-emerald-200 text-xs shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-culinary-600 dark:text-emerald-400" />
              <span className="font-semibold">
                Manila Artisan Bakery Wholesale Seed Data applied! All 11 ingredients now have live market costs.
              </span>
            </div>
            <button
              onClick={() => setSeedSuccessNotice(false)}
              className="text-xs font-bold text-culinary-700 dark:text-emerald-300 hover:underline cursor-pointer"
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
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-culinary-700 dark:text-emerald-400 mb-1">
              <span>● Production Telemetry</span>
              <span className="text-espresso-200 dark:text-espresso-700">/</span>
              <span>Kitchen Master Batch</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-espresso-800 dark:text-white tracking-tight">
              BakeIQ Operations Dashboard
            </h1>
            <p className="text-sm text-espresso-600 dark:text-espresso-500 mt-1 max-w-2xl">
              Real-time recipe costing, ingredient inventory yields, and pricing telemetry.
            </p>
          </div>

          {/* Quick Metric Status Pill */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 px-3.5 py-1.5 rounded-lg shadow-sm text-xs">
            <span className="text-espresso-400 dark:text-espresso-500">Valuation:</span>
            <span className="font-bold text-espresso-900 dark:text-white font-mono">Weighted FIFO</span>
          </div>
        </section>
        {/* ── END: DashboardHeader ── */}

        {/* ── BEGIN: FourKPICards ── */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
          data-purpose="metric-summary-grid"
        >
          {/* KPI CARD 1: Total Ingredients */}
          <div className="bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 hover:border-espresso-200 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-culinary-50 dark:bg-emerald-950/70 text-culinary-700 dark:text-emerald-400 border border-culinary-100 dark:border-emerald-800/60 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <Link
                  to="/ingredients"
                  className="text-xs font-semibold text-espresso-600 dark:text-espresso-500 bg-flour-100 dark:bg-[#141b2c] px-2 py-0.5 rounded-md flex items-center gap-1 group-hover:text-espresso-900 dark:group-hover:text-white transition-colors"
                >
                  Pantry Master <span className="text-[10px]">↗</span>
                </Link>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-espresso-800 font-mono tracking-tight tabular-nums">
                  {ingredients.length}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-espresso-400 dark:text-espresso-500">
                  Items
                </span>
              </div>
              <p className="text-xs font-semibold text-espresso-700 dark:text-slate-300 mt-1">
                Total Ingredients
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stoneBorder/70 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-caramel-700 dark:text-amber-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-caramel-500" />
                  {pricedIngredientsCount} of {ingredients.length} priced
                </span>
                <Link
                  to="/ingredients"
                  className="text-culinary-700 dark:text-emerald-400 hover:text-culinary-800 dark:hover:text-emerald-300 font-bold hover:underline flex items-center gap-0.5"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-flour-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pricingCoverage === 100 ? "bg-culinary-600" : "bg-caramel-500"
                  }`}
                  style={{ width: `${Math.max(pricingCoverage, 6)}%` }}
                  title={`${pricingCoverage}% Completed`}
                />
              </div>
            </div>
          </div>

          {/* KPI CARD 2: Active Recipes */}
          <div className="bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 hover:border-espresso-200 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-flour-100 dark:bg-[#141b2c] text-espresso-800 dark:text-slate-200 border border-stoneBorder dark:border-slate-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-espresso-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <Link
                  to="/recipes"
                  className="text-xs font-semibold text-espresso-600 dark:text-espresso-500 bg-flour-100 dark:bg-[#141b2c] px-2 py-0.5 rounded-md flex items-center gap-1 group-hover:text-espresso-900 dark:group-hover:text-white transition-colors"
                >
                  Cost Engine <span className="text-[10px]">↗</span>
                </Link>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-espresso-800 font-mono tracking-tight tabular-nums">
                  {recipes.length}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-espresso-400 dark:text-espresso-500">
                  Formulas
                </span>
              </div>
              <p className="text-xs font-semibold text-espresso-700 dark:text-slate-300 mt-1">
                Active Recipes
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stoneBorder/70 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-espresso-500 dark:text-espresso-500 font-medium">
                  {recipes.length} ready for batch costing
                </span>
                <Link
                  to="/recipes"
                  className="text-culinary-700 dark:text-emerald-400 hover:text-culinary-800 dark:hover:text-emerald-300 font-bold hover:underline flex items-center gap-0.5"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-flour-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-espresso-300 dark:bg-slate-700 h-full rounded-full transition-all duration-500"
                  style={{ width: `${recipes.length > 0 ? 100 : 0}%` }}
                  title={`${recipes.length} Active Recipes`}
                />
              </div>
            </div>
          </div>

          {/* KPI CARD 3: Avg Target Markup */}
          <div className="bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 hover:border-espresso-200 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-culinary-100 dark:bg-emerald-950/70 text-culinary-800 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/60 flex items-center justify-center">
                  <svg className="w-5 h-5 text-culinary-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-culinary-700 dark:text-emerald-400 bg-culinary-50 dark:bg-emerald-950/60 border border-culinary-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                  Target: 50%+ <span className="text-[10px]">↗</span>
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-espresso-800 font-mono tracking-tight tabular-nums">
                  {avgMarkup ? avgMarkup : "50.0"}
                  <span className="text-xl font-bold">%</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-culinary-700 dark:text-emerald-300 bg-culinary-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  Retail
                </span>
              </div>
              <p className="text-xs font-semibold text-espresso-700 dark:text-slate-300 mt-1">
                Avg Target Markup
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stoneBorder/70 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-espresso-500 dark:text-espresso-500 font-medium truncate">
                  Target gross margin benchmark
                </span>
                <Link
                  to="/recipes"
                  className="text-culinary-700 dark:text-emerald-400 hover:text-culinary-800 dark:hover:text-emerald-300 font-bold hover:underline flex items-center gap-0.5 shrink-0"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-flour-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-culinary-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(avgMarkup ? parseFloat(avgMarkup) : 50, 100)}%` }}
                  title="Configured benchmark"
                />
              </div>
            </div>
          </div>

          {/* KPI CARD 4: Pricing Coverage */}
          <div className="bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 hover:border-espresso-200 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-caramel-100 dark:bg-amber-950/70 text-caramel-700 dark:text-amber-400 border border-caramel-200 dark:border-amber-800/60 flex items-center justify-center">
                  <svg className="w-5 h-5 text-caramel-700 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    pricingCoverage === 100
                      ? "text-culinary-700 dark:text-emerald-400 bg-culinary-50 dark:bg-emerald-950/60 border border-culinary-200 dark:border-emerald-800/60"
                      : "text-caramel-700 dark:text-amber-400 bg-caramel-50 dark:bg-amber-950/60 border border-caramel-200 dark:border-amber-800/60"
                  }`}
                >
                  {pricingCoverage === 100 ? "Fully Costed" : "Action Required"}{" "}
                  <span className="text-[10px]">↗</span>
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-espresso-800 font-mono tracking-tight tabular-nums">
                  {pricingCoverage}
                  <span className="text-xl font-bold">%</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-caramel-700 dark:text-amber-400">
                  Complete
                </span>
              </div>
              <p className="text-xs font-semibold text-espresso-700 dark:text-slate-300 mt-1">
                Pricing Coverage
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stoneBorder/70 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-espresso-500 dark:text-espresso-500 font-medium truncate">
                  {unpricedCount > 0 ? `${unpricedCount} ingredients need price` : "All ingredients costed"}
                </span>
                <Link
                  to="/ingredients"
                  className="text-caramel-700 dark:text-amber-400 hover:text-caramel-800 dark:hover:text-amber-300 font-bold hover:underline flex items-center gap-0.5 shrink-0"
                >
                  View →
                </Link>
              </div>
              <div className="w-full bg-flour-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pricingCoverage === 100 ? "bg-culinary-600" : "bg-caramel-500"
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
          className="bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 rounded-2xl p-6 sm:p-8 md:p-10 shadow-sm relative overflow-hidden"
          data-purpose="onboarding-launchpad"
        >
          {/* Subtle decorative background warmth curves */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-flour-100/60 dark:bg-slate-800/20 pointer-events-none -z-0" />
          <div className="absolute right-40 -bottom-24 w-64 h-64 rounded-full bg-culinary-50/50 dark:bg-emerald-950/20 pointer-events-none -z-0" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            {/* Central Action Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-espresso-900 dark:bg-[#1a2234] text-amber-400 shadow-md mb-5 border border-espresso-700 dark:border-slate-700 ring-4 ring-flour-300 dark:ring-slate-800/60">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-extrabold text-espresso-800 dark:text-white tracking-tight">
              Ready to Price Your First Bakery Product?
            </h2>

            {/* Narrative / Guide */}
            <p className="text-sm sm:text-base text-espresso-600 dark:text-slate-300 mt-3 leading-relaxed">
              Your{" "}
              <strong className="text-espresso-900 dark:text-white font-semibold">
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
                className={`rounded-xl p-3.5 relative transition-all ${
                  unpricedCount > 0
                    ? "bg-flour-100 dark:bg-[#141b2c] border-2 border-caramel-500/80"
                    : "bg-flour-100 dark:bg-[#141b2c] border border-culinary-500/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      unpricedCount > 0
                        ? "text-caramel-700 dark:text-amber-300 bg-caramel-100 dark:bg-amber-950/80"
                        : "text-culinary-700 dark:text-emerald-300 bg-culinary-100 dark:bg-emerald-950/80"
                    }`}
                  >
                    {unpricedCount > 0 ? "Step 1 • Action" : "Step 1 • Done ✓"}
                  </span>
                  {unpricedCount > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-caramel-500 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-culinary-500" />
                  )}
                </div>
                <h4 className="text-xs font-bold text-espresso-900 dark:text-white">
                  Input Purchase Costs
                </h4>
                <p className="text-[11px] text-espresso-600 dark:text-espresso-500 mt-1 leading-snug">
                  Set invoice prices per kg or pack for your {ingredients.length || 11} seeded pantry items.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-flour-100 dark:bg-[#141b2c] border border-stoneBorder dark:border-slate-800 rounded-xl p-3.5 opacity-90">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-espresso-400 dark:text-espresso-500 bg-flour-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Step 2
                  </span>
                  <span className="text-xs text-espresso-400 dark:text-espresso-500">Next</span>
                </div>
                <h4 className="text-xs font-bold text-espresso-900 dark:text-white">
                  Assemble Recipe Formula
                </h4>
                <p className="text-[11px] text-espresso-500 dark:text-espresso-500 mt-1 leading-snug">
                  Combine cups/grams with waste factors and batch yields.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-flour-100 dark:bg-[#141b2c] border border-stoneBorder dark:border-slate-800 rounded-xl p-3.5 opacity-90">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-espresso-400 dark:text-espresso-500 bg-flour-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Step 3
                  </span>
                  <span className="text-xs text-espresso-400 dark:text-espresso-500">Target</span>
                </div>
                <h4 className="text-xs font-bold text-espresso-900 dark:text-white">
                  Auto Gross Margin
                </h4>
                <p className="text-[11px] text-espresso-500 dark:text-espresso-500 mt-1 leading-snug">
                  Lock in 50%+ profit margin telemetry for retail and cafe wholesale.
                </p>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                to="/ingredients"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#141b2c] hover:bg-flour-100 dark:hover:bg-slate-800 text-espresso-850 dark:text-slate-100 font-bold text-sm border border-stoneBorder dark:border-slate-800 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
              >
                <svg className="w-4 h-4 text-caramel-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Set Ingredient Purchase Prices</span>
                <span className="bg-caramel-100 text-caramel-700 dark:bg-amber-950/80 dark:text-amber-300 text-xs px-1.5 py-0.5 rounded font-mono font-medium ml-1">
                  {ingredients.length || 11} Items
                </span>
              </Link>

              <Link
                to="/recipes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-culinary-600 hover:bg-culinary-700 text-white font-bold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
                <span>Create First Recipe</span>
              </Link>
            </div>

            {/* Small helper text with sample data loader */}
            <p className="text-[11px] text-espresso-400 dark:text-espresso-500 mt-4">
              ✨ Need sample bakery costs?{" "}
              <button
                onClick={handleLoadSampleData}
                disabled={seedingLoading}
                className="text-culinary-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
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
          <section className="space-y-4 pt-4 border-t border-stoneBorder dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-culinary-50 dark:bg-emerald-950/70 text-culinary-700 dark:text-emerald-300 flex items-center justify-center">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-espresso-900 dark:text-white tracking-tight">
                    Active Recipe Formulas
                  </h2>
                  <p className="text-xs text-espresso-500 dark:text-espresso-500">
                    Batches with computed unit and retail prices
                  </p>
                </div>
              </div>

              <Link
                to="/recipes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-culinary-700 dark:text-emerald-400 hover:text-culinary-800 dark:hover:text-emerald-300 group"
              >
                <span>Explore all {recipes.length} recipes</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {recipes.slice(0, 6).map((r) => {
                const markupPercent = Math.round(r.target_markup_pct * 100);
                return (
                  <Link
                    key={r.recipe_id}
                    to={`/recipes/${r.recipe_id}`}
                    className="group outline-none"
                  >
                    <div className="relative overflow-hidden rounded-xl p-5 bg-white dark:bg-[#0c101a] border border-stoneBorder dark:border-slate-800 shadow-sm hover:border-espresso-200 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-espresso-900 dark:text-white group-hover:text-culinary-700 dark:group-hover:text-emerald-400 transition-colors">
                            {r.name}
                          </h3>
                          <p className="text-xs text-espresso-500 dark:text-espresso-500 mt-0.5">
                            Standard Yield:{" "}
                            <strong className="text-espresso-800 dark:text-slate-200 font-semibold">
                              {r.yield_qty} units
                            </strong>
                          </p>
                        </div>

                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-culinary-50 dark:bg-emerald-950/70 text-culinary-700 dark:text-emerald-300 border border-culinary-200 dark:border-emerald-800/60">
                          {markupPercent}% Markup
                        </span>
                      </div>

                      <div className="bg-flour-100 dark:bg-[#141b2c] rounded-lg p-3 border border-stoneBorder dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-espresso-400 dark:text-espresso-500 block font-medium">
                            Labor Overhead
                          </span>
                          <span className="font-bold text-espresso-800 dark:text-slate-200 tabular-nums">
                            {fmt(r.labor_cost)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-espresso-400 dark:text-espresso-500 block font-medium">
                            Profit Alert At
                          </span>
                          <span className="font-bold text-espresso-800 dark:text-slate-200 tabular-nums">
                            {fmt(r.desired_profit_alert)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-xs text-espresso-500 dark:text-espresso-500 pt-2 border-t border-stoneBorder/70 dark:border-slate-800">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-culinary-600 dark:text-emerald-400" />
                          Formula active
                        </span>
                        <span className="font-semibold text-culinary-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
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

// Dashboard / home page — Executive bakery intelligence overview
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  BookOpen,
  TrendingUp,
  Coins,
  ArrowUpRight,
  Sparkles,
  Plus,
  UtensilsCrossed,
  ChefHat,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { getIngredients, getRecipes, type Ingredient, type Recipe } from "@/lib/api";
import { useApp } from "@/context/AppContext";

export default function Dashboard() {
  const { fmt } = useApp();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getIngredients(), getRecipes()])
      .then(([ings, recs]) => {
        setIngredients(ings);
        setRecipes(recs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 animate-pulse">
        {/* Skeleton Header */}
        <div className="space-y-3">
          <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-9 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-4 w-80 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>

        {/* Skeleton Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="w-20 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pricedIngredientsCount = ingredients.filter((i) => i.purchase_price > 0).length;
  const pricingCoverage = ingredients.length
    ? Math.round((pricedIngredientsCount / ingredients.length) * 100)
    : 0;

  const avgMarkup = recipes.length
    ? (recipes.reduce((s, r) => s + r.target_markup_pct, 0) / recipes.length).toFixed(0)
    : null;

  const stats = [
    {
      title: "Total Ingredients",
      value: ingredients.length,
      unit: "items",
      subtitle: `${pricedIngredientsCount} of ${ingredients.length} priced`,
      pill: "Pantry Master",
      pillVariant: "violet",
      to: "/ingredients",
      icon: Package,
      gradient: "from-violet-600 to-indigo-600",
      glowColor: "from-violet-500/10 via-purple-500/5 to-transparent",
      borderColor: "group-hover:border-violet-400/60 dark:group-hover:border-violet-500/50",
      pillClass:
        "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/40",
      iconBg: "bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-violet-500/25",
    },
    {
      title: "Active Recipes",
      value: recipes.length,
      unit: "formulas",
      subtitle: `${recipes.length} ready for batch costing`,
      pill: "Cost Engine",
      pillVariant: "indigo",
      to: "/recipes",
      icon: BookOpen,
      gradient: "from-indigo-600 to-sky-600",
      glowColor: "from-indigo-500/10 via-sky-500/5 to-transparent",
      borderColor: "group-hover:border-indigo-400/60 dark:group-hover:border-indigo-500/50",
      pillClass:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40",
      iconBg: "bg-gradient-to-tr from-indigo-600 to-sky-500 shadow-indigo-500/25",
    },
    {
      title: "Avg Target Markup",
      value: avgMarkup ? `${avgMarkup}%` : "—",
      unit: "retail",
      subtitle: "Target gross margin benchmark",
      pill: "Target: 50%+",
      pillVariant: "emerald",
      to: "/recipes",
      icon: TrendingUp,
      gradient: "from-emerald-600 to-teal-600",
      glowColor: "from-emerald-500/10 via-teal-500/5 to-transparent",
      borderColor: "group-hover:border-emerald-400/60 dark:group-hover:border-emerald-500/50",
      pillClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
      iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/25",
    },
    {
      title: "Pricing Coverage",
      value: `${pricingCoverage}%`,
      unit: "complete",
      subtitle: `${ingredients.length - pricedIngredientsCount} ingredients need price`,
      pill: pricingCoverage === 100 ? "Fully Costed" : "Action Required",
      pillVariant: "amber",
      to: "/ingredients",
      icon: Coins,
      gradient: "from-amber-500 to-rose-500",
      glowColor: "from-amber-500/10 via-rose-500/5 to-transparent",
      borderColor: "group-hover:border-amber-400/60 dark:group-hover:border-amber-500/50",
      pillClass:
        pricingCoverage === 100
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
      iconBg: "bg-gradient-to-tr from-amber-500 to-rose-500 shadow-amber-500/25",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Status pill matching reference design */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span className="tracking-wide">Inventory & Costing</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-bold">PHP (₱) Active</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Bakery Cost Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time recipe margin calculations, ingredient volume yields, and pricing telemetry.
          </p>
        </div>

        {/* Quick Action Buttons matching reference styling */}
        <div className="flex items-center gap-3">
          <Link
            to="/ingredients"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200
              border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800
              hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-all duration-200 active:scale-[0.98]"
          >
            <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Manage Ingredients
          </Link>

          <Link
            to="/recipes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-emerald-600 hover:bg-emerald-700
              shadow-md shadow-emerald-600/20
              transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            New Recipe
          </Link>
        </div>
      </div>

      {/* ── Modern Stat Cards Grid (Reference Design Style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} to={s.to} className="group outline-none">
              <div
                className={`relative overflow-hidden rounded-2xl p-5
                  bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl
                  border border-slate-200/90 dark:border-slate-800/80
                  shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]
                  hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10
                  ${s.borderColor}
                  transition-all duration-300 ease-out`}
              >
                {/* Subtle ambient gradient underlay */}
                <div
                  className={`absolute -top-12 -right-12 w-36 h-36 rounded-full bg-gradient-to-br ${s.glowColor} blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none`}
                />

                {/* Card Top Row: Icon + Badge + Arrow */}
                <div className="relative flex items-center justify-between gap-3 mb-4">
                  {/* Vibrant squircle icon badge */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white
                      ${s.iconBg} shadow-md
                      group-hover:scale-105 group-hover:rotate-1 transition-transform duration-300`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Top-right pill & micro arrow */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-2xs ${s.pillClass}`}
                    >
                      {s.pill}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
                  </div>
                </div>

                {/* Card Metric Display */}
                <div className="relative space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {s.unit}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                    {s.title}
                  </p>
                </div>

                {/* Card Footer Micro-Context */}
                <div className="relative mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{s.subtitle}</span>
                  <span className="text-violet-600 dark:text-violet-400 font-medium group-hover:underline">
                    View →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Active Recipes Showcase ── */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Recipe Formulas
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batches with computed unit and retail prices
                </p>
              </div>
            </div>

            <Link
              to="/recipes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 group"
            >
              <span>Explore all {recipes.length} recipes</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {recipes.slice(0, 6).map((r) => {
              const markupPercent = Math.round(r.target_markup_pct * 100);
              return (
                <Link key={r.recipe_id} to={`/recipes/${r.recipe_id}`} className="group outline-none">
                  <div
                    className="relative overflow-hidden rounded-2xl p-5
                      bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl
                      border border-slate-200/90 dark:border-slate-800/80
                      shadow-xs hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1
                      hover:border-violet-300 dark:hover:border-violet-600
                      transition-all duration-300 ease-out cursor-pointer"
                  >
                    {/* Top Row: Title + Markup badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {r.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Standard Yield: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{r.yield_qty} units</strong>
                        </p>
                      </div>

                      <span className="inline-flex items-center px-2.5 py-0.75 rounded-full text-xs font-bold bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-800/50">
                        {markupPercent}% Markup
                      </span>
                    </div>

                    {/* Middle Detail Row */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                          Labor Overhead
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {fmt(r.labor_cost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                          Profit Alert At
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {fmt(r.desired_profit_alert)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom action cue */}
                    <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="inline-flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Formula active
                      </span>
                      <span className="font-semibold text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Open Calculator →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty State / First Launch Experience ── */}
      {recipes.length === 0 && (
        <div
          className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center
            bg-gradient-to-b from-white/90 via-violet-50/30 to-white/70
            dark:from-slate-900/80 dark:via-violet-950/20 dark:to-slate-900/70
            border border-violet-150/70 dark:border-violet-900/40
            shadow-xl shadow-violet-500/5 backdrop-blur-xl"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 mb-5">
            <UtensilsCrossed className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ready to Price Your First Bakery Product?
          </h3>
          <p className="max-w-md mx-auto text-sm text-slate-500 dark:text-slate-400 mt-2 mb-8 leading-relaxed">
            Your 11 common baking ingredients are already seeded into the database. Update their purchase costs or create your first recipe formula.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ingredients"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100
                border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500
                hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              Set Ingredient Purchase Prices
            </Link>

            <Link
              to="/recipes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30
                transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create First Recipe
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

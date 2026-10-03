import React, { useState } from "react";
import { Hammer, Sparkles, Check, AlertCircle } from "lucide-react";
import { produceBatchWithValidation, type ProduceBatchSuccess, type ProductionError } from "@/lib/api";
import { Spinner } from "@/components/ui";

export interface ProductionTriggerPanelProps {
  recipeId: number;
  recipeName: string;
  onSuccess: (result: ProduceBatchSuccess) => void;
  onError: (err: ProductionError) => void;
  disabled?: boolean;
}

const PRESET_MULTIPLIERS = [1, 2, 5, 10];

export function ProductionTriggerPanel({
  recipeId,
  recipeName,
  onSuccess,
  onError,
  disabled = false,
}: ProductionTriggerPanelProps) {
  const [batches, setBatches] = useState<number>(1);
  const [isProducing, setIsProducing] = useState(false);

  const handleProduce = async () => {
    if (batches <= 0 || isProducing || disabled) return;

    setIsProducing(true);
    try {
      const res = await produceBatchWithValidation({
        recipe_id: recipeId,
        batches,
      });
      onSuccess(res);
    } catch (err: unknown) {
      let parsedError: ProductionError;
      if (typeof err === "object" && err !== null && "deficits" in err) {
        parsedError = err as ProductionError;
      } else if (typeof err === "string") {
        try {
          parsedError = JSON.parse(err);
        } catch {
          parsedError = { message: err };
        }
      } else if (err instanceof Error) {
        try {
          parsedError = JSON.parse(err.message);
        } catch {
          parsedError = { message: err.message };
        }
      } else {
        parsedError = { message: "Failed to produce batch due to an unknown error." };
      }
      onError(parsedError);
    } finally {
      setIsProducing(false);
    }
  };

  return (
    <div
      className="p-4 rounded-2xl border border-stoneBorder dark:border-slate-800 bg-white dark:bg-[#121826] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
      data-purpose="production-trigger-panel"
    >
      {/* Left: Description & Info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-culinary-50 dark:bg-culinary-950/70 border border-culinary-200 dark:border-culinary-800/80 flex items-center justify-center text-culinary-700 dark:text-culinary-400 shrink-0">
          <Hammer className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-espresso-900 dark:text-white">
              Production Execution &amp; Ledger Deduction
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-culinary-100 dark:bg-culinary-950/80 text-culinary-800 dark:text-culinary-300 border border-culinary-200 dark:border-culinary-800">
              Perpetual Stock
            </span>
          </div>
          <p className="text-xs text-espresso-500 dark:text-slate-400 mt-0.5">
            Pre-flight checks physical stock for &quot;{recipeName}&quot; before atomically deducting inventory.
          </p>
        </div>
      </div>

      {/* Right: Multiplier Controls & Trigger Button */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Preset Multipliers */}
        <div className="flex items-center rounded-xl border border-stoneBorder dark:border-slate-800 p-1 bg-flour-100/50 dark:bg-[#141b2c]/50 text-xs">
          {PRESET_MULTIPLIERS.map((mult) => (
            <button
              key={mult}
              type="button"
              onClick={() => setBatches(mult)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                batches === mult
                  ? "bg-culinary-600 text-white shadow-xs"
                  : "text-espresso-600 dark:text-slate-400 hover:text-espresso-900 dark:hover:text-white"
              }`}
            >
              {mult}x
            </button>
          ))}
        </div>

        {/* Stepper / Custom Number Input */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="batch-stepper-input" className="text-xs font-semibold text-espresso-600 dark:text-slate-400">
            Batches:
          </label>
          <input
            id="batch-stepper-input"
            type="number"
            min="0.1"
            step="0.5"
            value={batches}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setBatches(isNaN(val) ? 0 : val);
            }}
            className="w-16 px-2.5 py-1 text-xs font-bold font-mono rounded-lg border border-stoneBorder dark:border-slate-800 bg-flour-100 dark:bg-[#141b2c] text-espresso-900 dark:text-white text-center focus:outline-none focus:border-culinary-500"
          />
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleProduce}
          disabled={isProducing || disabled || batches <= 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-culinary-600 hover:bg-culinary-700 active:scale-[0.98] rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProducing ? (
            <>
              <Spinner className="w-3.5 h-3.5 text-white" />
              <span>Verifying Stock...</span>
            </>
          ) : (
            <>
              <Hammer className="w-4 h-4 text-white" />
              <span>Produce &amp; Deduct Stock</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

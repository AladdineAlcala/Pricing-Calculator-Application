// Reusable UI primitives
import React, { useState, useRef, useEffect, useId } from "react";
import { Info } from "lucide-react";

// ── Button ────────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-culinary-600 hover:bg-culinary-700 text-white font-bold shadow-sm hover:scale-[1.01] active:scale-[0.99]",
  secondary:
    "bg-white border border-stoneBorder text-espresso-700 font-semibold hover:bg-flour-50 shadow-sm hover:scale-[1.01] active:scale-[0.99]",
  ghost:
    "text-culinary-600 hover:underline font-bold",
  destructive:
    "bg-rose-600 text-white hover:bg-rose-700 font-bold shadow-sm active:scale-[0.99]",
  outline:
    "border border-stoneBorder bg-transparent hover:bg-flour-100 text-espresso-800 font-semibold",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-2.5 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-150 focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-culinary-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer
        ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
  tooltip?: React.ReactNode;
}

export function Input({ label, error, suffix, tooltip, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center gap-1.5">
          <label htmlFor={inputId} className="text-xs font-bold text-espresso-700 dark:text-slate-300 uppercase tracking-wide">
            {label}
          </label>
          {tooltip && <InfoTooltip content={tooltip} ariaLabel={`Information about ${label}`} />}
        </div>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full rounded-lg border border-stoneBorder
            bg-white px-3 py-2 text-sm text-espresso-800
            placeholder:text-espresso-400
            focus:outline-none focus:border-culinary-600 focus:ring-1 focus:ring-culinary-600
            transition-all disabled:bg-flour-200 disabled:text-espresso-500 disabled:cursor-not-allowed disabled:opacity-50
            ${suffix ? "pr-10" : ""}
            ${error ? "border-red-400 focus:border-red-500" : ""}
            ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-semibold text-espresso-400 dark:text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-stoneBorder bg-white
        text-espresso-800 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`px-6 py-4 border-b border-stoneBorder ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: CardProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "destructive";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-flour-200 text-espresso-700",
  success: "bg-emerald-100 text-culinary-700",
  warning: "bg-amber-100 text-caramel-700",
  destructive: "bg-rose-50 text-rose-700",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold
        ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────
interface AlertBannerProps {
  type: "warning" | "success" | "error";
  title: string;
  message?: string;
}

const alertStyles = {
  warning: "bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))]",
  success: "bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.5)] text-[hsl(var(--success))]",
  error: "bg-[hsl(var(--destructive)/0.12)] border-[hsl(var(--destructive)/0.5)] text-[hsl(var(--destructive))]",
};

const alertIcons = {
  warning: "⚠️",
  success: "✅",
  error: "❌",
};

export function AlertBanner({ type, title, message }: AlertBannerProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 mb-4
        animate-in fade-in slide-in-from-top-1 duration-300
        ${alertStyles[type]}`}
    >
      <span className="text-lg leading-none mt-0.5">{alertIcons[type]}</span>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {message && <p className="text-xs opacity-80 mt-0.5">{message}</p>}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const modalSizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative z-10 w-full ${modalSizes[size]} rounded-xl border border-[hsl(var(--border))]
          bg-[hsl(var(--card))] shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]
              transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-[hsl(var(--primary))] ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="text-5xl">{icon}</div>
      <div>
        <p className="text-base font-semibold text-[hsl(var(--foreground))]">{title}</p>
        {description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
  delayMs = 120,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const tooltipId = useId();

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "-bottom-1 left-1/2 -translate-x-1/2 border-b border-r",
    bottom: "-top-1 left-1/2 -translate-x-1/2 border-t border-l",
    left: "-right-1 top-1/2 -translate-y-1/2 border-t border-r",
    right: "-left-1 top-1/2 -translate-y-1/2 border-b border-l",
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 pointer-events-none w-max max-w-xs rounded-xl
            border border-slate-200/90 dark:border-slate-800/90
            bg-white/95 dark:bg-[#0f172a]/95
            text-slate-800 dark:text-slate-100 p-2.5 text-xs font-normal
            shadow-xl shadow-slate-900/10 dark:shadow-black/40 backdrop-blur-md
            animate-in fade-in zoom-in-95 duration-150
            ${positionClasses[position]}`}
        >
          {content}
          <span
            className={`absolute w-2 h-2 rotate-45 pointer-events-none
              bg-white/95 dark:bg-[#0f172a]/95
              border-slate-200/90 dark:border-slate-800/90
              ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// ── InfoTooltip ───────────────────────────────────────────────────────────────
export function InfoTooltip({
  content,
  position = "top",
  ariaLabel = "More information",
  className = "",
}: {
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <Tooltip content={content} position={position}>
      <span
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:text-slate-900 dark:focus-visible:text-white focus-visible:outline-none transition-colors cursor-help ${className}`}
      >
        <Info className="w-3.5 h-3.5" />
      </span>
    </Tooltip>
  );
}

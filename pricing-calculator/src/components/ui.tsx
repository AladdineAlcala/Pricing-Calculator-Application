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
    "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 shadow-sm",
  secondary:
    "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]",
  ghost: "hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]",
  destructive:
    "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-90",
  outline:
    "border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
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
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium
        transition-all duration-150 focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:pointer-events-none
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
          <label htmlFor={inputId} className="text-sm font-medium text-[hsl(var(--foreground))]">
            {label}
          </label>
          {tooltip && <InfoTooltip content={tooltip} ariaLabel={`Information about ${label}`} />}
        </div>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full rounded-[var(--radius)] border border-[hsl(var(--input))]
            bg-[hsl(var(--card))] px-3 py-2 text-sm text-[hsl(var(--foreground))]
            placeholder:text-[hsl(var(--muted-foreground))]
            focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]
            transition-colors disabled:opacity-50
            ${suffix ? "pr-10" : ""}
            ${error ? "border-[hsl(var(--destructive))]" : ""}
            ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs text-[hsl(var(--muted-foreground))]">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>}
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
      className={`rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]
        text-[hsl(var(--card-foreground))] shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`px-6 py-4 border-b border-[hsl(var(--border))] ${className}`}>{children}</div>;
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
  default: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  success: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
  destructive: "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
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

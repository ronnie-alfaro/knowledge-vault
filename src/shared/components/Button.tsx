import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/utils";

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "icon" }>;

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded border font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-vault-accent bg-vault-accent text-white hover:bg-teal-800",
        variant === "secondary" && "border-vault-line bg-white text-vault-ink hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
        variant === "ghost" && "border-transparent bg-transparent hover:bg-black/5 dark:hover:bg-white/10",
        variant === "danger" && "border-red-700 bg-red-700 text-white hover:bg-red-800",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "icon" && "h-9 w-9 p-0",
        className
      )}
      {...props}
    />
  );
}

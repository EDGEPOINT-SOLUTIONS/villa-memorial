import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

type Props = {
  variant?: Variant;
  size?: "sm" | "lg";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  ghost: "btn--ghost",
  danger: "btn--danger",
  accent: "btn--accent",
};

export function Button({
  variant = "primary",
  size,
  children,
  className = "",
  type = "button",
  ...rest
}: Props) {
  const sizeClass = size ? ` btn--${size}` : "";
  return (
    <button
      type={type}
      className={`btn ${VARIANT_CLASS[variant]}${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, Inbox } from "lucide-react";
import { ButtonHTMLAttributes, ReactNode } from "react";
export function Button({
  children,
  variant = "primary",
  busy = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`ax-button ${variant} ${props.className || ""}`}
    >
      {busy ? <Loader2 size={16} className="ax-spin" /> : null}
      {children}
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <div className="ax-portal">
          <Dialog.Overlay className="ax-overlay" />
          <Dialog.Content
            aria-describedby={undefined}
            className={`ax-modal ${wide ? "wide" : ""} ${drawer ? "drawer" : ""}`}
          >
            <header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="ax-icon" aria-label="Kapat">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </header>
            <div className="ax-modal-body">{children}</div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ax-empty">
      <Inbox size={30} />
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`ax-badge ${tone}`}>{children}</span>;
}
export function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`ax-field ${full ? "full" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ax-tabs">
      {items.map((i) => (
        <button
          key={i}
          aria-pressed={i === value}
          onClick={() => onChange(i)}
          className={i === value ? "active" : ""}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

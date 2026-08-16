import type { ReactNode } from "react";
import { useId } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  SelectContent,
  SelectItem,
  Select as SelectRoot,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

/**
 * The form pieces every tool shares.
 *
 * These are thin wrappers over the components in ui/, which are ShadCN's.
 * Keeping this layer means a tool asks for "a select with these options"
 * rather than assembling a trigger, a portal, and a list itself, and it means
 * the five tools did not have to change when the controls underneath them did.
 */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      ) : null}
      {children(id)}
    </div>
  );
}

export function Select({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <SelectRoot value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
}: {
  id: string;
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(raw === "" ? "" : Number(raw));
      }}
    />
  );
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function TextArea({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Textarea
      id={id}
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function RunButton({
  busy,
  disabled,
  children,
  onClick,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button size="lg" onClick={onClick} disabled={busy || disabled}>
      {busy ? (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
            className="animate-spin"
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          Working
        </>
      ) : (
        children
      )}
    </Button>
  );
}

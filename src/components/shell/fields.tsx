import type { ReactNode } from "react";
import { useId } from "react";

/** Shared form pieces, so every tool page looks and behaves the same. */

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
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {hint ? <p className="hint">{hint}</p> : null}
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
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="control"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  id: string;
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(raw === "" ? "" : Number(raw));
      }}
      className="control"
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
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="control"
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
    <textarea
      id={id}
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="control"
      style={{ resize: "vertical", fontFamily: "var(--font-mono)" }}
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
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="btn"
    >
      {busy ? (
        <>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
            style={{ animation: "spin 0.9s linear infinite" }}
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          Working
        </>
      ) : (
        children
      )}
    </button>
  );
}

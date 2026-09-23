import { useEffect, useId, useRef, useState } from "react";

export type RoleOption = { value: string; label: string };

type RolePickerProps = {
  options: readonly RoleOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function RolePicker({ options, value, onChange, disabled }: RolePickerProps) {
  const btnId = useId();
  const listId = `${btnId}-list`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`role-picker${open ? " role-picker--open" : ""}${disabled ? " role-picker--disabled" : ""}`}
    >
      <button
        type="button"
        id={btnId}
        className="role-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
      >
        <span className="role-picker-value">{current?.label ?? value}</span>
        <span className="role-picker-chevron" aria-hidden />
      </button>
      <ul
        id={listId}
        className="role-picker-list"
        role="listbox"
        aria-labelledby={btnId}
        hidden={!open}
      >
        {options.map((o) => (
          <li key={o.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`role-picker-option${o.value === value ? " role-picker-option--active" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

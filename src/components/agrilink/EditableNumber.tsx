import { useEffect, useState } from "react";
import { useAgri } from "@/lib/agrilink/store";
import type { Inputs } from "@/lib/agrilink/model";
import { cn } from "@/lib/utils";

interface Props {
  field: keyof Inputs;
  suffix?: string;
  prefix?: string;
  step?: number;
  className?: string;
  format?: (v: number) => string;
}

export function EditableNumber({ field, suffix, prefix, step = 1, className, format }: Props) {
  const { inputs, setInput, presenting } = useAgri();
  const value = inputs[field];
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const display = format ? format(value) : new Intl.NumberFormat("pt-AO").format(value);

  if (presenting) {
    return (
      <span className={cn("tabular-nums font-semibold", className)}>
        {prefix}
        {display}
        {suffix ? ` ${suffix}` : ""}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      {prefix ? <span>{prefix}</span> : null}
      <input
        type="number"
        step={step}
        value={editing ? draft : String(value)}
        onFocus={(e) => {
          setEditing(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const n = Number(draft);
          setInput(field, Number.isFinite(n) ? n : value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="editable-input"
      />
      {suffix ? <span className="text-muted-foreground text-sm">{suffix}</span> : null}
    </span>
  );
}

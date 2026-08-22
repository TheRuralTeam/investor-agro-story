import type { CellValue } from "./engine";
import type { SheetMeta } from "./templates";

export type Fmt = SheetMeta["rowFmt"][number];

const nf = (d = 0) =>
  new Intl.NumberFormat("pt-AO", { minimumFractionDigits: d, maximumFractionDigits: d });

export function formatValue(v: CellValue, fmt?: Fmt): string {
  if (v === "" || v === undefined || v === null) return "";
  if (typeof v === "boolean") return v ? "VERDADEIRO" : "FALSO";
  if (typeof v === "string") return v;
  if (!Number.isFinite(v)) return "—";
  switch (fmt) {
    case "kz":
      return `${nf(0).format(Math.round(v))} Kz`;
    case "pct":
      return `${nf(1).format(v * 100)}%`;
    case "dias":
      return `${nf(0).format(v)} d`;
    case "num":
      return nf(Math.abs(v) < 100 && !Number.isInteger(v) ? 1 : 0).format(v);
    default:
      return Number.isInteger(v) ? nf(0).format(v) : nf(2).format(v);
  }
}

export const kzShort = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)} mM Kz`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)} M Kz`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)} k Kz`;
  return `${Math.round(v)} Kz`;
};

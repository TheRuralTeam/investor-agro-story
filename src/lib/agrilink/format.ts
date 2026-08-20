const nf = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 1 });

export const kz = (v: number) => `${nf.format(Math.round(v))} Kz`;

export function kzShort(v: number) {
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${nf1.format(v / 1_000_000_000)} MM Kz`;
  if (a >= 1_000_000) return `${nf1.format(v / 1_000_000)} M Kz`;
  if (a >= 1_000) return `${nf.format(v / 1_000)} mil Kz`;
  return kz(v);
}

export const num = (v: number) => nf.format(Math.round(v));
export const pct = (v: number) => `${nf1.format(v)}%`;

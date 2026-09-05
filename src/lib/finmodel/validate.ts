import { addr, colIndex, colName, parseAddr, type Computed, type Sheet } from "./engine";
import type { SheetMeta } from "./templates";

export type IssueLevel = "error" | "warn";

export interface Issue {
  addr: string;
  level: IssueLevel;
  message: string;
}

const TOTAL_RE = /\b(total|totais|soma|subtotal)\b/i;
const REVENUE_RE = /\b(receita|receitas|venda|vendas|entrada|entradas)\b/i;
const COST_RE = /\b(custo|custos|despesa|despesas|gasto|gastos)\b/i;

const num = (c: Computed | undefined): number | null =>
  c && typeof c.value === "number" && Number.isFinite(c.value) ? c.value : null;

const near = (a: number, b: number) => {
  const tol = Math.max(1, Math.abs(b) * 0.005);
  return Math.abs(a - b) <= tol;
};

const fmtNum = (v: number) =>
  new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(v);

/**
 * Inspect a sheet and report invalid values: formula errors, totals that do not
 * match the values they should add up, out-of-range percentages, text where a
 * number is expected and signs that contradict the row label.
 */
export function validateSheet(
  sheet: Sheet,
  meta: SheetMeta | undefined,
  values: Map<string, Computed>,
): Issue[] {
  const issues: Issue[] = [];
  const get = (a: string) => values.get(`${sheet.id}!${a}`);
  const rowFmt = meta?.rowFmt ?? {};
  const labelCol = meta?.labelCol ?? 0;

  const maxRow = Math.max(sheet.rows, 1);
  const maxCol = Math.max(sheet.cols, 1);

  const label = (r: number) => {
    const v = sheet.cells[addr(r, labelCol)] ?? "";
    return v.trim();
  };

  /* 1. formula errors + type problems ---------------------------------- */
  for (const [a, rawVal] of Object.entries(sheet.cells)) {
    const p = parseAddr(a);
    if (!p) continue;
    const c = get(a);
    if (c?.error) {
      issues.push({ addr: a, level: "error", message: `Fórmula com erro (${c.error}) em ${a}.` });
      continue;
    }
    const raw = (rawVal ?? "").trim();
    if (!raw || p.col === labelCol || p.row <= (meta?.headerRow ?? 2)) continue;
    const fmt = rowFmt[p.row];
    if (fmt && typeof c?.value === "string" && c.value !== "") {
      issues.push({
        addr: a,
        level: "error",
        message: `${a} devia conter um número, mas tem texto ("${c.value}").`,
      });
      continue;
    }
    const n = num(c);
    if (n === null) continue;
    if (fmt === "pct" && Math.abs(n) > 1.0001) {
      issues.push({
        addr: a,
        level: "warn",
        message: `${a}: percentagem de ${fmtNum(n * 100)}% acima de 100%. Escreva 0,15 ou 15%.`,
      });
    }
    const lab = label(p.row);
    if (n < 0 && REVENUE_RE.test(lab) && !TOTAL_RE.test(lab)) {
      issues.push({ addr: a, level: "warn", message: `${a}: receita negativa (${fmtNum(n)}).` });
    }
    if (n < 0 && COST_RE.test(lab) && !TOTAL_RE.test(lab)) {
      issues.push({
        addr: a,
        level: "warn",
        message: `${a}: custo negativo (${fmtNum(n)}). Registe os custos como valores positivos.`,
      });
    }
  }

  /* 2. total rows: value typed by hand vs. sum of the block above ------- */
  for (let r = 0; r < maxRow; r++) {
    const lab = label(r);
    if (!lab || !TOTAL_RE.test(lab)) continue;
    // block = contiguous rows above with a label and no "total"
    const members: number[] = [];
    for (let k = r - 1; k >= 0; k--) {
      const l = label(k);
      if (!l) break;
      if (TOTAL_RE.test(l)) break;
      if (k <= (meta?.headerRow ?? 2)) break;
      members.push(k);
    }
    if (members.length < 2) continue;
    for (let c = labelCol + 1; c < maxCol; c++) {
      const a = addr(r, c);
      const raw = (sheet.cells[a] ?? "").trim();
      if (!raw || raw.startsWith("=")) continue; // formulas are trusted
      const total = num(get(a));
      if (total === null) continue;
      let sum = 0;
      let any = false;
      for (const k of members) {
        const v = num(get(addr(k, c)));
        if (v !== null) {
          sum += v;
          any = true;
        }
      }
      if (!any) continue;
      if (!near(total, sum)) {
        issues.push({
          addr: a,
          level: "error",
          message: `${a}: total ${fmtNum(total)} não bate com a soma das linhas acima (${fmtNum(sum)}), diferença de ${fmtNum(total - sum)}.`,
        });
      }
    }
  }

  /* 3. total column: header says Total, value typed by hand ------------- */
  const headerRow = meta?.headerRow ?? 2;
  for (let c = labelCol + 1; c < maxCol; c++) {
    const head = (sheet.cells[addr(headerRow, c)] ?? "").trim();
    if (!head || !TOTAL_RE.test(head)) continue;
    for (let r = headerRow + 1; r < maxRow; r++) {
      const a = addr(r, c);
      const raw = (sheet.cells[a] ?? "").trim();
      if (!raw || raw.startsWith("=")) continue;
      const total = num(get(a));
      if (total === null) continue;
      let sum = 0;
      let any = false;
      for (let k = labelCol + 1; k < c; k++) {
        const v = num(get(addr(r, k)));
        if (v !== null) {
          sum += v;
          any = true;
        }
      }
      if (!any) continue;
      if (!near(total, sum)) {
        issues.push({
          addr: a,
          level: "error",
          message: `${a}: total da linha ${r + 1} (${fmtNum(total)}) não bate com a soma de ${colName(labelCol + 1)} a ${colName(c - 1)} (${fmtNum(sum)}).`,
        });
      }
    }
  }

  // stable order: by row then column
  issues.sort((x, y) => {
    const px = parseAddr(x.addr);
    const py = parseAddr(y.addr);
    if (!px || !py) return 0;
    return px.row - py.row || px.col - py.col;
  });
  return issues;
}

export function issuesByAddr(list: Issue[]): Map<string, Issue> {
  const map = new Map<string, Issue>();
  for (const i of list) {
    const cur = map.get(i.addr);
    if (!cur || (cur.level === "warn" && i.level === "error")) map.set(i.addr, i);
  }
  return map;
}

export { colIndex };

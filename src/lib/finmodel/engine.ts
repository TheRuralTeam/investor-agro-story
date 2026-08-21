// Minimal spreadsheet formula engine: cell refs, ranges, cross-sheet refs,
// arithmetic and a set of financial/statistical functions.

export type CellValue = number | string | boolean;

export interface Sheet {
  id: string;
  name: string;
  rows: number;
  cols: number;
  /** key = "A1" -> raw content (may start with "=") */
  cells: Record<string, string>;
  colWidths?: Record<number, number>;
}

export interface Workbook {
  sheets: Sheet[];
}

export function colName(index: number): string {
  let n = index;
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function colIndex(name: string): number {
  let n = 0;
  for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export const addr = (row: number, col: number) => `${colName(col)}${row + 1}`;

export function parseAddr(a: string): { row: number; col: number } | null {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(a.trim());
  if (!m) return null;
  return { row: Number(m[2]) - 1, col: colIndex(m[1]!) };
}

/* ----------------------------- tokenizer ----------------------------- */

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; sheet?: string; a: string; b?: string }
  | { t: "fn"; v: string }
  | { t: "op"; v: string };

const REF = "(?:'[^']+'|[A-Za-z_][A-Za-z0-9_ .\\-]*)!";
const RE = new RegExp(
  `\\s*(?:(\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)|"([^"]*)"|(${REF})?(\\$?[A-Za-z]+\\$?\\d+)(?:\\s*:\\s*(\\$?[A-Za-z]+\\$?\\d+))?|([A-Za-z][A-Za-z0-9_.]*)\\s*\\(|(<=|>=|<>|[-+*/^%(),<>=&]))`,
  "y",
);

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  RE.lastIndex = 0;
  while (RE.lastIndex < src.length) {
    const start = RE.lastIndex;
    const m = RE.exec(src);
    if (!m || m.index !== start) {
      if (src.slice(start).trim() === "") break;
      throw new Error("Sintaxe inválida");
    }
    if (m[1] !== undefined) out.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: "str", v: m[2] });
    else if (m[4] !== undefined) {
      const sheetRaw = m[3]?.slice(0, -1);
      const sheet = sheetRaw ? sheetRaw.replace(/^'|'$/g, "") : undefined;
      out.push({ t: "ref", sheet, a: m[4].replace(/\$/g, ""), b: m[5]?.replace(/\$/g, "") });
    } else if (m[6] !== undefined) out.push({ t: "fn", v: m[6].toUpperCase() });
    else out.push({ t: "op", v: m[7]! });
  }
  return out;
}

/* ----------------------------- evaluation ---------------------------- */

const toNum = (v: CellValue | undefined): number => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

class Evaluator {
  private bySheetName = new Map<string, Sheet>();
  private cache = new Map<string, CellValue>();
  private visiting = new Set<string>();

  constructor(private workbook: Workbook) {
    workbook.sheets.forEach((s) => this.bySheetName.set(s.name.toLowerCase(), s));
  }

  sheetByName(name: string) {
    return this.bySheetName.get(name.toLowerCase());
  }

  /** Value of a single cell, following formulas. */
  cell(sheet: Sheet, a: string): CellValue {
    const key = `${sheet.id}!${a.toUpperCase()}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.visiting.has(key)) throw new Error("#CIRC!");
    const raw = sheet.cells[a.toUpperCase()] ?? "";
    let value: CellValue;
    if (raw.trim().startsWith("=")) {
      this.visiting.add(key);
      try {
        value = this.evaluate(raw.trim().slice(1), sheet);
      } finally {
        this.visiting.delete(key);
      }
    } else if (raw.trim() === "") value = "";
    else {
      const cleaned = raw.trim().replace(/\s/g, "");
      const pctm = /^(-?\d+(?:[.,]\d+)?)%$/.exec(cleaned);
      if (pctm) value = Number(pctm[1]!.replace(",", ".")) / 100;
      else {
        const n = Number(cleaned.replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
        value = cleaned !== "" && Number.isFinite(n) ? n : raw;
      }
    }
    this.cache.set(key, value);
    return value;
  }

  private range(tok: Extract<Tok, { t: "ref" }>, current: Sheet): CellValue[] {
    const sheet = tok.sheet ? this.sheetByName(tok.sheet) : current;
    if (!sheet) throw new Error("#REF!");
    const a = parseAddr(tok.a);
    if (!a) throw new Error("#REF!");
    if (!tok.b) return [this.cell(sheet, tok.a)];
    const b = parseAddr(tok.b);
    if (!b) throw new Error("#REF!");
    const out: CellValue[] = [];
    for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++)
        out.push(this.cell(sheet, addr(r, c)));
    return out;
  }

  evaluate(expr: string, sheet: Sheet): CellValue {
    const toks = tokenize(expr);
    let i = 0;
    const peek = () => toks[i];
    const eat = (v: string) => {
      const t = toks[i];
      if (t && t.t === "op" && t.v === v) {
        i++;
        return true;
      }
      return false;
    };

    const args = (): CellValue[][] => {
      const list: CellValue[][] = [];
      if (eat(")")) return list;
      for (;;) {
        const t = peek();
        if (t && t.t === "ref" && t.b) {
          list.push(this.range(t, sheet));
          i++;
        } else list.push([comparison()]);
        if (eat(",")) continue;
        if (eat(")")) break;
        throw new Error("#ERRO!");
      }
      return list;
    };

    const primary = (): CellValue => {
      const t = peek();
      if (!t) throw new Error("#ERRO!");
      if (t.t === "num") {
        i++;
        return t.v;
      }
      if (t.t === "str") {
        i++;
        return t.v;
      }
      if (t.t === "ref") {
        i++;
        if (t.b) {
          const vals = this.range(t, sheet);
          return vals.reduce<number>((a, v) => a + toNum(v), 0);
        }
        const s = t.sheet ? this.sheetByName(t.sheet) : sheet;
        if (!s) throw new Error("#REF!");
        return this.cell(s, t.a);
      }
      if (t.t === "fn") {
        i++;
        return callFn(t.v, args());
      }
      if (t.t === "op" && t.v === "(") {
        i++;
        const v = comparison();
        if (!eat(")")) throw new Error("#ERRO!");
        return v;
      }
      if (t.t === "op" && (t.v === "-" || t.v === "+")) {
        i++;
        const v = toNum(primary());
        return t.v === "-" ? -v : v;
      }
      throw new Error("#ERRO!");
    };

    const postfix = (): CellValue => {
      let v = primary();
      while (peek() && peek()!.t === "op" && (peek() as { v: string }).v === "%") {
        i++;
        v = toNum(v) / 100;
      }
      return v;
    };

    const power = (): CellValue => {
      let v = postfix();
      while (eat("^")) v = Math.pow(toNum(v), toNum(postfix()));
      return v;
    };

    const term = (): CellValue => {
      let v = power();
      for (;;) {
        if (eat("*")) v = toNum(v) * toNum(power());
        else if (eat("/")) {
          const d = toNum(power());
          if (d === 0) throw new Error("#DIV/0!");
          v = toNum(v) / d;
        } else return v;
      }
    };

    const sum = (): CellValue => {
      let v = term();
      for (;;) {
        if (eat("+")) v = toNum(v) + toNum(term());
        else if (eat("-")) v = toNum(v) - toNum(term());
        else if (eat("&")) v = `${fmtRaw(v)}${fmtRaw(term())}`;
        else return v;
      }
    };

    const comparison = (): CellValue => {
      const a = sum();
      for (const op of ["<=", ">=", "<>", "<", ">", "="]) {
        if (eat(op)) {
          const b = sum();
          const na = typeof a === "string" ? a : toNum(a);
          const nb = typeof b === "string" ? b : toNum(b);
          switch (op) {
            case "<=":
              return na <= nb;
            case ">=":
              return na >= nb;
            case "<>":
              return na !== nb;
            case "<":
              return na < nb;
            case ">":
              return na > nb;
            default:
              return na === nb;
          }
        }
      }
      return a;
    };

    const result = comparison();
    if (i < toks.length) throw new Error("#ERRO!");
    return result;
  }
}

const fmtRaw = (v: CellValue) => (typeof v === "number" ? String(v) : String(v));

function flat(a: CellValue[][]): number[] {
  return a.flat().filter((v) => v !== "" && v !== undefined).map(toNum);
}

function npv(rate: number, flows: number[]) {
  return flows.reduce((acc, f, k) => acc + f / Math.pow(1 + rate, k + 1), 0);
}

function irr(flows: number[]) {
  let lo = -0.9999;
  let hi = 10;
  const f = (r: number) => flows.reduce((a, c, k) => a + c / Math.pow(1 + r, k), 0);
  let flo = f(lo);
  if (!Number.isFinite(flo)) return NaN;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if ((flo < 0) === (fm < 0)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

function callFn(name: string, a: CellValue[][]): CellValue {
  const nums = () => flat(a);
  const arg = (k: number) => a[k]?.[0] ?? "";
  const n = (k: number) => toNum(arg(k));
  switch (name) {
    case "SUM":
    case "SOMA":
      return nums().reduce((x, y) => x + y, 0);
    case "AVERAGE":
    case "MEDIA":
    case "MÉDIA": {
      const v = nums();
      return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
    }
    case "MIN":
      return Math.min(...(nums().length ? nums() : [0]));
    case "MAX":
      return Math.max(...(nums().length ? nums() : [0]));
    case "COUNT":
    case "CONTAR":
      return nums().length;
    case "ABS":
      return Math.abs(n(0));
    case "ROUND":
    case "ARRED": {
      const d = Math.pow(10, n(1));
      return Math.round(n(0) * d) / d;
    }
    case "IF":
    case "SE": {
      const c = arg(0);
      const truthy = typeof c === "boolean" ? c : toNum(c) !== 0;
      return truthy ? (arg(1) ?? "") : (arg(2) ?? "");
    }
    case "IFERROR":
      return arg(0);
    case "SUMPRODUCT": {
      const lists = a.map((l) => l.map(toNum));
      const len = Math.min(...lists.map((l) => l.length));
      let s = 0;
      for (let k = 0; k < len; k++) s += lists.reduce((p, l) => p * (l[k] ?? 0), 1);
      return s;
    }
    case "NPV":
    case "VAL":
      return npv(n(0), a.slice(1).flat().map(toNum));
    case "IRR":
    case "TIR":
      return irr(a.flat().map(toNum));
    case "PMT": {
      const r = n(0);
      const nper = n(1);
      const pv = n(2);
      if (r === 0) return nper ? -pv / nper : 0;
      return (-pv * r) / (1 - Math.pow(1 + r, -nper));
    }
    case "POWER":
      return Math.pow(n(0), n(1));
    case "SQRT":
      return Math.sqrt(n(0));
    default:
      throw new Error("#NOME?");
  }
}

export interface Computed {
  value: CellValue;
  error?: string;
}

/** Compute every non-empty cell of the workbook. Key = `${sheetId}!A1`. */
export function computeWorkbook(wb: Workbook): Map<string, Computed> {
  const ev = new Evaluator(wb);
  const out = new Map<string, Computed>();
  for (const sheet of wb.sheets) {
    for (const key of Object.keys(sheet.cells)) {
      if ((sheet.cells[key] ?? "").trim() === "") continue;
      try {
        out.set(`${sheet.id}!${key}`, { value: ev.cell(sheet, key) });
      } catch (e) {
        out.set(`${sheet.id}!${key}`, {
          value: e instanceof Error ? e.message : "#ERRO!",
          error: e instanceof Error ? e.message : "#ERRO!",
        });
      }
    }
  }
  return out;
}

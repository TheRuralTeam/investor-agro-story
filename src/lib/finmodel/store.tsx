import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addr, colName, computeWorkbook, parseAddr, type Computed, type Sheet } from "./engine";
import { blankSheet, buildTemplateWorkbook, type SheetMeta } from "./templates";

const STORAGE_KEY = "agrilink-finmodel-v1";

export interface Snapshot {
  name: string;
  createdAt: number;
  sheets: Sheet[];
  meta: Record<string, SheetMeta>;
}

interface State {
  sheets: Sheet[];
  meta: Record<string, SheetMeta>;
  activeId: string;
  snapshots: Snapshot[];
}

function initialState(): State {
  const t = buildTemplateWorkbook();
  return { sheets: t.sheets, meta: t.meta, activeId: t.sheets[0]!.id, snapshots: [] };
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

interface Ctx {
  sheets: Sheet[];
  meta: Record<string, SheetMeta>;
  sheet: Sheet;
  activeId: string;
  values: Map<string, Computed>;
  snapshots: Snapshot[];
  setActive: (id: string) => void;
  setCell: (sheetId: string, a: string, raw: string) => void;
  clearRange: (sheetId: string, cells: string[]) => void;
  addRows: (sheetId: string, at: number, count?: number) => void;
  removeRow: (sheetId: string, at: number) => void;
  addCols: (sheetId: string, at: number, count?: number) => void;
  removeCol: (sheetId: string, at: number) => void;
  addSheet: (name?: string) => void;
  duplicateSheet: (id: string) => void;
  renameSheet: (id: string, name: string) => void;
  removeSheet: (id: string) => void;
  resetAll: () => void;
  saveSnapshot: (name: string) => void;
  loadSnapshot: (name: string) => void;
  deleteSnapshot: (name: string) => void;
  setRowFmt: (sheetId: string, row: number, fmt: SheetMeta["rowFmt"][number] | null) => void;
}

const FinCtx = createContext<Ctx | null>(null);

/** Shift references in a formula when rows/cols are inserted or removed. */
function shiftFormula(raw: string, kind: "row" | "col", at: number, delta: number): string {
  if (!raw.startsWith("=")) return raw;
  return raw.replace(/(\$?)([A-Za-z]+)(\$?)(\d+)/g, (m, d1, col, d2, rowStr) => {
    const p = parseAddr(`${col}${rowStr}`);
    if (!p) return m;
    if (kind === "row") {
      if (p.row < at) return m;
      const r = p.row + delta;
      if (r < 0) return "#REF!";
      return `${d1}${col}${d2}${r + 1}`;
    }
    if (p.col < at) return m;
    const c = p.col + delta;
    if (c < 0) return "#REF!";
    return `${d1}${colName(c)}${d2}${rowStr}`;
  });
}

function remapSheet(sheet: Sheet, kind: "row" | "col", at: number, delta: number): Sheet {
  const cells: Record<string, string> = {};
  for (const [key, raw] of Object.entries(sheet.cells)) {
    const p = parseAddr(key);
    if (!p) continue;
    let { row, col } = p;
    if (kind === "row") {
      if (delta < 0 && row >= at && row < at - delta) continue;
      if (row >= at) row += delta;
    } else {
      if (delta < 0 && col >= at && col < at - delta) continue;
      if (col >= at) col += delta;
    }
    cells[addr(row, col)] = shiftFormula(raw, kind, at, delta);
  }
  return {
    ...sheet,
    cells,
    rows: kind === "row" ? Math.max(5, sheet.rows + delta) : sheet.rows,
    cols: kind === "col" ? Math.max(3, sheet.cols + delta) : sheet.cols,
  };
}

function remapMeta(meta: SheetMeta, kind: "row" | "col", at: number, delta: number): SheetMeta {
  if (kind !== "row") return meta;
  const rowKind: SheetMeta["rowKind"] = {};
  const rowFmt: SheetMeta["rowFmt"] = {};
  const move = <T,>(src: Record<number, T>, dst: Record<number, T>) => {
    for (const [k, v] of Object.entries(src)) {
      let r = Number(k);
      if (delta < 0 && r >= at && r < at - delta) continue;
      if (r >= at) r += delta;
      dst[r] = v;
    }
  };
  move(meta.rowKind, rowKind);
  move(meta.rowFmt, rowFmt);
  return { ...meta, rowKind, rowFmt };
}

export function FinProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed?.sheets?.length) setState(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const patchSheet = useCallback(
    (id: string, fn: (s: Sheet) => Sheet, metaFn?: (m: SheetMeta) => SheetMeta) =>
      setState((p) => ({
        ...p,
        sheets: p.sheets.map((s) => (s.id === id ? fn(s) : s)),
        meta: metaFn && p.meta[id] ? { ...p.meta, [id]: metaFn(p.meta[id]!) } : p.meta,
      })),
    [],
  );

  const value = useMemo<Ctx>(() => {
    const sheet = state.sheets.find((s) => s.id === state.activeId) ?? state.sheets[0]!;
    return {
      sheets: state.sheets,
      meta: state.meta,
      sheet,
      activeId: sheet.id,
      snapshots: state.snapshots,
      values: computeWorkbook({ sheets: state.sheets }),
      setActive: (id) => setState((p) => ({ ...p, activeId: id })),
      setCell: (sheetId, a, raw) =>
        patchSheet(sheetId, (s) => {
          const cells = { ...s.cells };
          if (raw === "") delete cells[a];
          else cells[a] = raw;
          const p = parseAddr(a);
          return {
            ...s,
            cells,
            rows: p ? Math.max(s.rows, p.row + 1) : s.rows,
            cols: p ? Math.max(s.cols, p.col + 1) : s.cols,
          };
        }),
      clearRange: (sheetId, list) =>
        patchSheet(sheetId, (s) => {
          const cells = { ...s.cells };
          list.forEach((a) => delete cells[a]);
          return { ...s, cells };
        }),
      addRows: (sheetId, at, count = 1) =>
        patchSheet(
          sheetId,
          (s) => remapSheet(s, "row", at, count),
          (m) => remapMeta(m, "row", at, count),
        ),
      removeRow: (sheetId, at) =>
        patchSheet(
          sheetId,
          (s) => remapSheet(s, "row", at, -1),
          (m) => remapMeta(m, "row", at, -1),
        ),
      addCols: (sheetId, at, count = 1) =>
        patchSheet(sheetId, (s) => remapSheet(s, "col", at, count)),
      removeCol: (sheetId, at) => patchSheet(sheetId, (s) => remapSheet(s, "col", at, -1)),
      addSheet: (name) =>
        setState((p) => {
          const id = `folha-${Date.now()}`;
          const nm = name?.trim() || `Nova folha ${p.sheets.length + 1}`;
          const b = blankSheet(id, nm);
          return {
            ...p,
            sheets: [...p.sheets, b.sheet],
            meta: { ...p.meta, [id]: b.meta },
            activeId: id,
          };
        }),
      duplicateSheet: (id) =>
        setState((p) => {
          const src = p.sheets.find((s) => s.id === id);
          if (!src) return p;
          const newId = `folha-${Date.now()}`;
          const copy: Sheet = { ...clone(src), id: newId, name: `${src.name} (cópia)` };
          return {
            ...p,
            sheets: [...p.sheets, copy],
            meta: { ...p.meta, [newId]: clone(p.meta[id] ?? blankSheet(newId, "").meta) },
            activeId: newId,
          };
        }),
      renameSheet: (id, name) =>
        setState((p) => ({
          ...p,
          sheets: p.sheets.map((s) => (s.id === id ? { ...s, name } : s)),
        })),
      removeSheet: (id) =>
        setState((p) => {
          if (p.sheets.length <= 1) return p;
          const sheets = p.sheets.filter((s) => s.id !== id);
          return {
            ...p,
            sheets,
            activeId: p.activeId === id ? sheets[0]!.id : p.activeId,
          };
        }),
      resetAll: () => setState(initialState()),
      saveSnapshot: (name) =>
        setState((p) => ({
          ...p,
          snapshots: [
            ...p.snapshots.filter((s) => s.name !== name),
            { name, createdAt: Date.now(), sheets: clone(p.sheets), meta: clone(p.meta) },
          ],
        })),
      loadSnapshot: (name) =>
        setState((p) => {
          const snap = p.snapshots.find((s) => s.name === name);
          if (!snap) return p;
          return {
            ...p,
            sheets: clone(snap.sheets),
            meta: clone(snap.meta),
            activeId: snap.sheets[0]!.id,
          };
        }),
      deleteSnapshot: (name) =>
        setState((p) => ({ ...p, snapshots: p.snapshots.filter((s) => s.name !== name) })),
      setRowFmt: (sheetId, row, fmt) =>
        setState((p) => {
          const m = p.meta[sheetId] ?? { rowKind: {}, rowFmt: {}, labelCol: 0, headerRow: 2 };
          const rowFmt = { ...m.rowFmt };
          if (fmt) rowFmt[row] = fmt;
          else delete rowFmt[row];
          return { ...p, meta: { ...p.meta, [sheetId]: { ...m, rowFmt } } };
        }),
    };
  }, [state, patchSheet]);

  return <FinCtx.Provider value={value}>{children}</FinCtx.Provider>;
}

export function useFin() {
  const ctx = useContext(FinCtx);
  if (!ctx) throw new Error("useFin must be used inside FinProvider");
  return ctx;
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRightToLine,
  CheckCircle2,
  Eraser,
  Percent,
  Rows3,
  Columns3,
  Trash2,
  XCircle,
} from "lucide-react";
import { addr, colName, parseAddr } from "@/lib/finmodel/engine";
import { useFin } from "@/lib/finmodel/store";
import { formatValue, type Fmt } from "@/lib/finmodel/format";
import { issuesByAddr, validateSheet } from "@/lib/finmodel/validate";
import { Button } from "@/components/ui/button";

const FMTS: { key: Fmt | "auto"; label: string }[] = [
  { key: "auto", label: "Automático" },
  { key: "kz", label: "Kwanza" },
  { key: "pct", label: "Percentagem" },
  { key: "num", label: "Número" },
  { key: "dias", label: "Dias" },
];

const MIN_ROWS = 60;
const MIN_COLS = 20;

export function Grid() {
  const {
    sheet,
    meta,
    values,
    setCell,
    addRows,
    removeRow,
    addCols,
    removeCol,
    clearRange,
    setRowFmt,
  } = useFin();
  const m = meta[sheet.id];
  const [sel, setSel] = useState({ row: 3, col: 1 });
  const [anchor, setAnchor] = useState({ row: 3, col: 1 });
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = Math.max(sheet.rows + 6, MIN_ROWS);
  const cols = Math.max(sheet.cols + 2, MIN_COLS);
  const selAddr = addr(sel.row, sel.col);
  const raw = sheet.cells[selAddr] ?? "";

  const range = useMemo(
    () => ({
      r1: Math.min(anchor.row, sel.row),
      r2: Math.max(anchor.row, sel.row),
      c1: Math.min(anchor.col, sel.col),
      c2: Math.max(anchor.col, sel.col),
    }),
    [anchor, sel],
  );
  const rangeAddrs = useMemo(() => {
    const list: string[] = [];
    for (let r = range.r1; r <= range.r2; r++)
      for (let c = range.c1; c <= range.c2; c++) list.push(addr(r, c));
    return list;
  }, [range]);
  const inRange = (r: number, c: number) =>
    r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const rowFmt = useMemo(() => m?.rowFmt ?? {}, [m]);
  const rowKind = m?.rowKind ?? {};

  const issues = useMemo(() => validateSheet(sheet, m, values), [sheet, m, values]);
  const issueMap = useMemo(() => issuesByAddr(issues), [issues]);
  const errorCount = issues.filter((i) => i.level === "error").length;
  const warnCount = issues.length - errorCount;
  const [showIssues, setShowIssues] = useState(true);

  const goTo = (a: string) => {
    const p = parseAddr(a);
    if (!p) return;
    setSel(p);
    setAnchor(p);
    wrapRef.current?.focus();
  };

  const numeric = rangeAddrs
    .map((a) => values.get(`${sheet.id}!${a}`)?.value)
    .filter((v): v is number => typeof v === "number");
  const stats =
    numeric.length > 0
      ? {
          sum: numeric.reduce((a, b) => a + b, 0),
          avg: numeric.reduce((a, b) => a + b, 0) / numeric.length,
          count: numeric.length,
        }
      : null;

  const select = (row: number, col: number, extend = false) => {
    setSel({ row, col });
    if (!extend) setAnchor({ row, col });
  };

  const commit = (next?: { row: number; col: number }) => {
    setCell(sheet.id, selAddr, draft.trim());
    setEditing(false);
    if (next) select(next.row, next.col);
    wrapRef.current?.focus();
  };

  const startEdit = (initial?: string) => {
    setDraft(initial ?? raw);
    setEditing(true);
  };

  const copyRange = () => {
    const lines: string[] = [];
    for (let r = range.r1; r <= range.r2; r++) {
      const cells: string[] = [];
      for (let c = range.c1; c <= range.c2; c++) {
        const a = addr(r, c);
        const cr = sheet.cells[a] ?? "";
        cells.push(cr.startsWith("=") ? String(values.get(`${sheet.id}!${a}`)?.value ?? "") : cr);
      }
      lines.push(cells.join("\t"));
    }
    void navigator.clipboard?.writeText(lines.join("\n"));
  };

  const pasteAt = (text: string) => {
    text
      .replace(/\r/g, "")
      .split("\n")
      .forEach((line, dr) => {
        line.split("\t").forEach((cell, dc) => {
          setCell(sheet.id, addr(sel.row + dr, sel.col + dc), cell.trim());
        });
      });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    const move = (dr: number, dc: number) => {
      e.preventDefault();
      const row = Math.min(rows - 1, Math.max(0, sel.row + dr));
      const col = Math.min(cols - 1, Math.max(0, sel.col + dc));
      select(row, col, e.shiftKey);
    };
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "c") {
      e.preventDefault();
      return copyRange();
    }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "v") return; // handled by onPaste
    if (k === "ArrowDown") return move(1, 0);
    if (k === "ArrowUp") return move(-1, 0);
    if (k === "ArrowRight" || k === "Tab") return move(0, 1);
    if (k === "ArrowLeft") return move(0, -1);
    if (k === "Home") return move(0, -sel.col);
    if (k === "PageDown") return move(10, 0);
    if (k === "PageUp") return move(-10, 0);
    if (k === "Enter" || k === "F2") {
      e.preventDefault();
      return startEdit();
    }
    if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      return clearRange(sheet.id, rangeAddrs);
    }
    if (k.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startEdit(k);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => addRows(sheet.id, sel.row + 1)}>
          <Rows3 className="size-4" /> Linha
        </Button>
        <Button variant="outline" size="sm" onClick={() => addCols(sheet.id, sel.col + 1)}>
          <Columns3 className="size-4" /> Coluna
        </Button>
        <Button variant="outline" size="sm" onClick={() => removeRow(sheet.id, sel.row)}>
          <Trash2 className="size-4" /> Eliminar linha
        </Button>
        <Button variant="outline" size="sm" onClick={() => removeCol(sheet.id, sel.col)}>
          <Trash2 className="size-4" /> Eliminar coluna
        </Button>
        <Button variant="outline" size="sm" onClick={() => clearRange(sheet.id, rangeAddrs)}>
          <Eraser className="size-4" /> Limpar
        </Button>
        <div className="flex items-center gap-1 text-sm">
          <Percent className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={(rowFmt[sel.row] as string) ?? "auto"}
            onChange={(e) =>
              setRowFmt(sheet.id, sel.row, e.target.value === "auto" ? null : (e.target.value as Fmt))
            }
          >
            {FMTS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* formula bar */}
      <div className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 print:hidden">
        <span className="w-24 shrink-0 rounded bg-muted px-2 py-1 text-center font-mono text-xs">
          {range.r1 === range.r2 && range.c1 === range.c2
            ? selAddr
            : `${addr(range.r1, range.c1)}:${addr(range.r2, range.c2)}`}
        </span>
        <span className="text-muted-foreground">ƒx</span>
        <input
          className="h-8 w-full bg-transparent font-mono text-sm outline-none"
          value={editing ? draft : raw}
          placeholder="Escreva um valor ou uma fórmula, ex.: =SUM(B5:M5)"
          onChange={(e) => {
            if (!editing) setEditing(true);
            setDraft(e.target.value);
          }}
          onFocus={() => {
            setDraft(raw);
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit({ row: Math.min(rows - 1, sel.row + 1), col: sel.col });
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </div>

      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          if (editing) return;
          const text = e.clipboardData.getData("text/plain");
          if (text) {
            e.preventDefault();
            pasteAt(text);
          }
        }}
        className="grid-wrap max-h-[70vh] overflow-auto rounded-lg border outline-none"
      >
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="corner" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className={c >= range.c1 && c <= range.c2 ? "col-head col-head-active" : "col-head"}
                  onClick={() => {
                    setAnchor({ row: 0, col: c });
                    setSel({ row: rows - 1, col: c });
                  }}
                >
                  {colName(c)}
                </th>
              ))}
              <th className="col-head">
                <button title="Adicionar coluna" onClick={() => addCols(sheet.id, cols)}>
                  <ArrowRightToLine className="size-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} className={rowKind[r] ? `sheet-row-${rowKind[r]}` : undefined}>
                <th
                  className={r >= range.r1 && r <= range.r2 ? "row-head row-head-active" : "row-head"}
                  onClick={() => {
                    setAnchor({ row: r, col: 0 });
                    setSel({ row: r, col: cols - 1 });
                  }}
                >
                  {r + 1}
                </th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addr(r, c);
                  const cellRaw = sheet.cells[a] ?? "";
                  const computed = values.get(`${sheet.id}!${a}`);
                  const isSel = sel.row === r && sel.col === c;
                  const isFormula = cellRaw.startsWith("=");
                  const issue = issueMap.get(a);
                  const text = computed
                    ? computed.error
                      ? computed.error
                      : formatValue(computed.value, rowFmt[r])
                    : "";
                  return (
                    <td
                      key={c}
                      data-addr={a}
                      title={issue?.message}
                      className={[
                        "sheet-cell",
                        isSel ? "sheet-cell-sel" : "",
                        !isSel && inRange(r, c) ? "sheet-cell-range" : "",
                        c === 0 ? "sheet-cell-label" : "",
                        isFormula ? "sheet-cell-calc" : "",
                        computed?.error ? "sheet-cell-err" : "",
                        issue?.level === "error" ? "sheet-cell-invalid" : "",
                        issue?.level === "warn" ? "sheet-cell-warned" : "",
                        typeof computed?.value === "number" ? "text-right tabular-nums" : "",
                      ].join(" ")}
                      onMouseDown={() => {
                        setEditing(false);
                        setDragging(true);
                        select(r, c);
                      }}
                      onMouseEnter={() => {
                        if (dragging) setSel({ row: r, col: c });
                      }}
                      onDoubleClick={() => {
                        select(r, c);
                        setDraft(cellRaw);
                        setEditing(true);
                      }}
                    >
                      {isSel && editing ? (
                        <input
                          ref={inputRef}
                          className="cell-input"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commit()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commit({ row: Math.min(rows - 1, r + 1), col: c });
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              commit({ row: r, col: Math.min(cols - 1, c + 1) });
                            } else if (e.key === "Escape") {
                              setEditing(false);
                              wrapRef.current?.focus();
                            }
                          }}
                        />
                      ) : (
                        text
                      )}
                    </td>
                  );
                })}
                <td className="sheet-cell sheet-cell-pad" />
              </tr>
            ))}
            <tr>
              <th className="row-head">
                <button title="Adicionar linha" onClick={() => addRows(sheet.id, rows)}>
                  <ArrowDownToLine className="size-3" />
                </button>
              </th>
              <td className="sheet-cell sheet-cell-pad" colSpan={cols + 1} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* status bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground print:hidden">
        <span>Células: {rangeAddrs.length}</span>
        {stats && (
          <>
            <span>Soma: {formatValue(stats.sum, rowFmt[sel.row])}</span>
            <span>Média: {formatValue(stats.avg, rowFmt[sel.row])}</span>
            <span>Nº: {stats.count}</span>
          </>
        )}
        <span className="ml-auto">Ctrl+C / Ctrl+V · Shift+setas para selecionar</span>
      </div>

      <p className="text-xs text-muted-foreground print:hidden">
        Funções suportadas: SUM/SOMA, AVERAGE/MÉDIA, MIN, MAX, COUNT, ABS, ROUND, IF/SE, IFERROR,
        SUMPRODUCT, NPV/VAL, IRR/TIR, PMT, POWER, SQRT. Use <code>&apos;Folha&apos;!B4</code> para
        referenciar outra folha.
      </p>
    </div>
  );
}

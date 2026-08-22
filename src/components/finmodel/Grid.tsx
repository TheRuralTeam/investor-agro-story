import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRightToLine,
  Eraser,
  Percent,
  Rows3,
  Columns3,
  Trash2,
} from "lucide-react";
import { addr, colName } from "@/lib/finmodel/engine";
import { useFin } from "@/lib/finmodel/store";
import { formatValue, type Fmt } from "@/lib/finmodel/format";
import { Button } from "@/components/ui/button";

const FMTS: { key: Fmt | "auto"; label: string }[] = [
  { key: "auto", label: "Automático" },
  { key: "kz", label: "Kwanza" },
  { key: "pct", label: "Percentagem" },
  { key: "num", label: "Número" },
  { key: "dias", label: "Dias" },
];

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = Math.max(sheet.rows, 24);
  const cols = Math.max(sheet.cols, 8);
  const selAddr = addr(sel.row, sel.col);
  const raw = sheet.cells[selAddr] ?? "";

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const rowFmt = useMemo(() => m?.rowFmt ?? {}, [m]);
  const rowKind = m?.rowKind ?? {};

  const commit = (next?: { row: number; col: number }) => {
    setCell(sheet.id, selAddr, draft.trim());
    setEditing(false);
    if (next) setSel(next);
    wrapRef.current?.focus();
  };

  const startEdit = (initial?: string) => {
    setDraft(initial ?? raw);
    setEditing(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    const move = (dr: number, dc: number) => {
      e.preventDefault();
      setSel((s) => ({
        row: Math.min(rows - 1, Math.max(0, s.row + dr)),
        col: Math.min(cols - 1, Math.max(0, s.col + dc)),
      }));
    };
    if (e.key === "ArrowDown") return move(1, 0);
    if (e.key === "ArrowUp") return move(-1, 0);
    if (e.key === "ArrowRight" || e.key === "Tab") return move(0, 1);
    if (e.key === "ArrowLeft") return move(0, -1);
    if (e.key === "Enter") {
      e.preventDefault();
      return startEdit();
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      return clearRange(sheet.id, [selAddr]);
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      startEdit(e.key);
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
        <Button variant="outline" size="sm" onClick={() => clearRange(sheet.id, [selAddr])}>
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
        <span className="w-16 shrink-0 rounded bg-muted px-2 py-1 text-center font-mono text-xs">
          {selAddr}
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
        className="grid-wrap max-h-[70vh] overflow-auto rounded-lg border outline-none"
      >
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="corner" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className={c === sel.col ? "col-head col-head-active" : "col-head"}
                  onClick={() => setSel((s) => ({ ...s, col: c }))}
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
                  className={r === sel.row ? "row-head row-head-active" : "row-head"}
                  onClick={() => setSel((s) => ({ ...s, row: r }))}
                >
                  {r + 1}
                </th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addr(r, c);
                  const cellRaw = sheet.cells[a] ?? "";
                  const computed = values.get(`${sheet.id}!${a}`);
                  const isSel = sel.row === r && sel.col === c;
                  const isFormula = cellRaw.startsWith("=");
                  const text = computed
                    ? computed.error
                      ? computed.error
                      : formatValue(computed.value, rowFmt[r])
                    : "";
                  return (
                    <td
                      key={c}
                      className={[
                        "sheet-cell",
                        isSel ? "sheet-cell-sel" : "",
                        c === 0 ? "sheet-cell-label" : "",
                        isFormula ? "sheet-cell-calc" : "",
                        computed?.error ? "sheet-cell-err" : "",
                        typeof computed?.value === "number" ? "text-right tabular-nums" : "",
                      ].join(" ")}
                      onClick={() => {
                        setEditing(false);
                        setSel({ row: r, col: c });
                      }}
                      onDoubleClick={() => {
                        setSel({ row: r, col: c });
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
      <p className="text-xs text-muted-foreground print:hidden">
        Funções suportadas: SUM/SOMA, AVERAGE/MÉDIA, MIN, MAX, COUNT, ABS, ROUND, IF/SE, IFERROR,
        SUMPRODUCT, NPV/VAL, IRR/TIR, PMT, POWER, SQRT. Use <code>&apos;Folha&apos;!B4</code> para
        referenciar outra folha.
      </p>
    </div>
  );
}

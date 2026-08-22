import * as XLSX from "xlsx";
import { computeWorkbook, parseAddr, type Sheet } from "./engine";

/** Export every sheet, keeping formulas and computed values. */
export function exportWorkbookToXlsx(sheets: Sheet[], filename = "AgriLink-Modelo-Financeiro") {
  const values = computeWorkbook({ sheets });
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const ws: XLSX.WorkSheet = {};
    let maxR = 0;
    let maxC = 0;
    for (const [a, raw] of Object.entries(sheet.cells)) {
      const p = parseAddr(a);
      if (!p || raw === "") continue;
      maxR = Math.max(maxR, p.row);
      maxC = Math.max(maxC, p.col);
      const computed = values.get(`${sheet.id}!${a}`)?.value;
      const cell: XLSX.CellObject =
        typeof computed === "number" && Number.isFinite(computed)
          ? { t: "n", v: computed }
          : { t: "s", v: String(computed ?? raw) };
      if (raw.startsWith("=")) cell.f = raw.slice(1);
      ws[a] = cell;
    }
    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    ws["!cols"] = Array.from({ length: maxC + 1 }, (_, c) => ({ wch: c === 0 ? 42 : 16 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31) || "Folha");
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPdf() {
  window.print();
}

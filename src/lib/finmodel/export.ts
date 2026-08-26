import ExcelJS from "exceljs";
import { computeWorkbook, parseAddr, type Sheet } from "./engine";
import logo from "@/assets/agrilink-logo.png.asset.json";

/** Rows reserved at the top of every sheet for the AgriLink logo + title. */
const HEADER_ROWS = 5;

export async function fetchLogoBuffer(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(logo.url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/** Shift row numbers in A1-style references so formulas survive the header offset. */
function shiftFormula(formula: string, offset: number): string {
  return formula.replace(
    /(\$?)([A-Z]{1,3})(\$?)(\d+)/g,
    (_m, d1: string, col: string, d2: string, row: string) =>
      `${d1}${col}${d2}${Number(row) + offset}`,
  );
}

export function addBranding(ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook, logoId?: number) {
  if (logoId !== undefined) {
    ws.addImage(logoId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 150, height: 48 } });
  }
  ws.getRow(1).height = 42;
  const title = ws.getCell("C2");
  title.value = "AgriLink — Plano Financeiro";
  title.font = { bold: true, size: 14, color: { argb: "FF1A4D2E" } };
  const sub = ws.getCell("C3");
  sub.value = `Do campo a Luanda, pago na hora · gerado em ${new Date().toLocaleDateString("pt-PT")}`;
  sub.font = { size: 9, color: { argb: "FF6B7280" } };
  void wb;
}

/** Export every sheet, keeping formulas and computed values, branded with the logo. */
export async function exportWorkbookToXlsx(
  sheets: Sheet[],
  filename = "AgriLink-Modelo-Financeiro",
) {
  const values = computeWorkbook({ sheets });
  const wb = new ExcelJS.Workbook();
  wb.creator = "AgriLink";
  wb.created = new Date();

  const buf = await fetchLogoBuffer();
  const logoId = buf ? wb.addImage({ buffer: buf as ExcelJS.Buffer, extension: "png" }) : undefined;

  sheets.forEach((sheet) => {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31) || "Folha");
    addBranding(ws, wb, logoId);

    let maxC = 0;
    for (const [a, raw] of Object.entries(sheet.cells)) {
      const p = parseAddr(a);
      if (!p || raw === "") continue;
      maxC = Math.max(maxC, p.col);
      const cell = ws.getCell(p.row + 1 + HEADER_ROWS, p.col + 1);
      const computed = values.get(`${sheet.id}!${a}`)?.value;
      if (raw.startsWith("=")) {
        const fv: ExcelJS.CellFormulaValue = {
          formula: shiftFormula(raw.slice(1), HEADER_ROWS),
          date1904: false,
        };
        if (typeof computed === "number" && Number.isFinite(computed)) fv.result = computed;
        cell.value = fv;

      } else if (typeof computed === "number" && Number.isFinite(computed)) {
        cell.value = computed;
      } else {
        cell.value = String(computed ?? raw);
      }
    }

    ws.columns = Array.from({ length: Math.max(maxC + 1, 3) }, (_, c) => ({
      width: c === 0 ? 42 : 16,
    })) as Partial<ExcelJS.Column>[];
    ws.views = [{ state: "frozen", ySplit: HEADER_ROWS, xSplit: 1 }];
  });

  const out = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`,
  );
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf() {
  window.print();
}

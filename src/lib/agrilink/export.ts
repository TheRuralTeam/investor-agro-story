import ExcelJS from "exceljs";
import type { MonthRow } from "./model";
import { addBranding, downloadBlob, fetchLogoBuffer } from "@/lib/finmodel/export";

export async function exportPlanToXlsx(plan: MonthRow[], scenario: string) {
  const header = ["Rubrica (Kz)", ...plan.map((r) => r.mes), "Ano 1"];
  const lines: [string, keyof MonthRow][] = [
    ["Caixas transacionadas", "caixas"],
    ["Volume transacionado (GMV)", "gmv"],
    ["Receita — venda formal", "recVenda"],
    ["Receita — corredor/transporte", "recTransporte"],
    ["Receita — pagamento digital", "recMobile"],
    ["Receita total", "receitaTotal"],
    ["Custo — motoristas", "custoMotoristas"],
    ["Custo — operadoras móveis", "custoOperadoras"],
    ["Custo — pontos de agregação", "custoPontos"],
    ["Custo — equipa financeira", "custoEquipa"],
    ["Custos totais", "custoTotal"],
    ["Margem", "margem"],
    ["Fluxo de caixa acumulado", "caixaAcumulado"],
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "AgriLink";
  const buf = await fetchLogoBuffer();
  const logoId = buf ? wb.addImage({ buffer: buf as ExcelJS.Buffer, extension: "png" }) : undefined;

  const ws = wb.addWorksheet("Plano Financeiro");
  addBranding(ws, wb, logoId);
  ws.getCell("C4").value = `Cenário: ${scenario}`;
  ws.getCell("C4").font = { bold: true, size: 10 };

  const headRow = ws.addRow([]);
  ws.spliceRows(6, 1, header);
  ws.getRow(6).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(6).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A4D2E" } };
  });
  void headRow;

  lines.forEach(([label, key]) => {
    const values = plan.map((r) => Math.round(Number(r[key])));
    const total =
      key === "caixaAcumulado"
        ? (values[values.length - 1] ?? 0)
        : values.reduce((a, b) => a + b, 0);
    ws.addRow([label, ...values, total]);
  });

  ws.columns = [{ width: 30 }, ...plan.map(() => ({ width: 14 })), { width: 16 }];
  ws.views = [{ state: "frozen", ySplit: 6, xSplit: 1 }];

  const out = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `agrilink-plano-financeiro-${scenario}.xlsx`,
  );
}

export function exportToPdf() {
  window.print();
}

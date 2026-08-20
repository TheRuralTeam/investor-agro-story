import * as XLSX from "xlsx";
import type { MonthRow } from "./model";

export function exportPlanToXlsx(plan: MonthRow[], scenario: string) {
  const header = [
    "Rubrica (Kz)",
    ...plan.map((r) => r.mes),
    "Ano 1",
  ];
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

  const body = lines.map(([label, key]) => {
    const values = plan.map((r) => Math.round(Number(r[key])));
    const total =
      key === "caixaAcumulado"
        ? values[values.length - 1]
        : values.reduce((a, b) => a + b, 0);
    return [label, ...values, total];
  });

  const ws = XLSX.utils.aoa_to_sheet([
    [`AgriLink — Plano Financeiro (cenário ${scenario})`],
    [],
    header,
    ...body,
  ]);
  ws["!cols"] = [{ wch: 30 }, ...plan.map(() => ({ wch: 14 })), { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plano Financeiro");
  XLSX.writeFile(wb, `agrilink-plano-financeiro-${scenario}.xlsx`);
}

export function exportToPdf() {
  window.print();
}

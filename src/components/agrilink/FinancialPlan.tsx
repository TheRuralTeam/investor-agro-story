import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, LineChart, Table2 } from "lucide-react";
import { useAgri } from "@/lib/agrilink/store";
import { kzShort, num, pct } from "@/lib/agrilink/format";
import { Button } from "@/components/ui/button";
import { exportPlanToXlsx } from "@/lib/agrilink/export";

const LINES = [
  { key: "recVenda", label: "Receita — venda formal", group: "receita" },
  { key: "recTransporte", label: "Receita — corredor/transporte", group: "receita" },
  { key: "recMobile", label: "Receita — pagamento digital", group: "receita" },
  { key: "receitaTotal", label: "Receita total", group: "total" },
  { key: "custoMotoristas", label: "Custo — motoristas", group: "custo" },
  { key: "custoOperadoras", label: "Custo — operadoras móveis", group: "custo" },
  { key: "custoPontos", label: "Custo — pontos de agregação", group: "custo" },
  { key: "custoEquipa", label: "Custo — equipa financeira", group: "custo" },
  { key: "custoTotal", label: "Custos totais", group: "total" },
  { key: "margem", label: "Margem", group: "margem" },
  { key: "caixaAcumulado", label: "Fluxo de caixa acumulado", group: "margem" },
] as const;

export function FinancialPlan() {
  const { plan, scenario, presenting } = useAgri();
  const [view, setView] = useState<"tabela" | "grafico">("tabela");

  const totals = plan.reduce(
    (acc, r) => {
      LINES.forEach((l) => {
        if (l.key !== "caixaAcumulado") acc[l.key] = (acc[l.key] ?? 0) + r[l.key];
      });
      return acc;
    },
    {} as Record<string, number>,
  );
  totals.caixaAcumulado = plan[plan.length - 1].caixaAcumulado;

  return (
    <section id="plano" className="section">
      <header className="section-head flex-row flex-wrap items-end justify-between gap-4 md:flex">
        <div>
          <p className="kicker">Plano financeiro</p>
          <h2 className="section-title">Projeção a 12 meses — cenário {scenario}</h2>
          <p className="section-lead">
            Valores recalculados automaticamente a partir dos inputs das secções anteriores.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <div className="segmented">
            <button
              className={view === "tabela" ? "segmented-active" : ""}
              onClick={() => setView("tabela")}
            >
              <Table2 className="size-4" /> Tabela
            </button>
            <button
              className={view === "grafico" ? "segmented-active" : ""}
              onClick={() => setView("grafico")}
            >
              <LineChart className="size-4" /> Gráfico
            </button>
          </div>
          {!presenting && (
            <Button variant="outline" size="sm" onClick={() => exportPlanToXlsx(plan, scenario)}>
              <Download className="size-4" /> Excel
            </Button>
          )}
        </div>
      </header>

      {view === "tabela" ? (
        <div className="grid-wrap">
          <table className="fin-grid">
            <thead>
              <tr>
                <th className="sticky-col">Rubrica (Kz)</th>
                {plan.map((r) => (
                  <th key={r.mes}>{r.mes}</th>
                ))}
                <th className="col-total">Ano 1</th>
              </tr>
            </thead>
            <tbody>
              <tr className="row-meta">
                <td className="sticky-col">Caixas transacionadas</td>
                {plan.map((r) => (
                  <td key={r.mes}>{num(r.caixas)}</td>
                ))}
                <td className="col-total">{num(plan.reduce((a, r) => a + r.caixas, 0))}</td>
              </tr>
              {LINES.map((l) => (
                <tr key={l.key} className={`row-${l.group}`}>
                  <td className="sticky-col">{l.label}</td>
                  {plan.map((r) => (
                    <td key={r.mes}>{kzShort(r[l.key])}</td>
                  ))}
                  <td className="col-total">{kzShort(totals[l.key])}</td>
                </tr>
              ))}
              <tr className="row-margem">
                <td className="sticky-col">Margem %</td>
                {plan.map((r) => (
                  <td key={r.mes}>{pct(r.margemPct)}</td>
                ))}
                <td className="col-total">
                  {pct(totals.receitaTotal ? (totals.margem / totals.receitaTotal) * 100 : 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={plan} margin={{ left: 8, right: 8, top: 12 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => kzShort(v)} width={100} />
                <Tooltip formatter={(v: number) => kzShort(v)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="receitaTotal"
                  name="Receita"
                  stroke="var(--color-chart-1)"
                  fill="url(#gRec)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="custoTotal"
                  name="Custos"
                  stroke="var(--color-chart-4)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="margem"
                  name="Margem"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="caixaAcumulado"
                  name="Caixa acumulado"
                  stroke="var(--color-chart-3)"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}

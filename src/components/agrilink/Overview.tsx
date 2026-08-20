import { Boxes, Coins, TrendingUp, Users } from "lucide-react";
import { useAgri } from "@/lib/agrilink/store";
import { kzShort, num, pct } from "@/lib/agrilink/format";
import { EditableNumber } from "./EditableNumber";
import type { Inputs } from "@/lib/agrilink/model";

const kpis: {
  field: keyof Inputs;
  label: string;
  icon: typeof Users;
  suffix?: string;
  hint: (v: number) => string;
}[] = [
  {
    field: "produtores",
    label: "Produtores na rede",
    icon: Users,
    hint: () => "Fazendas registadas no corredor Norte–Luanda",
  },
  {
    field: "caixasMes",
    label: "Caixas por mês",
    icon: Boxes,
    hint: () => "Volume mensal agregado nos pontos de recolha",
  },
  {
    field: "precoMedioCaixa",
    label: "Preço médio / caixa",
    icon: Coins,
    suffix: "Kz",
    hint: () => "Valor médio pago pelo comprador",
  },
  {
    field: "crescimentoMensalPct",
    label: "Crescimento m/m",
    icon: TrendingUp,
    suffix: "%",
    hint: () => "Taxa aplicada à projeção de 12 meses",
  },
];

export function Overview() {
  const { metrics, plan, inputs } = useAgri();
  const ano = plan.reduce((a, r) => a + r.receitaTotal, 0);

  return (
    <section id="overview" className="section">
      <header className="section-head">
        <p className="kicker">Visão geral</p>
        <h2 className="section-title">O marketplace agrícola que liga o campo a Luanda</h2>
        <p className="section-lead">
          A AgriLink agrega a produção, garante o transporte até Luanda e liquida cada venda em
          mobile money. Ajuste os indicadores abaixo para simular cenários em tempo real.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.field} className="card-kpi">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {k.label}
              </span>
              <k.icon className="size-4 text-primary" />
            </div>
            <EditableNumber field={k.field} {...(k.suffix ? { suffix: k.suffix } : {})} className="kpi-value" />
            <p className="text-xs text-muted-foreground">{k.hint(0)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card-stat">
          <span className="stat-label">Volume transacionado (GMV) / mês</span>
          <span className="stat-value">{kzShort(metrics.gmv)}</span>
        </div>
        <div className="card-stat">
          <span className="stat-label">Receita AgriLink / mês</span>
          <span className="stat-value">{kzShort(metrics.receitaTotal)}</span>
        </div>
        <div className="card-stat">
          <span className="stat-label">Margem operacional</span>
          <span className="stat-value">
            {pct(metrics.receitaTotal ? (metrics.margem / metrics.receitaTotal) * 100 : 0)}
          </span>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Projeção a 12 meses: <strong className="text-foreground">{kzShort(ano)}</strong> de receita
        acumulada com {num(inputs.produtores)} produtores e crescimento de{" "}
        {pct(inputs.crescimentoMensalPct)} ao mês.
      </p>
    </section>
  );
}

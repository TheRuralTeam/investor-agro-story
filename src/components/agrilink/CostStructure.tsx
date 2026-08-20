import { Building2, Signal, Truck, Users2 } from "lucide-react";
import { useAgri } from "@/lib/agrilink/store";
import { kzShort, pct } from "@/lib/agrilink/format";
import { EditableNumber } from "./EditableNumber";
import type { Inputs } from "@/lib/agrilink/model";

export function CostStructure() {
  const { metrics } = useAgri();

  const cards: {
    icon: typeof Truck;
    title: string;
    desc: string;
    fields: { field: keyof Inputs; suffix: string; label: string }[];
    value: number;
  }[] = [
    {
      icon: Truck,
      title: "Comissões a motoristas",
      desc: "Frete pago por caixa transportada no corredor até Luanda.",
      fields: [{ field: "custoMotoristaPorCaixa", suffix: "Kz/caixa", label: "Frete" }],
      value: metrics.custoMotoristas,
    },
    {
      icon: Signal,
      title: "Operadoras de mobile money",
      desc: "Custo por transação Unitel Money / Afrimoney / EMIS.",
      fields: [{ field: "custoOperadoraPct", suffix: "% do volume digital", label: "Taxa" }],
      value: metrics.custoOperadoras,
    },
    {
      icon: Building2,
      title: "Pontos de agregação",
      desc: "Operação de Mangueirinhas, Estalagem e Congoleses.",
      fields: [
        { field: "custoPontoMangueirinhas", suffix: "Kz/mês", label: "Mangueirinhas" },
        { field: "custoPontoEstalagem", suffix: "Kz/mês", label: "Estalagem" },
        { field: "custoPontoCongoleses", suffix: "Kz/mês", label: "Congoleses" },
      ],
      value: metrics.custoPontos,
    },
    {
      icon: Users2,
      title: "Equipa financeira dedicada",
      desc: "Reconciliação de pagamentos, tesouraria e apoio ao produtor.",
      fields: [{ field: "custoEquipaFinanceira", suffix: "Kz/mês", label: "Custo mensal" }],
      value: metrics.custoEquipa,
    },
  ];

  const total = metrics.custoTotal || 1;

  return (
    <section id="custos" className="section">
      <header className="section-head">
        <p className="kicker">Estrutura de custos</p>
        <h2 className="section-title">Onde a AgriLink gasta por cada Kwanza que move</h2>
        <p className="section-lead">
          Custos mensais de {kzShort(metrics.custoTotal)} para uma receita de{" "}
          {kzShort(metrics.receitaTotal)}.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <article key={c.title} className="card">
            <span className="icon-chip">
              <c.icon className="size-5" />
            </span>
            <h3 className="mt-3 font-semibold leading-tight">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              {c.fields.map((f) => (
                <div key={f.field} className="row-line">
                  <dt>{f.label}</dt>
                  <dd>
                    <EditableNumber field={f.field} suffix={f.suffix} step={0.1} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-lg bg-secondary p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Custo mensal</p>
              <p className="text-xl font-semibold tabular-nums">{kzShort(c.value)}</p>
              <p className="text-xs text-muted-foreground">{pct((c.value / total) * 100)} do total</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

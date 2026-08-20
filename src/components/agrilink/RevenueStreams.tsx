import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileSignature, Smartphone, Truck } from "lucide-react";
import { useAgri } from "@/lib/agrilink/store";
import { kzShort, pct } from "@/lib/agrilink/format";
import { EditableNumber } from "./EditableNumber";
import type { Inputs } from "@/lib/agrilink/model";

export function RevenueStreams() {
  const { metrics } = useAgri();

  const streams: {
    key: string;
    icon: typeof Truck;
    title: string;
    desc: string;
    rate: { field: keyof Inputs; suffix: string; label: string };
    volume: { field: keyof Inputs; suffix: string; label: string };
    value: number;
    color: string;
  }[] = [
    {
      key: "venda",
      icon: FileSignature,
      title: "Comissão sobre venda formal",
      desc: "Contratos com compradores formais e contratos futuros de colheita.",
      rate: { field: "comissaoVendaPct", suffix: "%", label: "Comissão" },
      volume: { field: "pctVolumeFormal", suffix: "% do GMV", label: "Volume formal" },
      value: metrics.recVenda,
      color: "var(--color-chart-1)",
    },
    {
      key: "transporte",
      icon: Truck,
      title: "Comissão fixa por caixa (corredor)",
      desc: "Taxa fixa por caixa transportada no corredor até Luanda.",
      rate: { field: "comissaoPorCaixa", suffix: "Kz/caixa", label: "Comissão" },
      volume: { field: "pctCaixasTransportadas", suffix: "% das caixas", label: "Cobertura" },
      value: metrics.recTransporte,
      color: "var(--color-chart-2)",
    },
    {
      key: "mobile",
      icon: Smartphone,
      title: "Comissão sobre pagamento digital",
      desc: "Percentagem sobre o volume liquidado via Unitel Money, Afrimoney e EMIS.",
      rate: { field: "comissaoMobilePct", suffix: "%", label: "Comissão" },
      volume: { field: "pctVolumeMobile", suffix: "% do GMV", label: "Volume digital" },
      value: metrics.recMobile,
      color: "var(--color-chart-3)",
    },
  ];

  const total = metrics.receitaTotal || 1;
  const data = streams.map((s) => ({ name: s.title, value: s.value, color: s.color }));

  return (
    <section id="receita" className="section">
      <header className="section-head">
        <p className="kicker">Fluxo de receita</p>
        <h2 className="section-title">Três fontes de receita, um só corredor</h2>
        <p className="section-lead">
          Cada transação da plataforma gera receita em três pontos distintos da cadeia.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {streams.map((s) => (
          <article key={s.key} className="card">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <s.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-semibold leading-tight">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="row-line">
                <dt>{s.rate.label}</dt>
                <dd>
                  <EditableNumber field={s.rate.field} suffix={s.rate.suffix} step={0.5} />
                </dd>
              </div>
              <div className="row-line">
                <dt>{s.volume.label}</dt>
                <dd>
                  <EditableNumber field={s.volume.field} suffix={s.volume.suffix} />
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-lg bg-secondary p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Receita mensal
              </p>
              <p className="text-2xl font-semibold text-primary tabular-nums">
                {kzShort(s.value)}
              </p>
              <p className="text-xs text-muted-foreground">
                {pct((s.value / total) * 100)} do total
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="chart-title">Receita mensal por fonte</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 8, right: 8, top: 12 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.split(" ")[0] ?? v} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => kzShort(v)} width={90} />
                <Tooltip formatter={(v: number) => kzShort(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="chart-title">Peso de cada fonte</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => kzShort(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

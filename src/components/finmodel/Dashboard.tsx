import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, X } from "lucide-react";
import { addr, colName } from "@/lib/finmodel/engine";
import { useFin } from "@/lib/finmodel/store";
import { formatValue, kzShort } from "@/lib/finmodel/format";
import { Button } from "@/components/ui/button";

const PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

interface Series {
  sheetId: string;
  row: number;
}

export function FinDashboard() {
  const { sheets, meta, values, sheet } = useFin();
  const [kpis, setKpis] = useState<{ sheetId: string; a: string }[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [chart, setChart] = useState<"linha" | "barras" | "pizza">("linha");
  const [pickSheet, setPickSheet] = useState(sheet.id);

  const target = sheets.find((s) => s.id === pickSheet) ?? sheet;
  const tMeta = meta[target.id];
  const headerRow = tMeta?.headerRow ?? 2;

  const labelRows = useMemo(
    () =>
      Array.from({ length: Math.max(target.rows, 24) }, (_, r) => r)
        .map((r) => ({ r, label: target.cells[`A${r + 1}`] ?? "" }))
        .filter((x) => x.label.trim() !== "" && x.r !== headerRow),
    [target, headerRow],
  );

  const periodCols = useMemo(() => {
    const out: { col: number; label: string }[] = [];
    for (let c = 1; c < Math.max(target.cols, 8); c++) {
      const label = target.cells[`${colName(c)}${headerRow + 1}`];
      if (label && label.trim() !== "") out.push({ col: c, label });
    }
    return out;
  }, [target, headerRow]);

  const num = (sheetId: string, a: string) => {
    const v = values.get(`${sheetId}!${a}`)?.value;
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };

  const chartData = useMemo(
    () =>
      periodCols.map((p) => {
        const row: Record<string, string | number> = { periodo: p.label };
        series.forEach((s) => {
          const sh = sheets.find((x) => x.id === s.sheetId);
          if (!sh) return;
          const name = sh.cells[`A${s.row + 1}`] ?? addr(s.row, 0);
          row[name] = num(s.sheetId, addr(s.row, p.col));
        });
        return row;
      }),
    [periodCols, series, sheets, values],
  );

  const seriesNames = series
    .map((s) => sheets.find((x) => x.id === s.sheetId)?.cells[`A${s.row + 1}`] ?? "")
    .filter(Boolean);

  const pieData = seriesNames.map((n) => ({
    name: n,
    value: chartData.reduce((a, r) => a + (Number(r[n]) || 0), 0),
  }));

  return (
    <div className="space-y-8">
      <section className="section">
        <header className="section-head">
          <p className="kicker">Painel</p>
          <h2 className="section-title">Visão geral financeira</h2>
          <p className="section-lead">
            Escolha as células e linhas das suas folhas: todos os indicadores e gráficos são
            calculados a partir dos dados que introduzir.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap items-end gap-2 print:hidden">
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Folha</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={pickSheet}
              onChange={(e) => setPickSheet(e.target.value)}
            >
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Adicionar indicador (célula)</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setKpis((p) => [...p, { sheetId: target.id, a: e.target.value }]);
              }}
            >
              <option value="">Escolher linha…</option>
              {labelRows.map((lr) => (
                <option key={lr.r} value={addr(lr.r, periodCols[periodCols.length - 1]?.col ?? 1)}>
                  {lr.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Adicionar série ao gráfico</span>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setSeries((p) => [...p, { sheetId: target.id, row: Number(e.target.value) }]);
              }}
            >
              <option value="">Escolher linha…</option>
              {labelRows.map((lr) => (
                <option key={lr.r} value={lr.r}>
                  {lr.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {kpis.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            <Plus className="mr-1 inline size-4" /> Ainda sem indicadores. Preencha as folhas e
            escolha acima as linhas que quer destacar.
          </p>
        ) : (
          <div className="kpi-grid">
            {kpis.map((k, i) => {
              const sh = sheets.find((s) => s.id === k.sheetId);
              const rowIdx = Number(/\d+/.exec(k.a)?.[0] ?? 1) - 1;
              const label = sh?.cells[`A${rowIdx + 1}`] ?? k.a;
              const fmt = meta[k.sheetId]?.rowFmt[rowIdx];
              const v = values.get(`${k.sheetId}!${k.a}`)?.value ?? "";
              return (
                <div key={`${k.sheetId}-${k.a}-${i}`} className="kpi-card relative">
                  <button
                    className="absolute right-2 top-2 text-muted-foreground print:hidden"
                    onClick={() => setKpis((p) => p.filter((_, j) => j !== i))}
                  >
                    <X className="size-3.5" />
                  </button>
                  <p className="kpi-label">{label}</p>
                  <p className="kpi-value">{formatValue(v, fmt) || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {sh?.name} · {k.a}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <header className="section-head flex-row flex-wrap items-end justify-between gap-4 md:flex">
          <div>
            <p className="kicker">Gráficos</p>
            <h2 className="section-title">Evolução e composição</h2>
          </div>
          <div className="segmented print:hidden">
            {(["linha", "barras", "pizza"] as const).map((c) => (
              <button
                key={c}
                className={chart === c ? "segmented-active" : ""}
                onClick={() => setChart(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </header>

        {series.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 print:hidden">
            {series.map((s, i) => (
              <span key={i} className="chip">
                {sheets.find((x) => x.id === s.sheetId)?.cells[`A${s.row + 1}`]}
                <button onClick={() => setSeries((p) => p.filter((_, j) => j !== i))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="card h-96">
          {series.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Escolha uma ou mais linhas para desenhar o gráfico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chart === "pizza" ? (
                <PieChart>
                  <Tooltip formatter={(v: number) => kzShort(v)} />
                  <Legend />
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : chart === "barras" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => kzShort(v)} width={90} />
                  <Tooltip formatter={(v: number) => kzShort(v)} />
                  <Legend />
                  {seriesNames.map((n, i) => (
                    <Bar key={n} dataKey={n} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => kzShort(v)} width={90} />
                  <Tooltip formatter={(v: number) => kzShort(v)} />
                  <Legend />
                  {seriesNames.map((n, i) => (
                    <Line
                      key={n}
                      type="monotone"
                      dataKey={n}
                      stroke={PALETTE[i % PALETTE.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

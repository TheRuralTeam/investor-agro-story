import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Coins,
  FileDown,
  Handshake,
  LayoutDashboard,
  Play,
  RotateCcw,
  Route as RouteIcon,
  Table2,
} from "lucide-react";
import { AgriProvider, useAgri } from "@/lib/agrilink/store";
import { SCENARIOS, type ScenarioKey } from "@/lib/agrilink/model";
import { exportToPdf } from "@/lib/agrilink/export";
import { Overview } from "@/components/agrilink/Overview";
import { RevenueStreams } from "@/components/agrilink/RevenueStreams";
import { MoneyFlow } from "@/components/agrilink/MoneyFlow";
import { FinancialPlan } from "@/components/agrilink/FinancialPlan";
import { CostStructure } from "@/components/agrilink/CostStructure";
import { Partners } from "@/components/agrilink/Partners";
import { Presentation } from "@/components/agrilink/Presentation";
import { Button } from "@/components/ui/button";
import logo from "@/assets/agrilink-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriLink — Modelo Financeiro e Fluxos de Receita" },
      {
        name: "description",
        content:
          "Dashboard interativo do modelo financeiro da AgriLink: marketplace agrícola em Angola com transporte até Luanda e pagamento via mobile money.",
      },
      { property: "og:title", content: "AgriLink — Modelo Financeiro para Investidores" },
      {
        property: "og:description",
        content:
          "Receita, fluxo de dinheiro, custos e projeção a 12 meses da AgriLink, em cenários editáveis ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AgriProvider>
      <Dashboard />
    </AgriProvider>
  ),
});

const NAV = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "receita", label: "Fluxo de receita", icon: Coins },
  { id: "fluxo", label: "Fluxo de dinheiro", icon: RouteIcon },
  { id: "plano", label: "Plano financeiro", icon: Table2 },
  { id: "custos", label: "Estrutura de custos", icon: BarChart3 },
  { id: "parcerias", label: "Segmentos e parcerias", icon: Handshake },
];

function Dashboard() {
  const { scenario, setScenario, resetScenario, presenting, setPresenting } = useAgri();
  const [active, setActive] = useState("overview");

  if (presenting) return <Presentation />;

  return (
    <div className="app-shell">
      <aside className="app-sidebar print:hidden">
        <div className="flex items-center gap-2 px-2">
          <img src={logo.url} alt="AgriLink" className="h-10 w-auto" />
        </div>
        <p className="px-2 text-xs text-muted-foreground">
          Do campo a Luanda, pago na hora.
        </p>

        <nav className="mt-6 space-y-1">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={() => setActive(n.id)}
              className={`nav-link${active === n.id ? " nav-link-active" : ""}`}
            >
              <n.icon className="size-4" />
              {n.label}
            </a>
          ))}
        </nav>

        <div className="mt-8 px-2">
          <p className="kicker mb-2">Cenário</p>
          <div className="scenario-switch">
            {(Object.keys(SCENARIOS) as ScenarioKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setScenario(k)}
                className={scenario === k ? "scenario-active" : ""}
              >
                {SCENARIOS[k].label}
              </button>
            ))}
          </div>
          <button className="reset-link" onClick={resetScenario}>
            <RotateCcw className="size-3" /> Repor valores do cenário
          </button>
        </div>

        <div className="mt-auto space-y-2 px-2 pt-6">
          <Link to="/modelo" className="nav-link nav-link-active">
            <FileSpreadsheet className="size-4" /> Modelo financeiro editável
          </Link>
          <Button className="w-full" onClick={() => setPresenting(true)}>
            <Play className="size-4" /> Modo Investidor
          </Button>
          <Button variant="outline" className="w-full" onClick={exportToPdf}>
            <FileDown className="size-4" /> Exportar PDF
          </Button>
        </div>
      </aside>

      <main className="app-main">
        <div className="hero print:hidden">
          <div>
            <p className="kicker">AgriLink · Angola</p>
            <h1 className="hero-title">Modelo financeiro e fluxos de receita</h1>
            <p className="hero-lead">
              O marketplace que liga produtores agrícolas a compradores em Luanda, com transporte
              garantido e liquidação em mobile money. Todos os números desta apresentação são
              editáveis ao vivo.
            </p>
          </div>
        </div>

        <Overview />
        <RevenueStreams />
        <MoneyFlow />
        <FinancialPlan />
        <CostStructure />
        <Partners />

        <footer className="pb-16 pt-8 text-xs text-muted-foreground">
          AgriLink · Demonstração para investidores · Valores em Kwanza (AOA)
        </footer>
      </main>
    </div>
  );
}

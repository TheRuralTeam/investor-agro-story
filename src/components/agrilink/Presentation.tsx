import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAgri } from "@/lib/agrilink/store";
import { Overview } from "./Overview";
import { RevenueStreams } from "./RevenueStreams";
import { MoneyFlow } from "./MoneyFlow";
import { FinancialPlan } from "./FinancialPlan";
import { CostStructure } from "./CostStructure";
import { Partners } from "./Partners";
import logo from "@/assets/agrilink-logo.png.asset.json";

const slides: { title: string; node: ReactNode }[] = [
  { title: "Visão geral", node: <Overview /> },
  { title: "Fluxo de receita", node: <RevenueStreams /> },
  { title: "Fluxo de dinheiro", node: <MoneyFlow /> },
  { title: "Plano financeiro", node: <FinancialPlan /> },
  { title: "Estrutura de custos", node: <CostStructure /> },
  { title: "Parcerias", node: <Partners /> },
];

export function Presentation() {
  const { setPresenting, scenario } = useAgri();
  const [i, setI] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setI((p) => Math.min(p + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setI((p) => Math.max(p - 1, 0));
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPresenting]);

  return (
    <div className="present-root">
      <header className="present-bar">
        <img src={logo.url} alt="AgriLink" className="h-9 w-auto" />
        <div className="flex items-center gap-3 text-sm">
          <span className="badge-scenario">Cenário {scenario}</span>
          <span className="text-muted-foreground">
            {i + 1} / {slides.length}
          </span>
          <button className="present-btn" onClick={() => setI((p) => Math.max(p - 1, 0))}>
            <ChevronLeft className="size-5" />
          </button>
          <button
            className="present-btn"
            onClick={() => setI((p) => Math.min(p + 1, slides.length - 1))}
          >
            <ChevronRight className="size-5" />
          </button>
          <button className="present-btn" onClick={() => setPresenting(false)}>
            <X className="size-5" />
          </button>
        </div>
      </header>
      <main className="present-stage">{slides[i].node}</main>
    </div>
  );
}

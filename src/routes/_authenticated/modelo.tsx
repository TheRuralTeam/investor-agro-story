import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  FileDown,
  FileSpreadsheet,
  Bot,
  LayoutDashboard,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Table2,
  Trash2,
} from "lucide-react";
import { FinProvider, useFin } from "@/lib/finmodel/store";
import { Grid } from "@/components/finmodel/Grid";
import { AiAgent } from "@/components/finmodel/AiAgent";
import { FinDashboard } from "@/components/finmodel/Dashboard";
import { exportToPdf, exportWorkbookToXlsx } from "@/lib/finmodel/export";
import { Button } from "@/components/ui/button";
import logo from "@/assets/agrilink-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/modelo")({
  head: () => ({
    meta: [
      { title: "Modelo Financeiro Editável — AgriLink" },
      {
        name: "description",
        content:
          "Folha de cálculo interativa para construir o documento financeiro completo: pressupostos, DR, fluxo de caixa, balanço, capital de giro, retorno e break-even.",
      },
      { property: "og:title", content: "Modelo Financeiro Editável — AgriLink" },
      {
        property: "og:description",
        content:
          "Crie folhas, células e fórmulas, veja gráficos automáticos e exporte para Excel ou PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <FinProvider>
      <ModelWorkspace />
    </FinProvider>
  ),
});

function ModelWorkspace() {
  const {
    sheets,
    sheet,
    activeId,
    setActive,
    addSheet,
    duplicateSheet,
    renameSheet,
    removeSheet,
    resetAll,
    snapshots,
    saveSnapshot,
    loadSnapshot,
    deleteSnapshot,
  } = useFin();
  const [tab, setTab] = useState<"folhas" | "painel" | "agente">("folhas");

  return (
    <div className="app-shell">
      <aside className="app-sidebar print:hidden">
        <img src={logo.url} alt="AgriLink" className="h-10 w-auto px-2" />
        <p className="px-2 text-xs text-muted-foreground">Modelo financeiro editável</p>

        <nav className="mt-6 space-y-1">
          <button
            className={`nav-link w-full${tab === "folhas" ? " nav-link-active" : ""}`}
            onClick={() => setTab("folhas")}
          >
            <Table2 className="size-4" /> Folhas de cálculo
          </button>
          <button
            className={`nav-link w-full${tab === "painel" ? " nav-link-active" : ""}`}
            onClick={() => setTab("painel")}
          >
            <LayoutDashboard className="size-4" /> Painel e gráficos
          </button>
          <button
            className={`nav-link w-full${tab === "agente" ? " nav-link-active" : ""}`}
            onClick={() => setTab("agente")}
          >
            <Bot className="size-4" /> Agente de IA
          </button>
        </nav>

        <div className="mt-6 px-2">
          <p className="kicker mb-2">Documentos</p>
          <div className="space-y-1">
            {sheets.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id);
                  setTab("folhas");
                }}
                className={`sheet-tab${s.id === activeId ? " sheet-tab-active" : ""}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" onClick={() => addSheet()}>
              <Plus className="size-3.5" /> Nova
            </Button>
            <Button variant="ghost" size="sm" onClick={() => duplicateSheet(activeId)}>
              <Copy className="size-3.5" /> Duplicar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const n = window.prompt("Novo nome da folha", sheet.name);
                if (n?.trim()) renameSheet(activeId, n.trim());
              }}
            >
              <Pencil className="size-3.5" /> Renomear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm(`Eliminar a folha "${sheet.name}"?`)) removeSheet(activeId);
              }}
            >
              <Trash2 className="size-3.5" /> Eliminar
            </Button>
          </div>
        </div>

        <div className="mt-6 px-2">
          <p className="kicker mb-2">Cenários guardados</p>
          {snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Guarde versões (conservador, base, otimista) do modelo completo.
            </p>
          ) : (
            <div className="space-y-1">
              {snapshots.map((s) => (
                <div key={s.name} className="flex items-center gap-1">
                  <button className="sheet-tab flex-1" onClick={() => loadSnapshot(s.name)}>
                    {s.name}
                  </button>
                  <button
                    className="text-muted-foreground"
                    onClick={() => deleteSnapshot(s.name)}
                    aria-label={`Eliminar ${s.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              const n = window.prompt("Nome do cenário", "Base");
              if (n?.trim()) saveSnapshot(n.trim());
            }}
          >
            <Save className="size-3.5" /> Guardar cenário
          </Button>
        </div>

        <div className="mt-auto space-y-2 px-2 pt-6">
          <Button className="w-full" onClick={() => exportWorkbookToXlsx(sheets)}>
            <FileSpreadsheet className="size-4" /> Exportar Excel
          </Button>
          <Button variant="outline" className="w-full" onClick={exportToPdf}>
            <FileDown className="size-4" /> Exportar PDF
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              if (window.confirm("Repor os modelos vazios e apagar os dados introduzidos?"))
                resetAll();
            }}
          >
            <RotateCcw className="size-4" /> Repor modelos
          </Button>
          <Link to="/" className="nav-link">
            <ArrowLeft className="size-4" /> Voltar à apresentação
          </Link>
        </div>
      </aside>

      <main className="app-main">
        {tab === "folhas" ? (
          <section className="section">
            <header className="section-head">
              <p className="kicker">Documento financeiro</p>
              <h1 className="section-title">{sheet.name}</h1>
              <p className="section-lead">
                Escreva os seus próprios valores nas células. As linhas de cálculo têm fórmulas
                automáticas e podem ser alteradas — adicione linhas, colunas ou folhas conforme
                precisar.
              </p>
            </header>
            <Grid />
            <div className="excel-tabbar mt-3 print:hidden">
              {sheets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  onDoubleClick={() => {
                    const n = window.prompt("Novo nome da folha", s.name);
                    if (n?.trim()) renameSheet(s.id, n.trim());
                  }}
                  className={`excel-tab${s.id === activeId ? " excel-tab-active" : ""}`}
                >
                  {s.name}
                </button>
              ))}
              <button className="excel-tab" onClick={() => addSheet()} title="Nova folha">
                <Plus className="inline size-3.5" />
              </button>
            </div>
          </section>

        ) : tab === "painel" ? (
          <FinDashboard />
        ) : (
          <AiAgent />
        )}
        <footer className="pb-16 pt-8 text-xs text-muted-foreground">
          AgriLink · Modelo financeiro · Valores em Kwanza (AOA)
        </footer>
      </main>
    </div>
  );
}

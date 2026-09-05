import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, User } from "lucide-react";
import { askFinAgent } from "@/lib/finmodel/ai.functions";
import { useFin } from "@/lib/finmodel/store";
import { addr } from "@/lib/finmodel/engine";
import { Button } from "@/components/ui/button";

interface Msg {
  role: "user" | "assistant";
  content: string;
  applied?: number;
}

const SUGESTOES = [
  "Cria uma folha de orçamento de marketing com 12 meses",
  "Adiciona uma linha de custos com transporte e a fórmula do total",
  "Preenche os meses de Janeiro a Dezembro no cabeçalho",
];

interface Template {
  nome: string;
  descricao: string;
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    nome: "Orçamento",
    descricao: "Rubricas de orçamento vs. real, desvio e total anual.",
    prompt:
      'Cria uma nova folha chamada "Orçamento" com: linha de cabeçalho com os 12 meses (Jan a Dez) a partir da coluna B e uma coluna final "Total Ano"; na coluna A as rubricas típicas de orçamento (Pessoal, Transporte e logística, Pontos de agregação, Comissões a operadoras, Marketing, Tecnologia, Administrativo, Outros); deixa as células dos meses VAZIAS para eu preencher; acrescenta a linha "Total Orçamento" com fórmulas SUM por coluna e a coluna "Total Ano" com SUM por linha. Formata todas as linhas de valores como "kz". Não inventes números.',
  },
  {
    nome: "Fluxo de Caixa",
    descricao: "Entradas, saídas, fluxo líquido e saldo acumulado.",
    prompt:
      'Cria uma nova folha chamada "Fluxo de Caixa" com cabeçalho de 12 meses (Jan a Dez) a partir da coluna B. Secção "Entradas" (Recebimentos de vendas, Comissões de transporte, Comissões mobile money, Outras entradas) com linha "Total Entradas" em SUM; secção "Saídas" (Pagamentos a produtores, Motoristas, Operadoras de pagamento, Pontos de agregação, Equipa, Outras saídas) com "Total Saídas" em SUM; depois "Fluxo Líquido" (=Total Entradas - Total Saídas), "Saldo Inicial" e "Saldo Final" (=Saldo Inicial + Fluxo Líquido), com o Saldo Inicial de cada mês a referenciar o Saldo Final do mês anterior por fórmula. Células de input vazias. Formata as linhas de valores como "kz".',
  },
  {
    nome: "Despesas",
    descricao: "Registo de despesas por categoria com % do total.",
    prompt:
      'Cria uma nova folha chamada "Despesas" com cabeçalho: Data, Categoria, Descrição, Fornecedor, Valor (Kz), % do Total. Deixa 20 linhas vazias para registo. No fim acrescenta a linha "Total" com SUM da coluna Valor, e na coluna "% do Total" a fórmula IFERROR(valor/total;0) com referência absoluta ao total, formatada como "pct". Formata a coluna de valores como "kz". Não inventes registos.',
  },
  {
    nome: "Receita",
    descricao: "Receita pelas 3 fontes, total e crescimento m/m.",
    prompt:
      'Cria uma nova folha chamada "Receita" com cabeçalho de 12 meses (Jan a Dez) a partir da coluna B e coluna final "Total Ano". Linhas: Caixas transacionadas, Preço médio por caixa, GMV (=caixas*preço), Comissão venda formal (%), Receita venda formal, Comissão por caixa (Kz), Receita transporte, Comissão mobile money (%), Receita mobile money, "Receita Total" (SUM das três receitas) e "Crescimento m/m" (=IFERROR(mês atual/mês anterior-1;0)). As linhas de pressupostos ficam vazias para eu preencher; as linhas calculadas levam fórmulas. Formata receitas como "kz", percentagens como "pct" e caixas como "num".',
  },
];

export function AiAgent() {
  const { sheet, sheets, values, applyAiOps } = useFin();
  const ask = useServerFn(askFinAgent);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildContext = () => {
    const lines: string[] = [
      `Folhas existentes: ${sheets.map((s) => s.name).join(", ")}`,
      `Folha ativa: "${sheet.name}"`,
      "Células preenchidas da folha ativa (endereço = conteúdo | valor calculado):",
    ];
    const entries = Object.entries(sheet.cells).slice(0, 300);
    if (entries.length === 0) lines.push("(vazia)");
    for (const [a, raw] of entries) {
      const v = values.get(`${sheet.id}!${a}`)?.value;
      lines.push(`${a} = ${raw}${raw.startsWith("=") ? ` | ${String(v ?? "")}` : ""}`);
    }
    const rows = sheet.rows;
    lines.push(`Primeira linha livre sugerida: ${addr(rows + 1, 0)}`);
    return lines.join("\n");
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await ask({
        data: {
          context: buildContext(),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      const ops = res.ops ?? [];
      if (ops.length) applyAiOps(ops);
      setMessages([...next, { role: "assistant", content: res.reply, applied: ops.length }]);
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("402")
          ? "Créditos de IA esgotados. Adicione créditos para continuar."
          : "Não foi possível falar com o assistente. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <header className="section-head">
        <p className="kicker">Assistente</p>
        <h1 className="section-title">Agente de IA da folha de cálculo</h1>
        <p className="section-lead">
          Descreva o que precisa — &quot;cria uma tabela de despesas mensais&quot;, &quot;acrescenta
          uma coluna de total com fórmula&quot; — e o agente escreve diretamente nas células da
          folha <strong>{sheet.name}</strong>.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <div className="max-h-[52vh] min-h-40 space-y-3 overflow-auto">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Experimente pedir:</p>
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="mt-0.5 text-muted-foreground">
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <div className="whitespace-pre-wrap">
                {m.content}
                {m.applied ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.applied} alteração(ões) aplicadas na folha.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> A escrever na folha…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
            placeholder="Ex.: cria linhas de receitas, custos e margem para 12 meses"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            <Send className="size-4" /> Enviar
          </Button>
        </form>
      </div>
    </section>
  );
}

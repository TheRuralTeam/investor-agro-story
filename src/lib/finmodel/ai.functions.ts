import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export interface FinAiOp {
  kind: "set" | "clear" | "sheet" | "fmt";
  sheet?: string | null;
  addr?: string | null;
  value?: string | null;
  row?: number | null;
  fmt?: string | null;
}

export interface FinAiResult {
  reply: string;
  ops: FinAiOp[];
}

const Input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  context: z.string(),
});

const SYSTEM = `És o assistente financeiro da AgriLink e trabalhas dentro de uma folha de cálculo (tipo Excel) em português de Angola.
O utilizador conversa contigo e tu preenches a folha por ele.

Responde SEMPRE apenas com um objeto JSON válido (sem markdown, sem \`\`\`), com esta forma exata:
{"reply": "texto curto em português", "ops": [ ... ]}

Cada operação em "ops" tem um destes formatos:
{"kind":"set","addr":"B5","value":"1200"}            escreve numa célula (endereço A1; value pode ser texto, número ou fórmula a começar por "=")
{"kind":"clear","addr":"B5"}                          limpa a célula
{"kind":"sheet","value":"Orçamento 2026"}             cria uma folha nova com esse nome
{"kind":"fmt","row":5,"fmt":"kz"}                     formata a linha (row 1-based; fmt: "kz", "pct", "num" ou "dias")

Podes juntar "sheet":"Nome da folha" a qualquer operação para escrever noutra folha; sem esse campo escreve na folha ativa.
Se for só conversa, devolve "ops": [].

Regras: rótulos na coluna A, períodos/meses na linha de cabeçalho, e usa fórmulas em inglês (SUM, AVERAGE, IF, IFERROR, NPV, IRR, PMT, ROUND) em vez de totais fixos. Nunca inventes números do negócio — se faltarem dados essenciais, pergunta e devolve ops vazio. Valores em Kwanza (AOA). Não escrevas por cima de células já preenchidas sem o utilizador pedir.`;

function toOps(raw: unknown): FinAiOp[] {
  if (!Array.isArray(raw)) return [];
  const ops: FinAiOp[] = [];
  for (const o of raw) {
    if (!o || typeof o !== "object") continue;
    const r = o as Record<string, unknown>;
    const kindRaw = String(r["kind"] ?? r["op"] ?? r["action"] ?? "set").toLowerCase();
    const kind = (["set", "clear", "sheet", "fmt"] as const).find((k) => kindRaw.includes(k));
    if (!kind) continue;
    const addr = r["addr"] ?? r["cell"] ?? r["celula"] ?? r["célula"] ?? null;
    const value = r["value"] ?? r["valor"] ?? r["name"] ?? r["nome"] ?? null;
    const row = r["row"] ?? r["linha"] ?? null;
    ops.push({
      kind,
      sheet: typeof r["sheet"] === "string" ? (r["sheet"] as string) : null,
      addr: typeof addr === "string" ? addr : null,
      value: value === null || value === undefined ? null : String(value),
      row: typeof row === "number" ? row : row ? Number(row) || null : null,
      fmt: typeof r["fmt"] === "string" ? (r["fmt"] as string) : null,
    });
  }
  return ops;
}

function parseResult(text: string): FinAiResult {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      return {
        reply: typeof obj["reply"] === "string" ? (obj["reply"] as string) : "Feito.",
        ops: toOps(obj["ops"]),
      };
    } catch {
      /* fall through */
    }
  }
  return { reply: text.trim().slice(0, 1000) || "Não consegui gerar uma resposta.", ops: [] };
}

export const askFinAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<FinAiResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const result = streamText({
      model: gateway("google/gemini-3.7-flash"),
      system: SYSTEM,
      messages: [
        { role: "user" as const, content: `Estado atual da folha de cálculo:\n${data.context}` },
        ...data.messages,
      ],
    });

    return parseResult(await result.text);
  });

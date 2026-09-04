import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const OpSchema = z.object({
  kind: z.enum(["set", "clear", "sheet", "fmt"]),
  sheet: z.string().nullable(),
  addr: z.string().nullable(),
  value: z.string().nullable(),
  row: z.number().nullable(),
  fmt: z.string().nullable(),
});

const ResultSchema = z.object({
  reply: z.string(),
  ops: z.array(OpSchema),
});

export type FinAiOp = z.infer<typeof OpSchema>;
export type FinAiResult = z.infer<typeof ResultSchema>;

const Input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  context: z.string(),
});

const SYSTEM = `És o assistente financeiro da AgriLink e trabalhas dentro de uma folha de cálculo (tipo Excel) em português de Angola.
O utilizador conversa contigo e tu preenches a folha por ele.

Devolves sempre:
- "reply": resposta curta e clara em português (o que fizeste ou o que precisas de saber).
- "ops": lista de operações a aplicar na folha. Lista vazia se for só conversa.

Tipos de operação:
- { kind: "set", sheet, addr, value } escreve numa célula. addr no formato A1 (ex.: "B5"). value pode ser texto, número ou fórmula a começar por "=" (ex.: "=SUM(B5:M5)").
- { kind: "clear", sheet, addr } limpa a célula.
- { kind: "sheet", value } cria uma nova folha com esse nome.
- { kind: "fmt", sheet, row, fmt } define o formato da linha (fmt: "kz", "pct", "num" ou "dias"; row é 1-based).

Campos não usados vão a null. "sheet" é o nome da folha; usa null para a folha ativa.
Regras: escreve rótulos na coluna A, meses/períodos na linha de cabeçalho, e usa fórmulas (SUM, IF, NPV, IRR, PMT...) em vez de totais fixos. Nunca inventes números do negócio sem o utilizador os indicar — pergunta primeiro se faltarem dados essenciais. Valores em Kwanza (AOA).`;

export const askFinAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<FinAiResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const result = streamText({
        model: gateway("google/gemini-3.7-flash"),
        output: Output.object({ schema: ResultSchema }),
        system: SYSTEM,
        messages: [
          { role: "user" as const, content: `Estado atual da folha de cálculo:\n${data.context}` },
          ...data.messages,
        ],
      });
      return (await result.output) as FinAiResult;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return { reply: error.text?.slice(0, 800) || "Não consegui gerar uma resposta.", ops: [] };
      }
      throw error;
    }
  });

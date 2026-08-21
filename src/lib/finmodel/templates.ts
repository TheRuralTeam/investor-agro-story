import { colName, type Sheet } from "./engine";

/** Row definition used to build a template sheet. */
interface RowDef {
  label: string;
  key?: string;
  /** section = coloured title row, calc = formula row, input = user types */
  kind?: "section" | "calc" | "input" | "note";
  /** formula for each period column; receives helpers */
  f?: (ctx: {
    c: string;
    prev: string | null;
    first: boolean;
    R: (key: string) => number;
  }) => string;
  /** formula for the total column */
  total?: (ctx: { firstCol: string; lastCol: string; R: (key: string) => number; row: number }) => string;
  /** format hint */
  fmt?: "kz" | "pct" | "num" | "dias";
}

export interface SheetMeta {
  /** 0-based row index -> style */
  rowKind: Record<number, "section" | "calc" | "note">;
  rowFmt: Record<number, "kz" | "pct" | "num" | "dias">;
  labelCol: number;
  headerRow: number;
}

export const SHEET_META_KEY = "__meta";

function build(
  id: string,
  name: string,
  title: string,
  periods: string[],
  rows: RowDef[],
  opts: { totalLabel?: string | null } = {},
): { sheet: Sheet; meta: SheetMeta } {
  const cells: Record<string, string> = {};
  const rowKind: SheetMeta["rowKind"] = {};
  const rowFmt: SheetMeta["rowFmt"] = {};

  cells["A1"] = title;
  const headerRow = 2; // 0-based index of header row (spreadsheet row 3)
  cells["A3"] = "Rubrica";
  periods.forEach((p, k) => (cells[`${colName(k + 1)}3`] = p));
  const totalLabel = opts.totalLabel === undefined ? "Total" : opts.totalLabel;
  const totalCol = totalLabel ? colName(periods.length + 1) : null;
  if (totalCol && totalLabel) cells[`${totalCol}3`] = totalLabel;

  const index = new Map<string, number>();
  rows.forEach((r, k) => {
    if (r.key) index.set(r.key, k + 4); // spreadsheet row number
  });
  const R = (key: string) => index.get(key) ?? 0;

  rows.forEach((r, k) => {
    const rowNum = k + 4;
    cells[`A${rowNum}`] = r.label;
    if (r.kind && r.kind !== "input") rowKind[rowNum - 1] = r.kind;
    if (r.fmt) rowFmt[rowNum - 1] = r.fmt;
    if (r.kind === "section" || r.kind === "note") return;
    if (r.f) {
      periods.forEach((_, pi) => {
        const c = colName(pi + 1);
        const prev = pi === 0 ? null : colName(pi);
        cells[`${c}${rowNum}`] = r.f!({ c, prev, first: pi === 0, R });
      });
    }
    if (totalCol) {
      const firstCol = colName(1);
      const lastCol = colName(periods.length);
      cells[`${totalCol}${rowNum}`] = r.total
        ? r.total({ firstCol, lastCol, R, row: rowNum })
        : `=SUM(${firstCol}${rowNum}:${lastCol}${rowNum})`;
    }
  });

  const sheet: Sheet = {
    id,
    name,
    rows: rows.length + 6,
    cols: periods.length + (totalCol ? 2 : 1) + 2,
    cells,
  };
  return { sheet, meta: { rowKind, rowFmt, labelCol: 0, headerRow } };
}

const MESES12 = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const sumOf = (keys: string[], R: (k: string) => number, c: string) =>
  `=${keys.map((k) => `${c}${R(k)}`).join("+")}`;

/* ------------------------------- sheets ------------------------------- */

function pressupostos() {
  return build("pressupostos", "Pressupostos", "Pressupostos do modelo", MESES12, [
    { label: "Volume e atividade", kind: "section" },
    { label: "Produtores ativos", key: "produtores", fmt: "num" },
    { label: "Caixas transacionadas", key: "caixas", fmt: "num" },
    { label: "Preço médio por caixa (Kz)", key: "preco", fmt: "kz" },
    {
      label: "Volume transacionado (GMV)",
      key: "gmv",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("caixas")}*${c}${R("preco")}`,
    },
    { label: "Comissões e preços", kind: "section" },
    { label: "% comissão sobre venda formal", key: "comVenda", fmt: "pct" },
    { label: "% do volume em venda formal", key: "pctFormal", fmt: "pct" },
    { label: "Comissão fixa por caixa (Kz)", key: "comCaixa", fmt: "kz" },
    { label: "% de caixas transportadas", key: "pctTransp", fmt: "pct" },
    { label: "% comissão sobre pagamento digital", key: "comMobile", fmt: "pct" },
    { label: "% do volume pago via mobile money", key: "pctMobile", fmt: "pct" },
    { label: "Prazos e ciclo (dias)", kind: "section" },
    { label: "Prazo médio de recebimento de clientes (DSO)", key: "dso", fmt: "dias" },
    { label: "Prazo médio de pagamento a produtores (DPO)", key: "dpo", fmt: "dias" },
    { label: "Dias médios de stock (DIO)", key: "dio", fmt: "dias" },
    { label: "Outros pressupostos", kind: "section" },
    { label: "Taxa de imposto sobre o lucro", fmt: "pct" },
    { label: "Taxa de desconto anual", fmt: "pct" },
    { label: "", kind: "note" },
    {
      label: "Escreva aqui os seus próprios pressupostos — use = para criar fórmulas.",
      kind: "note",
    },
  ]);
}

function demonstracaoResultados() {
  return build("dr", "DR (P&L)", "Demonstração de Resultados — 12 meses", MESES12, [
    { label: "Receitas", kind: "section" },
    { label: "Comissão sobre venda formal", key: "r1", fmt: "kz" },
    { label: "Comissão por caixa / corredor de transporte", key: "r2", fmt: "kz" },
    { label: "Comissão sobre pagamento digital", key: "r3", fmt: "kz" },
    { label: "Outras receitas", key: "r4", fmt: "kz" },
    {
      label: "Total de receitas",
      key: "receitas",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["r1", "r2", "r3", "r4"], R, c),
    },
    { label: "Custos variáveis", kind: "section" },
    { label: "Comissões a motoristas", key: "v1", fmt: "kz" },
    { label: "Comissões a operadoras móveis / EMIS", key: "v2", fmt: "kz" },
    { label: "Embalagem e perdas", key: "v3", fmt: "kz" },
    { label: "Outros custos variáveis", key: "v4", fmt: "kz" },
    {
      label: "Total de custos variáveis",
      key: "cv",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["v1", "v2", "v3", "v4"], R, c),
    },
    {
      label: "Margem bruta",
      key: "mb",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("receitas")}-${c}${R("cv")}`,
    },
    {
      label: "Margem bruta %",
      kind: "calc",
      fmt: "pct",
      f: ({ c, R }) => `=IF(${c}${R("receitas")}=0,0,${c}${R("mb")}/${c}${R("receitas")})`,
      total: ({ firstCol, lastCol, R }) =>
        `=IF(SUM(${firstCol}${R("receitas")}:${lastCol}${R("receitas")})=0,0,SUM(${firstCol}${R("mb")}:${lastCol}${R("mb")})/SUM(${firstCol}${R("receitas")}:${lastCol}${R("receitas")}))`,
    },
    { label: "Custos fixos", kind: "section" },
    { label: "Pontos de agregação (Mangueirinhas, Estalagem, Congoleses)", key: "f1", fmt: "kz" },
    { label: "Equipa financeira e administrativa", key: "f2", fmt: "kz" },
    { label: "Tecnologia e plataforma", key: "f3", fmt: "kz" },
    { label: "Marketing e aquisição", key: "f4", fmt: "kz" },
    { label: "Outros custos fixos", key: "f5", fmt: "kz" },
    {
      label: "Total de custos fixos",
      key: "cf",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["f1", "f2", "f3", "f4", "f5"], R, c),
    },
    {
      label: "EBITDA",
      key: "ebitda",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("mb")}-${c}${R("cf")}`,
    },
    { label: "Depreciações e amortizações", key: "da", fmt: "kz" },
    {
      label: "EBIT (resultado operacional)",
      key: "ebit",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("ebitda")}-${c}${R("da")}`,
    },
    { label: "Juros e encargos financeiros", key: "juros", fmt: "kz" },
    { label: "Impostos", key: "impostos", fmt: "kz" },
    {
      label: "Resultado líquido",
      key: "rl",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("ebit")}-${c}${R("juros")}-${c}${R("impostos")}`,
    },
    {
      label: "Margem líquida %",
      kind: "calc",
      fmt: "pct",
      f: ({ c, R }) => `=IF(${c}${R("receitas")}=0,0,${c}${R("rl")}/${c}${R("receitas")})`,
      total: ({ firstCol, lastCol, R }) =>
        `=IF(SUM(${firstCol}${R("receitas")}:${lastCol}${R("receitas")})=0,0,SUM(${firstCol}${R("rl")}:${lastCol}${R("rl")})/SUM(${firstCol}${R("receitas")}:${lastCol}${R("receitas")}))`,
    },
  ]);
}

function fluxoCaixa() {
  return build("caixa", "Fluxo de Caixa", "Fluxo de Caixa — 12 meses", MESES12, [
    {
      label: "Saldo inicial de caixa",
      key: "saldoIni",
      kind: "calc",
      fmt: "kz",
      f: ({ prev, R }) => (prev ? `=${prev}${R("saldoFim")}` : ""),
      total: () => "",
    },
    { label: "Entradas de caixa", kind: "section" },
    { label: "Recebimentos de compradores", key: "e1", fmt: "kz" },
    { label: "Comissões recebidas", key: "e2", fmt: "kz" },
    { label: "Entradas de capital (investidores)", key: "e3", fmt: "kz" },
    { label: "Financiamento / empréstimos", key: "e4", fmt: "kz" },
    {
      label: "Total de entradas",
      key: "entradas",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["e1", "e2", "e3", "e4"], R, c),
    },
    { label: "Saídas de caixa", kind: "section" },
    { label: "Pagamentos a produtores", key: "s1", fmt: "kz" },
    { label: "Fretes e motoristas", key: "s2", fmt: "kz" },
    { label: "Taxas de operadoras móveis / EMIS", key: "s3", fmt: "kz" },
    { label: "Operação dos pontos de agregação", key: "s4", fmt: "kz" },
    { label: "Salários e equipa", key: "s5", fmt: "kz" },
    { label: "Marketing e outros operacionais", key: "s6", fmt: "kz" },
    { label: "Investimento (CAPEX)", key: "s7", fmt: "kz" },
    { label: "Impostos e encargos financeiros", key: "s8", fmt: "kz" },
    {
      label: "Total de saídas",
      key: "saidas",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"], R, c),
    },
    {
      label: "Fluxo de caixa líquido do mês",
      key: "fluxo",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("entradas")}-${c}${R("saidas")}`,
    },
    {
      label: "Saldo final de caixa",
      key: "saldoFim",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("saldoIni")}+${c}${R("fluxo")}`,
      total: ({ lastCol, R }) => `=${lastCol}${R("saldoFim")}`,
    },
  ]);
}

function balanco() {
  return build("balanco", "Balanço", "Balanço Previsional", MESES12, [
    { label: "Ativo", kind: "section" },
    { label: "Caixa e equivalentes", key: "a1", fmt: "kz" },
    { label: "Contas a receber de clientes", key: "a2", fmt: "kz" },
    { label: "Stock / inventário", key: "a3", fmt: "kz" },
    { label: "Adiantamentos a produtores", key: "a4", fmt: "kz" },
    {
      label: "Ativo corrente",
      key: "ac",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["a1", "a2", "a3", "a4"], R, c),
    },
    { label: "Ativo fixo (viaturas, equipamento, plataforma)", key: "a5", fmt: "kz" },
    { label: "Depreciação acumulada (negativa)", key: "a6", fmt: "kz" },
    {
      label: "Ativo total",
      key: "at",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("ac")}+${c}${R("a5")}+${c}${R("a6")}`,
    },
    { label: "Passivo", kind: "section" },
    { label: "Contas a pagar a produtores", key: "p1", fmt: "kz" },
    { label: "Outros fornecedores e acréscimos", key: "p2", fmt: "kz" },
    { label: "Impostos a pagar", key: "p3", fmt: "kz" },
    {
      label: "Passivo corrente",
      key: "pc",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["p1", "p2", "p3"], R, c),
    },
    { label: "Financiamento de médio/longo prazo", key: "p4", fmt: "kz" },
    {
      label: "Passivo total",
      key: "pt",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("pc")}+${c}${R("p4")}`,
    },
    { label: "Capital próprio", kind: "section" },
    { label: "Capital social e suprimentos", key: "cp1", fmt: "kz" },
    { label: "Resultados acumulados", key: "cp2", fmt: "kz" },
    { label: "Resultado do período", key: "cp3", fmt: "kz" },
    {
      label: "Capital próprio total",
      key: "cpt",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => sumOf(["cp1", "cp2", "cp3"], R, c),
    },
    {
      label: "Verificação (Ativo − Passivo − Capital próprio)",
      kind: "calc",
      fmt: "kz",
      f: ({ c, R }) => `=${c}${R("at")}-${c}${R("pt")}-${c}${R("cpt")}`,
    },
  ]);
}

function capitalGiro() {
  return build(
    "giro",
    "Capital de Giro & CCC",
    "Capital de Giro e Ciclo de Conversão de Caixa",
    MESES12,
    [
      { label: "Necessidade de capital de giro", kind: "section" },
      { label: "Contas a receber", key: "cr", fmt: "kz" },
      { label: "Stock / inventário", key: "st", fmt: "kz" },
      { label: "Contas a pagar", key: "cp", fmt: "kz" },
      {
        label: "Necessidade de capital de giro",
        key: "ncg",
        kind: "calc",
        fmt: "kz",
        f: ({ c, R }) => `=${c}${R("cr")}+${c}${R("st")}-${c}${R("cp")}`,
        total: ({ lastCol, R }) => `=${lastCol}${R("ncg")}`,
      },
      {
        label: "Variação do capital de giro",
        kind: "calc",
        fmt: "kz",
        f: ({ c, prev, R }) => (prev ? `=${c}${R("ncg")}-${prev}${R("ncg")}` : ""),
      },
      { label: "Ciclo de conversão de caixa (dias)", kind: "section" },
      { label: "Dias de recebimento — DSO", key: "dso", fmt: "dias" },
      { label: "Dias de stock — DIO", key: "dio", fmt: "dias" },
      { label: "Dias de pagamento — DPO", key: "dpo", fmt: "dias" },
      {
        label: "Ciclo de conversão de caixa (CCC)",
        key: "ccc",
        kind: "calc",
        fmt: "dias",
        f: ({ c, R }) => `=${c}${R("dso")}+${c}${R("dio")}-${c}${R("dpo")}`,
        total: ({ firstCol, lastCol, R }) =>
          `=AVERAGE(${firstCol}${R("ccc")}:${lastCol}${R("ccc")})`,
      },
      { label: "", kind: "note" },
      {
        label: "CCC = tempo (dias) entre pagar ao produtor e receber do comprador.",
        kind: "note",
      },
    ],
  );
}

function retorno() {
  const anos = ["Ano 0", "Ano 1", "Ano 2", "Ano 3", "Ano 4", "Ano 5"];
  return build(
    "retorno",
    "Investimento & Retorno",
    "Investimento, ROI, VAL e TIR",
    anos,
    [
      { label: "Investimento e fluxos", kind: "section" },
      { label: "Investimento (entrada de capital, negativo)", key: "inv", fmt: "kz" },
      { label: "Fluxo de caixa operacional livre", key: "fco", fmt: "kz" },
      {
        label: "Fluxo de caixa líquido do projeto",
        key: "fcl",
        kind: "calc",
        fmt: "kz",
        f: ({ c, R }) => `=${c}${R("inv")}+${c}${R("fco")}`,
      },
      {
        label: "Fluxo acumulado (payback)",
        key: "acum",
        kind: "calc",
        fmt: "kz",
        f: ({ c, prev, R }) => (prev ? `=${prev}${R("acum")}+${c}${R("fcl")}` : `=${c}${R("fcl")}`),
        total: ({ lastCol, R }) => `=${lastCol}${R("acum")}`,
      },
      { label: "Indicadores", kind: "section" },
      { label: "Taxa de desconto anual", key: "taxa", fmt: "pct" },
      {
        label: "VAL — Valor Atual Líquido",
        kind: "calc",
        fmt: "kz",
        f: ({ first, R }) =>
          first ? `=B${R("fcl")}+NPV(B${R("taxa")},C${R("fcl")}:G${R("fcl")})` : "",
        total: () => "",
      },
      {
        label: "TIR — Taxa Interna de Retorno",
        kind: "calc",
        fmt: "pct",
        f: ({ first, R }) => (first ? `=IRR(B${R("fcl")}:G${R("fcl")})` : ""),
        total: () => "",
      },
      {
        label: "ROI (retorno sobre o investimento)",
        kind: "calc",
        fmt: "pct",
        f: ({ first, R }) =>
          first
            ? `=IF(B${R("inv")}=0,0,SUM(C${R("fco")}:G${R("fco")})/ABS(B${R("inv")}))`
            : "",
        total: () => "",
      },
    ],
    { totalLabel: null },
  );
}

function breakEven() {
  return build(
    "breakeven",
    "Ponto de Equilíbrio",
    "Break-even — ponto de equilíbrio",
    ["Valor"],
    [
      { label: "Preço médio por unidade / caixa (Kz)", key: "preco", fmt: "kz" },
      { label: "Custo variável por unidade / caixa (Kz)", key: "cvu", fmt: "kz" },
      {
        label: "Margem de contribuição unitária (Kz)",
        key: "mcu",
        kind: "calc",
        fmt: "kz",
        f: ({ c, R }) => `=${c}${R("preco")}-${c}${R("cvu")}`,
      },
      {
        label: "Margem de contribuição %",
        key: "mcp",
        kind: "calc",
        fmt: "pct",
        f: ({ c, R }) => `=IF(${c}${R("preco")}=0,0,${c}${R("mcu")}/${c}${R("preco")})`,
      },
      { label: "Custos fixos mensais (Kz)", key: "cf", fmt: "kz" },
      {
        label: "Ponto de equilíbrio (unidades / mês)",
        kind: "calc",
        fmt: "num",
        f: ({ c, R }) => `=IF(${c}${R("mcu")}=0,0,${c}${R("cf")}/${c}${R("mcu")})`,
      },
      {
        label: "Ponto de equilíbrio (Kz / mês)",
        kind: "calc",
        fmt: "kz",
        f: ({ c, R }) => `=IF(${c}${R("mcp")}=0,0,${c}${R("cf")}/${c}${R("mcp")})`,
      },
    ],
    { totalLabel: null },
  );
}

export function buildTemplateWorkbook() {
  const parts = [
    pressupostos(),
    demonstracaoResultados(),
    fluxoCaixa(),
    balanco(),
    capitalGiro(),
    retorno(),
    breakEven(),
  ];
  return {
    sheets: parts.map((p) => p.sheet),
    meta: Object.fromEntries(parts.map((p) => [p.sheet.id, p.meta])) as Record<string, SheetMeta>,
  };
}

export function blankSheet(id: string, name: string): { sheet: Sheet; meta: SheetMeta } {
  return {
    sheet: { id, name, rows: 40, cols: 14, cells: { A1: name } },
    meta: { rowKind: {}, rowFmt: {}, labelCol: 0, headerRow: 2 },
  };
}

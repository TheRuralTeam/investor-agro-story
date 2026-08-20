export type ScenarioKey = "conservador" | "base" | "otimista";

export interface Inputs {
  // KPIs / mercado
  produtores: number;
  caixasMes: number;
  precoMedioCaixa: number; // Kz por caixa
  crescimentoMensalPct: number; // % m/m

  // Receita 1 — comissão sobre venda formal
  comissaoVendaPct: number; // %
  pctVolumeFormal: number; // % do volume total que é venda formal

  // Receita 2 — comissão fixa por caixa no transporte
  comissaoPorCaixa: number; // Kz por caixa
  pctCaixasTransportadas: number; // % das caixas que usam o corredor AgriLink

  // Receita 3 — comissão sobre volume pago via mobile money
  comissaoMobilePct: number; // %
  pctVolumeMobile: number; // % do volume pago digitalmente

  // Custos
  custoMotoristaPorCaixa: number; // Kz
  custoOperadoraPct: number; // % sobre volume mobile
  custoPontoMangueirinhas: number; // Kz/mês
  custoPontoEstalagem: number; // Kz/mês
  custoPontoCongoleses: number; // Kz/mês
  custoEquipaFinanceira: number; // Kz/mês
}

export const SCENARIOS: Record<ScenarioKey, { label: string; inputs: Inputs }> = {
  conservador: {
    label: "Conservador",
    inputs: {
      produtores: 180,
      caixasMes: 4000,
      precoMedioCaixa: 12000,
      crescimentoMensalPct: 4,
      comissaoVendaPct: 4,
      pctVolumeFormal: 40,
      comissaoPorCaixa: 900,
      pctCaixasTransportadas: 70,
      comissaoMobilePct: 1,
      pctVolumeMobile: 55,
      custoMotoristaPorCaixa: 550,
      custoOperadoraPct: 0.5,
      custoPontoMangueirinhas: 900000,
      custoPontoEstalagem: 650000,
      custoPontoCongoleses: 600000,
      custoEquipaFinanceira: 1800000,
    },
  },
  base: {
    label: "Base",
    inputs: {
      produtores: 420,
      caixasMes: 9500,
      precoMedioCaixa: 14000,
      crescimentoMensalPct: 8,
      comissaoVendaPct: 5,
      pctVolumeFormal: 55,
      comissaoPorCaixa: 1200,
      pctCaixasTransportadas: 85,
      comissaoMobilePct: 1.5,
      pctVolumeMobile: 70,
      custoMotoristaPorCaixa: 650,
      custoOperadoraPct: 0.6,
      custoPontoMangueirinhas: 1200000,
      custoPontoEstalagem: 850000,
      custoPontoCongoleses: 780000,
      custoEquipaFinanceira: 2600000,
    },
  },
  otimista: {
    label: "Otimista",
    inputs: {
      produtores: 900,
      caixasMes: 18000,
      precoMedioCaixa: 15500,
      crescimentoMensalPct: 13,
      comissaoVendaPct: 6,
      pctVolumeFormal: 70,
      comissaoPorCaixa: 1400,
      pctCaixasTransportadas: 92,
      comissaoMobilePct: 2,
      pctVolumeMobile: 85,
      custoMotoristaPorCaixa: 700,
      custoOperadoraPct: 0.6,
      custoPontoMangueirinhas: 1500000,
      custoPontoEstalagem: 1100000,
      custoPontoCongoleses: 950000,
      custoEquipaFinanceira: 4200000,
    },
  },
};

export interface MonthRow {
  mes: string;
  caixas: number;
  gmv: number;
  recVenda: number;
  recTransporte: number;
  recMobile: number;
  receitaTotal: number;
  custoMotoristas: number;
  custoOperadoras: number;
  custoPontos: number;
  custoEquipa: number;
  custoTotal: number;
  margem: number;
  margemPct: number;
  caixaAcumulado: number;
}

export const MESES = [
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

export function monthMetrics(i: Inputs, caixas: number) {
  const gmv = caixas * i.precoMedioCaixa;
  const volumeFormal = gmv * (i.pctVolumeFormal / 100);
  const caixasTransportadas = caixas * (i.pctCaixasTransportadas / 100);
  const volumeMobile = gmv * (i.pctVolumeMobile / 100);

  const recVenda = volumeFormal * (i.comissaoVendaPct / 100);
  const recTransporte = caixasTransportadas * i.comissaoPorCaixa;
  const recMobile = volumeMobile * (i.comissaoMobilePct / 100);
  const receitaTotal = recVenda + recTransporte + recMobile;

  const custoMotoristas = caixasTransportadas * i.custoMotoristaPorCaixa;
  const custoOperadoras = volumeMobile * (i.custoOperadoraPct / 100);
  const custoPontos =
    i.custoPontoMangueirinhas + i.custoPontoEstalagem + i.custoPontoCongoleses;
  const custoEquipa = i.custoEquipaFinanceira;
  const custoTotal = custoMotoristas + custoOperadoras + custoPontos + custoEquipa;

  return {
    gmv,
    volumeFormal,
    volumeMobile,
    caixasTransportadas,
    recVenda,
    recTransporte,
    recMobile,
    receitaTotal,
    custoMotoristas,
    custoOperadoras,
    custoPontos,
    custoEquipa,
    custoTotal,
    margem: receitaTotal - custoTotal,
  };
}

export function buildPlan(i: Inputs): MonthRow[] {
  const rows: MonthRow[] = [];
  let acumulado = 0;
  for (let m = 0; m < 12; m++) {
    const caixas = i.caixasMes * Math.pow(1 + i.crescimentoMensalPct / 100, m);
    const k = monthMetrics(i, caixas);
    acumulado += k.margem;
    rows.push({
      mes: MESES[m] ?? String(m + 1),
      caixas: Math.round(caixas),
      gmv: k.gmv,
      recVenda: k.recVenda,
      recTransporte: k.recTransporte,
      recMobile: k.recMobile,
      receitaTotal: k.receitaTotal,
      custoMotoristas: k.custoMotoristas,
      custoOperadoras: k.custoOperadoras,
      custoPontos: k.custoPontos,
      custoEquipa: k.custoEquipa,
      custoTotal: k.custoTotal,
      margem: k.margem,
      margemPct: k.receitaTotal ? (k.margem / k.receitaTotal) * 100 : 0,
      caixaAcumulado: acumulado,
    });
  }
  return rows;
}

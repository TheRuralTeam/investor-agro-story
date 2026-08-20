import { ArrowRight, Banknote, MessageSquare, Package, Smartphone, Store, Truck, Wallet } from "lucide-react";
import { useAgri } from "@/lib/agrilink/store";
import { kz, kzShort } from "@/lib/agrilink/format";

export function MoneyFlow() {
  const { inputs, metrics } = useAgri();

  const precoCaixa = inputs.precoMedioCaixa;
  const comVenda = precoCaixa * (inputs.comissaoVendaPct / 100);
  const comCaixa = inputs.comissaoPorCaixa;
  const comMobile = precoCaixa * (inputs.comissaoMobilePct / 100);
  const frete = inputs.custoMotoristaPorCaixa;
  const liquidoProdutor = precoCaixa - comVenda - comCaixa - comMobile;

  const steps = [
    {
      icon: Store,
      title: "Publicação",
      desc: "Produtor publica lote disponível no ponto de agregação.",
      amount: kz(precoCaixa),
      note: "Preço da caixa",
    },
    {
      icon: Banknote,
      title: "Pagamento do comprador",
      desc: "Comprador paga via Unitel Money, Afrimoney ou Multicaixa Express.",
      amount: kz(precoCaixa),
      note: "Entra em escrow AgriLink",
    },
    {
      icon: Package,
      title: "Recolha",
      desc: "Caixa recolhida e etiquetada no ponto de agregação.",
      amount: `− ${kz(comVenda)}`,
      note: "Comissão de venda retida",
      retained: true,
    },
    {
      icon: Truck,
      title: "Chegada a Luanda",
      desc: "Motorista entrega no mercado ou no comprador formal.",
      amount: `− ${kz(comCaixa)}`,
      note: "Comissão de corredor retida",
      retained: true,
    },
    {
      icon: Wallet,
      title: "Transferência automática",
      desc: "Liquidação imediata para a carteira móvel do produtor.",
      amount: kz(liquidoProdutor),
      note: `Líquido do produtor (− ${kz(comMobile)} de comissão digital)`,
    },
    {
      icon: MessageSquare,
      title: "SMS de confirmação",
      desc: "Produtor e motorista recebem confirmação por SMS.",
      amount: kz(frete),
      note: "Frete pago ao motorista",
    },
    {
      icon: Smartphone,
      title: "Levantamento no agente",
      desc: "Produtor levanta em agente Unitel Money / Afrimoney.",
      amount: kz(liquidoProdutor),
      note: "Cash-out no terreno",
    },
  ];

  const retidoCaixa = comVenda + comCaixa + comMobile;

  return (
    <section id="fluxo" className="section">
      <header className="section-head">
        <p className="kicker">Fluxo de dinheiro</p>
        <h2 className="section-title">Do pagamento do comprador ao agente no terreno</h2>
        <p className="section-lead">
          Percurso de uma caixa de {kz(precoCaixa)}: a AgriLink retém {kz(retidoCaixa)} (
          {((retidoCaixa / precoCaixa) * 100).toFixed(1)}%) e liquida o restante em minutos.
        </p>
      </header>

      <div className="flow-track">
        {steps.map((s, idx) => (
          <div key={s.title} className="flow-item">
            <div className={`flow-card${s.retained ? " flow-card-retained" : ""}`}>
              <span className="flow-index">{String(idx + 1).padStart(2, "0")}</span>
              <s.icon className="size-5 text-primary" />
              <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              <p className="mt-3 text-base font-semibold tabular-nums text-primary">{s.amount}</p>
              <p className="text-[11px] text-muted-foreground">{s.note}</p>
            </div>
            {idx < steps.length - 1 && <ArrowRight className="flow-arrow" />}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="card-stat">
          <span className="stat-label">Retido pela AgriLink / caixa</span>
          <span className="stat-value">{kz(retidoCaixa)}</span>
        </div>
        <div className="card-stat">
          <span className="stat-label">Recebido pelo produtor / caixa</span>
          <span className="stat-value">{kz(liquidoProdutor)}</span>
        </div>
        <div className="card-stat">
          <span className="stat-label">Frete ao motorista / caixa</span>
          <span className="stat-value">{kz(frete)}</span>
        </div>
        <div className="card-stat">
          <span className="stat-label">Fluxo mensal processado</span>
          <span className="stat-value">{kzShort(metrics.gmv)}</span>
        </div>
      </div>
    </section>
  );
}

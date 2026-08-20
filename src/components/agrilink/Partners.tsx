import { Fuel, Handshake, Landmark, Smartphone, Store, Truck, User, Users } from "lucide-react";

const partners = [
  {
    icon: Smartphone,
    name: "Unitel Money",
    role: "Liquidação instantânea e rede de agentes de cash-out no interior.",
  },
  {
    icon: Smartphone,
    name: "Afrimoney",
    role: "Carteira alternativa e cobertura complementar em zonas rurais.",
  },
  {
    icon: Landmark,
    name: "EMIS / Multicaixa Express",
    role: "Pagamentos de compradores formais e reconciliação bancária.",
  },
  {
    icon: Fuel,
    name: "TotalEnergies Angola",
    role: "Combustível e pontos logísticos ao longo do corredor até Luanda.",
  },
];

const segments = [
  { icon: User, name: "Produtores", role: "Fazendas familiares e médias que precisam de escoamento e pagamento garantido." },
  { icon: Store, name: "Compradores formais", role: "Supermercados, hotéis e indústria com contratos e volumes previsíveis." },
  { icon: Users, name: "Compradores informais", role: "Quitandeiras e revendedores dos mercados de Luanda." },
  { icon: Truck, name: "Motoristas", role: "Frota parceira remunerada por caixa transportada no corredor." },
];

export function Partners() {
  return (
    <section id="parcerias" className="section">
      <header className="section-head">
        <p className="kicker">Segmentos e parcerias</p>
        <h2 className="section-title">Quem torna o corredor possível</h2>
        <p className="section-lead">
          A AgriLink não constrói infraestrutura: liga a que já existe em Angola.
        </p>
      </header>

      <h3 className="subhead">
        <Handshake className="size-4" /> Parceiros-chave
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {partners.map((p) => (
          <article key={p.name} className="card">
            <span className="icon-chip">
              <p.icon className="size-5" />
            </span>
            <h4 className="mt-3 font-semibold">{p.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{p.role}</p>
          </article>
        ))}
      </div>

      <h3 className="subhead mt-8">
        <Users className="size-4" /> Segmentos de clientes
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {segments.map((s) => (
          <article key={s.name} className="card card-tinted">
            <span className="icon-chip">
              <s.icon className="size-5" />
            </span>
            <h4 className="mt-3 font-semibold">{s.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{s.role}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

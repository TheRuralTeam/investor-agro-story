import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SCENARIOS,
  buildPlan,
  monthMetrics,
  type Inputs,
  type ScenarioKey,
} from "./model";

const STORAGE_KEY = "agrilink-financial-model-v1";

type State = { scenario: ScenarioKey; inputs: Record<ScenarioKey, Inputs> };

const defaultState = (): State => ({
  scenario: "base",
  inputs: {
    conservador: { ...SCENARIOS.conservador.inputs },
    base: { ...SCENARIOS.base.inputs },
    otimista: { ...SCENARIOS.otimista.inputs },
  },
});

interface Ctx {
  scenario: ScenarioKey;
  setScenario: (s: ScenarioKey) => void;
  inputs: Inputs;
  setInput: (key: keyof Inputs, value: number) => void;
  resetScenario: () => void;
  plan: ReturnType<typeof buildPlan>;
  metrics: ReturnType<typeof monthMetrics>;
  presenting: boolean;
  setPresenting: (v: boolean) => void;
}

const AgriCtx = createContext<Ctx | null>(null);

export function AgriProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(defaultState);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        const base = defaultState();
        setState({
          scenario: parsed.scenario ?? base.scenario,
          inputs: {
            conservador: { ...base.inputs.conservador, ...parsed.inputs?.conservador },
            base: { ...base.inputs.base, ...parsed.inputs?.base },
            otimista: { ...base.inputs.otimista, ...parsed.inputs?.otimista },
          },
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const inputs = state.inputs[state.scenario];

  const value = useMemo<Ctx>(
    () => ({
      scenario: state.scenario,
      setScenario: (s) => setState((p) => ({ ...p, scenario: s })),
      inputs,
      setInput: (key, val) =>
        setState((p) => ({
          ...p,
          inputs: {
            ...p.inputs,
            [p.scenario]: { ...p.inputs[p.scenario], [key]: val },
          },
        })),
      resetScenario: () =>
        setState((p) => ({
          ...p,
          inputs: { ...p.inputs, [p.scenario]: { ...SCENARIOS[p.scenario].inputs } },
        })),
      plan: buildPlan(inputs),
      metrics: monthMetrics(inputs, inputs.caixasMes),
      presenting,
      setPresenting,
    }),
    [state, inputs, presenting],
  );

  return <AgriCtx.Provider value={value}>{children}</AgriCtx.Provider>;
}

export function useAgri() {
  const ctx = useContext(AgriCtx);
  if (!ctx) throw new Error("useAgri must be used inside AgriProvider");
  return ctx;
}

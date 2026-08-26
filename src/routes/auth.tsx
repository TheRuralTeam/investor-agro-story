import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/agrilink-logo.png.asset.json";

const searchSchema = z.object({ pending: z.boolean().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — AgriLink Plano Financeiro" },
      {
        name: "description",
        content:
          "Acesso reservado à plataforma financeira da AgriLink. Inicie sessão ou peça acesso ao administrador.",
      },
      { property: "og:title", content: "Entrar — AgriLink" },
      {
        property: "og:description",
        content: "Área privada do modelo financeiro AgriLink.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "A palavra-passe deve ter pelo menos 6 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { pending } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(
    pending ? "A sua conta aguarda aprovação do administrador." : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            email: parsed.data.email,
            full_name: name.trim().slice(0, 120) || null,
            status: "pending",
          });
        }
        setMsg("Registo criado. O administrador tem de aprovar o seu acesso.");
        setMode("login");
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (err) throw err;
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", data.user.id)
          .maybeSingle();
        if (!profile || profile.status !== "approved") {
          await supabase.auth.signOut();
          setMsg("A sua conta aguarda aprovação do administrador.");
          return;
        }
        await navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o pedido.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <img src={logo.url} alt="AgriLink" className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-center text-xl font-semibold">
          {mode === "login" ? "Entrar na plataforma" : "Pedir acesso"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Plataforma privada do plano financeiro AgriLink.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <input
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="Nome completo"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Palavra-passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
            {mode === "login" ? "Entrar" : "Criar pedido de acesso"}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Não tem conta? Pedir acesso" : "Já tenho conta — entrar"}
        </button>
      </div>
    </main>
  );
}

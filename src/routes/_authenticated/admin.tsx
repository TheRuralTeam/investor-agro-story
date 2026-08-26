import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Check, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Utilizadores — AgriLink" },
      {
        name: "description",
        content: "Aprovação e promoção de utilizadores da plataforma financeira AgriLink.",
      },
      { property: "og:title", content: "Gestão de utilizadores — AgriLink" },
      {
        property: "og:description",
        content: "Aprovar, rejeitar e promover utilizadores a administrador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

interface Row {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  isAdmin: boolean;
}

function AdminPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: auth.user.id,
      _role: "admin",
    });
    setAllowed(Boolean(isAdmin));
    if (!isAdmin) return;
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, status").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    setRows((profiles ?? []).map((p) => ({ ...p, isAdmin: adminIds.has(p.id) })));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusy(true);
    await supabase
      .from("profiles")
      .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
      .eq("id", id);
    await load();
    setBusy(false);
  }

  async function promote(id: string) {
    setBusy(true);
    await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    await load();
    setBusy(false);
  }

  if (allowed === false) {
    return (
      <main className="p-10">
        <p className="text-sm text-muted-foreground">Área reservada a administradores.</p>
        <Link to="/" className="text-sm underline">
          Voltar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Utilizadores</h1>
        <div className="flex gap-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              await navigate({ to: "/auth" });
            }}
          >
            Terminar sessão
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.full_name ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.status}
                  {r.isAdmin && " · admin"}
                </td>
                <td className="flex flex-wrap gap-2 px-3 py-2">
                  {r.status !== "approved" && (
                    <Button size="sm" disabled={busy} onClick={() => setStatus(r.id, "approved")}>
                      <Check className="size-4" /> Aprovar
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setStatus(r.id, "rejected")}
                    >
                      <X className="size-4" /> Rejeitar
                    </Button>
                  )}
                  {!r.isAdmin && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => promote(r.id)}>
                      <ShieldCheck className="size-4" /> Promover
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={4}>
                  Sem utilizadores registados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

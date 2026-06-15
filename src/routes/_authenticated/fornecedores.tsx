import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — Pregão Bebidas" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["fornecedores", q],
    queryFn: async () => {
      let query = supabase
        .from("fornecedores")
        .select("CL_CODIGO, CL_NOME, CL_NOMFAN, CL_CIDADE, CL_UF, CL_FONE, CL_CONTATO")
        .order("CL_NOME")
        .limit(100);
      if (q.trim()) {
        const term = q.trim();
        query = query.or(`CL_NOME.ilike.%${term}%,CL_NOMFAN.ilike.%${term}%,CL_CIDADE.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-primary/70">Cadastro</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Fornecedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lista de fornecedores cadastrados.</p>
      </div>
      <Input placeholder="Buscar por nome ou cidade…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Razão social</th>
                <th className="p-3">Fantasia</th>
                <th className="p-3">Cidade/UF</th>
                <th className="p-3">Contato</th>
                <th className="p-3">Fone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!isLoading && !data?.length && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum fornecedor.</td></tr>
              )}
              {data?.map((f) => (
                <tr key={f.CL_CODIGO} className="hover:bg-accent/10">
                  <td className="p-3 font-mono text-xs">{f.CL_CODIGO}</td>
                  <td className="p-3 font-medium">{f.CL_NOME}</td>
                  <td className="p-3 text-muted-foreground">{f.CL_NOMFAN ?? "—"}</td>
                  <td className="p-3">{[f.CL_CIDADE, f.CL_UF].filter(Boolean).join("/") || "—"}</td>
                  <td className="p-3">{f.CL_CONTATO ?? "—"}</td>
                  <td className="p-3">{f.CL_FONE ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

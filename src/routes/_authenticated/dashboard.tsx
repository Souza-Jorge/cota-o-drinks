import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Pregão Bebidas" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [prod, forn, cot] = await Promise.all([
        supabase.from("products").select("codigo", { count: "exact", head: true }),
        supabase.from("fornecedores").select("CL_CODIGO", { count: "exact", head: true }),
        supabase.from("cotacoes").select("id", { count: "exact", head: true }),
      ]);
      return {
        produtos: prod.count ?? 0,
        fornecedores: forn.count ?? 0,
        cotacoes: cot.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-primary/70">Visão geral</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o catálogo, fornecedores e cotações em andamento.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Package} label="Produtos cadastrados" value={stats?.produtos ?? "—"} accent="primary" />
        <StatCard icon={Truck} label="Fornecedores" value={stats?.fornecedores ?? "—"} accent="accent" />
        <StatCard icon={FileText} label="Cotações criadas" value={stats?.cotacoes ?? "—"} accent="primary" />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent: "primary" | "accent";
}) {
  return (
    <Card className="border-border/60 transition-shadow hover:shadow-md hover:shadow-primary/5">
      <CardContent className="flex items-center gap-4 p-6">
        <div
          className={
            "flex h-14 w-14 items-center justify-center rounded-2xl " +
            (accent === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-accent/15 text-accent-foreground")
          }
        >
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

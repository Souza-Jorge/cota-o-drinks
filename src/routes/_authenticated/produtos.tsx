import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { buildProdutoPagedQuery } from "@/lib/produto-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Pregão Bebidas" }] }),
  validateSearch: zodValidator(searchSchema),
  component: ProdutosPage,
});

function ProdutosPage() {
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/produtos" });

  const [input, setInput] = useState(q);
  const debounced = useDebouncedValue(input, 300);

  useEffect(() => {
    if (debounced === q) return;
    navigate({ search: { q: debounced, page: 1 }, replace: true });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isFetching } = useQuery({
    queryKey: ["produtos", q, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, count, error } = await buildProdutoPagedQuery(
        q, page, PAGE_SIZE,
        "codigo, name, barcode, unit, pack, stock_quantity, sale_price, category_name",
      );
      if (error) throw error;
      return { rows: (data as any[]) ?? [], total: count ?? 0 };
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    navigate({ search: { q, page: next } });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-primary/70">Catálogo</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catálogo de produtos cadastrados.</p>
      </div>
      <Input
        placeholder="Buscar por nome, código ou EAN…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Un.</th>
                <th className="p-3 text-right">Estoque</th>
                <th className="p-3 text-right">Preço venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isFetching && !data && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {data && data.rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum produto.</td></tr>
              )}
              {data?.rows.map((p) => (
                <tr key={p.codigo} className="hover:bg-accent/10">
                  <td className="p-3 font-mono text-xs">{p.codigo}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.category_name ?? "—"}</td>
                  <td className="p-3">{p.unit ?? "—"}</td>
                  <td className="p-3 text-right">{p.stock_quantity ?? 0}</td>
                  <td className="p-3 text-right font-medium">{brl(p.sale_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 p-3 text-sm">
          <div className="text-muted-foreground">
            {total === 0 ? "Sem resultados" : `Mostrando ${from}–${to} de ${total}`}
            {isFetching && total > 0 && " · atualizando…"}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => goTo(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => goTo(page + 1)} disabled={page >= totalPages}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

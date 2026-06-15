import { supabase } from "@/lib/supabase";

export type SupplierDTO = { codigo: number; nome: string };
export type ProductDTO = {
  codigo: number;
  name: string;
  packageLabel: string;
  pack: number;
  stock: number;
  barcode: string;
};
export type PriceCmpDTO = { last: number | null; previous: number | null };

export async function listSuppliersClient(): Promise<SupplierDTO[]> {
  const { data, error } = await supabase
    .from("fornecedores")
    .select('"CL_CODIGO","CL_NOME"')
    .order('"CL_NOME"', { ascending: true });
  if (error) {
    console.error("[listSuppliersClient] supabase error", error);
    throw new Error(error.message);
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({ codigo: Number(r.CL_CODIGO), nome: r.CL_NOME }));
}

export async function searchProductsClient(term: string): Promise<ProductDTO[]> {
  const t = term.trim();
  if (!t) return [];
  let query = supabase
    .from("products")
    .select("codigo, name, unit, pack, stock_quantity, barcode")
    .limit(10);
  const asNumber = Number(t);
  if (!Number.isNaN(asNumber) && /^\d+$/.test(t)) {
    query = query.or(`codigo.eq.${asNumber},barcode.eq.${t}`);
  } else {
    query = query.ilike("name", `%${t}%`);
  }
  const { data, error } = await query;
  if (error) {
    console.error("[searchProductsClient] supabase error", error);
    throw new Error(error.message);
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((r: any) => ({
    codigo: Number(r.codigo),
    name: r.name,
    packageLabel: r.unit ?? "",
    pack: Number(r.pack ?? 0),
    stock: Number(r.stock_quantity ?? 0),
    barcode: r.barcode ?? "",
  }));
}

export async function getPriceComparisonClient(
  produtoCodigo: number,
  fornecedorCodigo: number | null,
): Promise<PriceCmpDTO> {
  let q = supabase
    .from("purchase_history")
    .select("preco_liquido_unitario, fornecedor_codigo, data_compra")
    .eq("produto_codigo", produtoCodigo)
    .order("data_compra", { ascending: false })
    .limit(2);
  if (fornecedorCodigo != null) q = q.eq("fornecedor_codigo", fornecedorCodigo);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const list = data ?? [];
  return {
    last: list[0]?.preco_liquido_unitario != null ? Number(list[0].preco_liquido_unitario) : null,
    previous: list[1]?.preco_liquido_unitario != null ? Number(list[1].preco_liquido_unitario) : null,
  };
}

type SupplierLineInput = {
  supplierCodigo: number;
  grossUnit: number;
  discountType: "BRL" | "PCT";
  discount: number;
};
type ItemInput = {
  produtoCodigo: number;
  productName: string;
  packageLabel: string;
  pack: number;
  stock: number;
  quantity: number;
  lines: SupplierLineInput[];
  winnerSupplierCodigo: number | null;
};
type SupplierTermsInput = {
  supplierCodigo: number;
  freight: number;
  orderDiscount: number;
};
export type SaveDraftInput = {
  quoteId: string | null | undefined;
  header: {
    date: string;
    notes: string;
    paymentTerms: string;
    deliveryDate: string | null;
  };
  supplierTerms: SupplierTermsInput[];
  items: ItemInput[];
};

function computeNet(grossUnit: number, discount: number, type: "BRL" | "PCT") {
  if (type === "PCT") return grossUnit - (grossUnit * discount) / 100;
  return grossUnit - discount;
}

export async function saveQuoteDraftClient(input: SaveDraftInput): Promise<{ quoteId: string }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Sessão expirada. Faça login novamente.");
  const userId = userRes.user.id;

  let quoteId = input.quoteId ?? null;
  if (quoteId) {
    const { error } = await supabase
      .from("cotacoes")
      .update({
        data_cotacao: input.header.date.slice(0, 10),
        observacao: input.header.notes,
        condicoes_pagamento: input.header.paymentTerms,
        previsao_entrega: input.header.deliveryDate ? input.header.deliveryDate.slice(0, 10) : null,
        status: "rascunho",
      })
      .eq("id", quoteId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  } else {
    const { data: ins, error } = await supabase
      .from("cotacoes")
      .insert({
        user_id: userId,
        data_cotacao: input.header.date.slice(0, 10),
        observacao: input.header.notes,
        condicoes_pagamento: input.header.paymentTerms,
        previsao_entrega: input.header.deliveryDate ? input.header.deliveryDate.slice(0, 10) : null,
        status: "rascunho",
        fornecedor_codigo: null,
        frete: 0,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    quoteId = (ins as any).id;
  }

  {
    const { error: delErr } = await supabase
      .from("cotacao_fornecedores")
      .delete()
      .eq("cotacao_id", quoteId!);
    if (delErr) throw new Error(delErr.message);
    if (input.supplierTerms.length > 0) {
      const { error: insErr } = await supabase.from("cotacao_fornecedores").insert(
        input.supplierTerms.map((t) => ({
          cotacao_id: quoteId!,
          fornecedor_codigo: t.supplierCodigo,
          frete: t.freight,
          desconto_pedido: t.orderDiscount,
        })) as any,
      );
      if (insErr) throw new Error(insErr.message);
    }
  }

  {
    const { error: delErr } = await supabase
      .from("cotacao_itens")
      .delete()
      .eq("cotacao_id", quoteId!);
    if (delErr) throw new Error(delErr.message);
    const rows: any[] = [];
    input.items.forEach((it) => {
      it.lines.forEach((line) => {
        if (line.grossUnit <= 0) return;
        const net = computeNet(line.grossUnit, line.discount, line.discountType);
        rows.push({
          cotacao_id: quoteId,
          produto_codigo: it.produtoCodigo,
          fornecedor_codigo: line.supplierCodigo,
          produto_nome: it.productName,
          embalagem: it.packageLabel,
          pack: it.pack,
          estoque_snapshot: it.stock,
          quantidade: it.quantity,
          preco_unitario: line.grossUnit,
          desconto_tipo: line.discountType === "PCT" ? "percentual" : "valor",
          desconto_valor: line.discount,
          preco_final: net,
          total_bruto: it.quantity * line.grossUnit,
          total_liquido: it.quantity * net,
          is_vencedor: it.winnerSupplierCodigo === line.supplierCodigo,
        });
      });
    });
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("cotacao_itens").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
  }

  return { quoteId: quoteId! };
}

export type CloseWinner = {
  produtoCodigo: number;
  fornecedorCodigo: number;
  quantidade: number;
  precoLiquidoUnit: number;
};

export async function closeQuoteClient(
  quoteId: string,
  winners: CloseWinner[],
): Promise<{ ok: true }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Sessão expirada. Faça login novamente.");
  const userId = userRes.user.id;

  const { error: updErr } = await supabase
    .from("cotacoes")
    .update({ status: "fechada" })
    .eq("id", quoteId)
    .eq("user_id", userId);
  if (updErr) throw new Error(updErr.message);

  if (winners.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const rows = winners.map((w) => ({
      user_id: userId,
      cotacao_id: quoteId,
      produto_codigo: w.produtoCodigo,
      fornecedor_codigo: w.fornecedorCodigo,
      quantidade: w.quantidade,
      preco_unitario: w.precoLiquidoUnit,
      preco_liquido_unitario: w.precoLiquidoUnit,
      data_compra: today,
    }));
    const { error: insErr } = await supabase.from("purchase_history").insert(rows as any);
    if (insErr) throw new Error(insErr.message);
  }
  return { ok: true };
}
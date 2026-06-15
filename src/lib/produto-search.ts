import { supabase } from "@/lib/supabase";

function applyNameTokens(q: any, termo: string) {
  const tokens = termo.trim().split(/\s+/).filter(Boolean);
  for (const tk of tokens) {
    q = q.ilike("name", `%${tk}%`);
  }
  return q;
}

export function buildProdutoQuery(termo: string, columns = "codigo, name", limit = 15) {
  const t = termo.trim();
  let q = supabase.from("products").select(columns).limit(limit);
  if (!t) return q;
  if (/^\d+$/.test(t)) {
    q = q.or(`codigo.eq.${t},barcode.eq.${t}`);
  } else {
    q = applyNameTokens(q, t);
  }
  return q;
}

export function buildProdutoPagedQuery(
  termo: string,
  page: number,
  pageSize: number,
  columns = "codigo, name",
) {
  const t = termo.trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let q = supabase
    .from("products")
    .select(columns, { count: "exact" })
    .order("name")
    .range(from, to);
  if (!t) return q;
  if (/^\d+$/.test(t)) {
    q = q.or(`codigo.eq.${t},barcode.eq.${t}`);
  } else {
    q = applyNameTokens(q, t);
  }
  return q;
}
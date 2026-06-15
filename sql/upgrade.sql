-- =============================================================
-- Pregão Bebidas — Upgrade idempotente do schema
-- Rode no SQL Editor do Supabase externo (ztnyvrmiwmrqhquavfhl).
-- Seguro para re-execução: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- =============================================================

-- ---------- 1. Funções utilitárias ----------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'nome', new.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- ---------- 2. profiles ---------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 3. cotacoes (upgrade) -----------------------------
CREATE TABLE IF NOT EXISTS public.cotacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor_codigo   bigint,
  numero              serial,
  data_cotacao        date NOT NULL DEFAULT current_date,
  status              text NOT NULL DEFAULT 'rascunho',
  observacao          text,
  condicoes_pagamento text,
  previsao_entrega    date,
  frete               numeric(14,2) NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS condicoes_pagamento text;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS previsao_entrega    date;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS frete               numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.cotacoes ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.cotacoes ALTER COLUMN fornecedor_codigo DROP NOT NULL;

-- expandir o CHECK de status para aceitar 'rascunho'
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'cotacoes'
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) ILIKE '%status%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.cotacoes DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.cotacoes
  ADD CONSTRAINT cotacoes_status_check
  CHECK (status IN ('rascunho','aberta','fechada','cancelada'));

CREATE INDEX IF NOT EXISTS idx_cotacoes_user       ON public.cotacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_fornecedor ON public.cotacoes(fornecedor_codigo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacoes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cotacoes_numero_seq TO authenticated;
GRANT ALL ON public.cotacoes TO service_role;

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cotacoes_all_own" ON public.cotacoes;
CREATE POLICY "cotacoes_all_own" ON public.cotacoes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_cotacoes_updated ON public.cotacoes;
CREATE TRIGGER trg_cotacoes_updated BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- 4. cotacao_fornecedores ---------------------------
CREATE TABLE IF NOT EXISTS public.cotacao_fornecedores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id        uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  fornecedor_codigo bigint NOT NULL,
  frete             numeric NOT NULL DEFAULT 0,
  desconto_pedido   numeric NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_id, fornecedor_codigo)
);

CREATE INDEX IF NOT EXISTS idx_cot_forn_cotacao ON public.cotacao_fornecedores(cotacao_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_fornecedores TO authenticated;
GRANT ALL ON public.cotacao_fornecedores TO service_role;

ALTER TABLE public.cotacao_fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cot_forn_all_via_cotacao ON public.cotacao_fornecedores;
CREATE POLICY cot_forn_all_via_cotacao ON public.cotacao_fornecedores
  FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_fornecedores.cotacao_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_fornecedores.cotacao_id AND c.user_id = auth.uid()));

-- ---------- 5. cotacao_itens (upgrade) ------------------------
CREATE TABLE IF NOT EXISTS public.cotacao_itens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id      uuid NOT NULL REFERENCES public.cotacoes(id) ON DELETE CASCADE,
  produto_codigo  integer NOT NULL,
  quantidade      numeric(14,3) NOT NULL DEFAULT 1,
  preco_unitario  numeric(14,4) NOT NULL DEFAULT 0,
  desconto_tipo   text NOT NULL DEFAULT 'percentual' CHECK (desconto_tipo IN ('percentual','valor')),
  desconto_valor  numeric(14,4) NOT NULL DEFAULT 0,
  preco_final     numeric(14,4) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS produto_nome       text;
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS embalagem          text;
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS pack               numeric(14,3);
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS estoque_snapshot   numeric(14,3);
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS total_bruto        numeric(14,4);
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS total_liquido      numeric(14,4);
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS fornecedor_codigo  bigint;
ALTER TABLE public.cotacao_itens ADD COLUMN IF NOT EXISTS is_vencedor        boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_itens_cotacao    ON public.cotacao_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto    ON public.cotacao_itens(produto_codigo);
CREATE INDEX IF NOT EXISTS idx_cot_itens_cot_prod ON public.cotacao_itens(cotacao_id, produto_codigo);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cot_itens_unique_cot_prod_forn') THEN
    ALTER TABLE public.cotacao_itens
      ADD CONSTRAINT cot_itens_unique_cot_prod_forn UNIQUE (cotacao_id, produto_codigo, fornecedor_codigo);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cotacao_itens TO authenticated;
GRANT ALL ON public.cotacao_itens TO service_role;

ALTER TABLE public.cotacao_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itens_all_via_cotacao" ON public.cotacao_itens;
CREATE POLICY "itens_all_via_cotacao" ON public.cotacao_itens
  FOR ALL
  USING      (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cotacoes c WHERE c.id = cotacao_itens.cotacao_id AND c.user_id = auth.uid()));

-- ---------- 6. purchase_history -------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  produto_codigo         integer NOT NULL,
  fornecedor_codigo      bigint NOT NULL,
  cotacao_id             uuid REFERENCES public.cotacoes(id) ON DELETE SET NULL,
  preco_unitario         numeric(14,4) NOT NULL,
  preco_liquido_unitario numeric(14,4) NOT NULL,
  quantidade             numeric(14,3) NOT NULL DEFAULT 1,
  data_compra            date NOT NULL DEFAULT current_date,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ph_produto_data ON public.purchase_history(produto_codigo, data_compra DESC);
CREATE INDEX IF NOT EXISTS idx_ph_user         ON public.purchase_history(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_history TO authenticated;
GRANT ALL ON public.purchase_history TO service_role;

ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_history_all_own" ON public.purchase_history;
CREATE POLICY "purchase_history_all_own" ON public.purchase_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- 7. RLS de leitura: products / fornecedores --------
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_read_authenticated" ON public.products;
CREATE POLICY "products_read_authenticated" ON public.products
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.products TO authenticated;

ALTER TABLE public.fornecedores  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fornecedores_read_authenticated" ON public.fornecedores;
CREATE POLICY "fornecedores_read_authenticated" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.fornecedores TO authenticated;

-- ---------- 8. View: melhor preço atual -----------------------
CREATE OR REPLACE VIEW public.vw_melhor_preco_atual AS
SELECT DISTINCT ON (i.produto_codigo)
  i.produto_codigo,
  c.fornecedor_codigo,
  i.preco_final,
  i.preco_unitario,
  i.desconto_tipo,
  i.desconto_valor,
  c.data_cotacao,
  c.id AS cotacao_id
FROM public.cotacao_itens i
JOIN public.cotacoes c ON c.id = i.cotacao_id
WHERE c.status IN ('aberta','fechada');

ALTER VIEW public.vw_melhor_preco_atual SET (security_invoker = on);
GRANT SELECT ON public.vw_melhor_preco_atual TO authenticated;

-- ---------- 9. Reload do PostgREST ----------------------------
NOTIFY pgrst, 'reload schema';
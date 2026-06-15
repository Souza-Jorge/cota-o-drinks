## Diagnóstico

O projeto original "Cotação Bebidas" usa **dois backends Supabase** distintos — algo que foi perdido neste clone:

| Backend | Usado para |
|---|---|
| **Supabase interno** (Lovable Cloud do projeto) | login/usuário, `cotacoes`, `cotacao_fornecedores`, `cotacao_itens`, `purchase_history`, `profiles` |
| **Supabase externo** (`ztnyvrmiwmrqhquavfhl`) | leitura de `fornecedores` e `products` (catálogo) |

No clone atual, **tudo aponta para o Supabase externo**. Esse banco externo:
- não tem as tabelas `cotacoes` / `cotacao_fornecedores` / `cotacao_itens` / `purchase_history` para o seu usuário, ou
- mesmo se tiver, as policies de RLS escopadas em `auth.uid()` enxergam um usuário diferente do que está logado.

Resultado: `searchProductsClient` e `listSuppliersClient` funcionam (são leituras no externo), mas **Salvar rascunho** e **Fechar cotação** falham porque tentam gravar em tabelas que pertencem ao banco interno.

## O que vou fazer

1. **Ativar o Supabase interno do projeto** (Lovable Cloud) e portar a estrutura que existe no original:
   - Tabelas: `profiles`, `cotacoes`, `cotacao_fornecedores`, `cotacao_itens`, `purchase_history`.
   - Funções/trigger: `handle_new_user`, `touch_updated_at`, `on_auth_user_created`.
   - RLS por `auth.uid()` + GRANTs para `authenticated` e `service_role` (sem `anon`).
   - View `purchase_history_view` se necessária para o badge de histórico.

2. **Refatorar os clients** em `src/lib/`:
   - Manter `src/lib/supabase.ts` como **client externo** (somente catálogo: `fornecedores`, `products`).
   - Usar `@/integrations/supabase/client` (interno, gerado pelo Lovable Cloud) para **autenticação** e **cotações**.

3. **Atualizar `src/lib/quotes.api.ts`** seguindo o padrão do original:
   - `listSuppliersClient` e `searchProductsClient` → client externo.
   - `getPriceComparisonClient`, `saveQuoteDraftClient`, `closeQuoteClient` → client interno.

4. **Atualizar `src/lib/auth.tsx`** para usar o client interno (login/logout/sessão no Lovable Cloud, não no externo).

5. **Telas de Login/Signup**: continuar funcionando — apenas trocam o client por trás.

6. **Verificação**:
   - Login com um novo usuário do Lovable Cloud.
   - Fluxo completo: adicionar fornecedores → buscar produto no catálogo externo → preencher preços → Salvar rascunho (deve persistir em `cotacoes` no interno) → Fechar cotação (deve gravar `purchase_history`).
   - Confirmar no painel do Cloud que as linhas aparecem.

## Pré-requisito (ação sua)

O Lovable Cloud está **desabilitado** para a sua conta neste projeto. Para eu seguir, você precisa habilitar:

> **Connectors → Lovable Cloud → Tool Permissions** → marque "Enable Lovable Cloud" como **Always allow** ou **Ask each time**.

Depois é só me responder "pode seguir" que eu executo todos os passos acima em um único build.

### Alternativa (não recomendada)

Criar as tabelas de cotação **dentro do Supabase externo compartilhado**. Evito propor isso porque aquele banco é a fonte de catálogo de outros projetos seus e misturar dados transacionais ali pode causar conflitos de schema e RLS no futuro.

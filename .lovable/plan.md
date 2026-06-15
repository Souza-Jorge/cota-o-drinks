## Objetivo

Recriar fielmente o app **Cotação Bebidas** neste novo projeto, conectado ao **mesmo backend Supabase** já existente (URL/anon key reutilizadas — anon key é pública, segura no código). Aplicar uma **nova identidade visual** ao invés de copiar o tema atual.

Como o Lovable Cloud está desativado neste projeto, vamos seguir exatamente a estratégia do original: cliente Supabase próprio em `src/lib/supabase.ts` (não usa `@/integrations/supabase/client`).

## Escopo (cópia fiel)

Rotas:
- `/` (landing/redirect para login ou dashboard)
- `/login`, `/signup`
- `/_authenticated/dashboard`
- `/_authenticated/fornecedores`
- `/_authenticated/produtos`
- `/_authenticated/cotacoes/nova`

Domínio:
- Tipos de cotação (`QuoteItem`, `SupplierLine`, `QuoteHeaderState`, `SupplierTerms`, `PriceComparison`, etc.)
- Store da cotação (`useQuoteStore`)
- Cálculos de preço líquido, vencedor automático e resumo financeiro (`calc.ts`)
- API de cotações contra Supabase (`quotes.api.ts`)
- Busca de produtos (`produto-search.ts`)
- Auth com Supabase (`auth.tsx`)

Componentes da cotação portados 1:1:
`DecimalField`, `DiscountInput`, `PriceComparisonBadge`, `PriceHistoryBadge`, `QuoteFinancialSummary`, `QuoteHeader`, `QuoteItemCard`, `QuoteProductSearch`, `QuoteSuppliersBar`.

## Identidade visual (nova)

Antes de portar as telas, gero **3 direções de design** (HTML+Tailwind) com foco em app de cotação B2B de bebidas — densidade de dados, tabelas/cards, badges de preço, formulários numéricos rápidos. Você escolhe uma e eu aplico via tokens em `src/styles.css` (cores em `oklch`, tipografia carregada por `<link>` no `__root.tsx`, sem hardcode de cor nos componentes).

## Passos de implementação

1. **Backend Supabase**
   - Criar `src/lib/supabase.ts` com a mesma URL e anon key do projeto original.
   - Não tocar em `src/integrations/` (Cloud desativado).

2. **Estrutura de rotas TanStack Start**
   - Layout raiz mantém `__root.tsx` atual; adiciono header + `onAuthStateChange` para invalidar router.
   - Criar `src/routes/_authenticated.tsx` (gate via `supabase.auth.getUser()` com `ssr: false`).
   - Criar `login.tsx`, `signup.tsx`, `_authenticated/{dashboard,fornecedores,produtos,cotacoes.nova}.tsx`.
   - Substituir o conteúdo de `index.tsx` (placeholder atual) por landing/redirect.

3. **Portar domínio**
   - Copiar `features/quotes/{types.ts,calc.ts,useQuoteStore.ts,components/*}`.
   - Copiar `lib/{auth.tsx,format.ts,produto-search.ts,quotes.api.ts,utils.ts}` (utils já existe — só mesclar o que faltar).

4. **Direções de design + tema**
   - Gerar 3 direções com `design--create_directions`, você escolhe.
   - Aplicar tokens em `src/styles.css` (substituir paleta padrão por uma autoral).

5. **Telas**
   - Implementar as 4 telas autenticadas chamando a API portada.
   - Login/signup com formulário Supabase email+senha (mesmo método do original).

6. **Dependências**
   - Adicionar (se faltar): `@supabase/supabase-js`, `zustand` (store), `date-fns`, `sonner` (toasts) — confirmar contra `package.json` do original.

## Detalhes técnicos

- Anon key é **pública** — fica no código, sem secret.
- Sem `createServerFn` para dados de cotação: como o original chama Supabase direto do cliente com RLS, mantenho a mesma arquitetura para preservar fidelidade.
- Auth gate em `_authenticated/route.tsx` com `ssr: false` (padrão da doc TanStack + Supabase).
- Sem `useEffect+fetch` para reads iniciais — uso TanStack Query (`ensureQueryData` + `useSuspenseQuery`) onde o original usar query.
- Cada rota com `head()` próprio (título PT-BR).
- Componentes shadcn já presentes neste template são suficientes; não precisa instalar pacotes novos de UI.

## O que NÃO está incluído (confirmar se quiser)

- Migrations: as tabelas já existem no Supabase original; não recrio nada de schema.
- Edge functions: o original não usa.
- Testes automatizados.

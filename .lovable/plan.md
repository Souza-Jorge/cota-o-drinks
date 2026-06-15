## Diagnóstico

O erro `Could not find the 'condicoes_pagamento' column of 'cotacoes' in the schema cache` confirma que o Supabase externo (`ztnyvrmiwmrqhquavfhl`) **tem** a tabela `cotacoes`, mas está com uma versão antiga do schema — faltam várias colunas, tabelas (`cotacao_fornecedores`, `purchase_history`) e ajustes que o app espera.

Como esse Supabase não é o do projeto atual, não consigo rodar `migration` diretamente nele a partir daqui. A solução é eu gerar **um único SQL idempotente** com tudo que falta e você cola no **SQL Editor** do Supabase externo. Como tudo está com `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, pode rodar com segurança mesmo se algo já existir.

## O que vou criar

Um arquivo `sql/upgrade.sql` no repositório (apenas como referência — não roda no projeto), contendo, em ordem:

1. **Funções utilitárias** — `touch_updated_at`, `handle_new_user` (cria profile no signup).
2. **profiles** — tabela + RLS própria + trigger `on_auth_user_created`.
3. **cotacoes** — `ADD COLUMN IF NOT EXISTS` para `condicoes_pagamento`, `previsao_entrega`, `frete`, `updated_at`; expandir `status` para aceitar `'rascunho'`; tornar `fornecedor_codigo` opcional; trigger `updated_at`; RLS `auth.uid() = user_id`.
4. **cotacao_fornecedores** (nova) — frete e desconto por fornecedor; RLS via `cotacoes`; unique `(cotacao_id, fornecedor_codigo)`.
5. **cotacao_itens** — `ADD COLUMN IF NOT EXISTS` para `produto_nome`, `embalagem`, `pack`, `estoque_snapshot`, `total_bruto`, `total_liquido`, `fornecedor_codigo`, `is_vencedor`; índices; unique `(cotacao_id, produto_codigo, fornecedor_codigo)`; RLS via `cotacoes`.
6. **purchase_history** (nova) — histórico de compras consolidado ao fechar cotação; RLS por usuário.
7. **products / fornecedores** — habilitar RLS de leitura para `authenticated` (caso ainda não esteja).
8. **GRANTs** explícitos para `authenticated` e `service_role` em todas as tabelas `public.*` novas/alteradas (Supabase exige isso para o PostgREST enxergar as tabelas).
9. **View** `vw_melhor_preco_atual` com `security_invoker = on`.
10. **`NOTIFY pgrst, 'reload schema';`** no final para o PostgREST recarregar imediatamente e o erro de schema-cache desaparecer.

## O que muda no código

Nada substancial. Após o SQL rodar, `saveQuoteDraftClient` e `closeQuoteClient` em `src/lib/quotes.api.ts` já bate com o schema. Vou apenas:

- Trocar o `.single()` por `.maybeSingle()` no insert de `cotacoes` para mensagens de erro melhores quando RLS bloqueia.
- Adicionar tratamento amigável de erro no snackbar (exibe o texto do Postgres, não só "Erro ao salvar").

## Como você roda

1. Eu salvo o arquivo `sql/upgrade.sql` no projeto.
2. Você abre o **Supabase Studio** do projeto `ztnyvrmiwmrqhquavfhl` → **SQL Editor** → **New query** → cola o conteúdo de `sql/upgrade.sql` → **Run**.
3. Volta no app, recarrega a página, e tenta Salvar rascunho / Fechar cotação novamente.

Se algum erro de coluna ainda aparecer, me envia o texto que eu ajusto o SQL.

## Observação sobre dados existentes

A migração nova torna `cotacoes.fornecedor_codigo` opcional (era NOT NULL). Linhas existentes ficam intactas. Não há `DROP` de coluna nem de tabela — nada é destrutivo.

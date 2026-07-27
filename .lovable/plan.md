## Corrigir layout do QuoteItemCard

O card quebra em telas estreitas: o nome do produto disputa espaço com Cx/Un/Vencedor na mesma linha e fica comprimido em coluna estreita.

### Mudança em `src/features/quotes/components/QuoteItemCard.tsx`

Reorganizar o cabeçalho em duas linhas verticais e reduzir os controles. Sem alterar lógica, store, API ou a faixa de fornecedores abaixo do divider.

**Linha 1 — descrição do produto (largura total)**
- `productName` com `fontWeight: 700`, `fontSize: 14`.
- Metadados (`Cód • embalagem • Pack • Estoque`) em `variant="caption"`, `color="text.secondary"`.

**Linha 2 — controles em row, com wrap**
- `Stack direction="row" spacing={1} alignItems="flex-end" flexWrap="wrap"`.
- `Cx` e `Un`: `DecimalField` `width: 56` (era 70), label `caption`.
- `= N un`: caption abaixo do par Cx/Un.
- `Vencedor`: `FormControl` `minWidth: 160` (era 200), `Select size="small"` com `sx={{ fontSize: 13 }}`.
- `IconButton` de remover `size="small"` empurrado à direita com `ml: "auto"`.

**Remover** o `Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between"` atual que causa o squeeze.

### Resultado

```
┌──────────────────────────────────────────────┐
│ CERV SKOL 300ML RETORNAVEL                   │
│ Cód 222 • CX • Pack 24 • Estoque 21432       │
│                                              │
│ [Cx 1] [Un 0]  [Vencedor: Automático ▼]   🗑│
│ = 24 un                                      │
└──────────────────────────────────────────────┘
```

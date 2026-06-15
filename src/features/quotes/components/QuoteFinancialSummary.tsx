import {
  Box, Button, Card, CardContent, Chip, Divider, IconButton, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/SaveOutlined";
import LockIcon from "@mui/icons-material/LockOutlined";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";
import ApplyAllIcon from "@mui/icons-material/DoneAllRounded";
import { formatBRL } from "../calc";
import {
  selectSelectedTotal, selectSupplierTotals, useQuoteStore, type SupplierTotals,
} from "../useQuoteStore";
import { DecimalField } from "./DecimalField";
import { supplierColor } from "./QuoteSuppliersBar";

type Props = { onSaveDraft: () => void; onClose: () => void };

export function QuoteFinancialSummary({ onSaveDraft, onClose }: Props) {
  const state = useQuoteStore();
  const supplierCodigos = state.header.supplierCodigos;
  const supplierNames = state.header.supplierNames;
  const closed = state.header.status === "closed";

  const totals: SupplierTotals[] = supplierCodigos.map((id) => selectSupplierTotals(state, id));
  const cheapestSupplier =
    totals.filter((t) => t.subtotalGross > 0).sort((a, b) => a.grandTotal - b.grandTotal)[0]?.supplierCodigo ?? null;

  const selected = selectSelectedTotal(state);

  return (
    <Card elevation={3} sx={{ borderTop: 4, borderColor: "primary.main" }}>
      <CardContent sx={{ px: 1.5, py: 2, "&:last-child": { pb: 2 } }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Comparativo de fornecedores</Typography>

        {supplierCodigos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Adicione fornecedores para ver o comparativo.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {totals.map((t) => {
              const name = supplierNames[t.supplierCodigo] ?? `Cód ${t.supplierCodigo}`;
              const isCheapest = cheapestSupplier === t.supplierCodigo;
              const color = supplierColor(supplierCodigos, t.supplierCodigo);
              const terms = state.header.terms.find((x) => x.supplierCodigo === t.supplierCodigo);
              return (
                <Box
                  key={t.supplierCodigo}
                  sx={{
                    border: 2,
                    borderColor: isCheapest ? "success.main" : "divider",
                    borderRadius: 1.5,
                    p: 1.5,
                    bgcolor: isCheapest ? "success.50" : "background.paper",
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Chip size="small" label={name} color={color} variant="outlined" />
                      {isCheapest && (
                        <Tooltip title="Menor total geral">
                          <EmojiEventsIcon fontSize="small" color="success" />
                        </Tooltip>
                      )}
                    </Stack>
                    <Tooltip title="Definir como vencedor de todos os itens">
                      <IconButton size="small" onClick={() => state.setGlobalWinner(t.supplierCodigo)}>
                        <ApplyAllIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Stack spacing={0.5}>
                    <Row label="Subtotal bruto" value={formatBRL(t.subtotalGross)} />
                    <Row label="- Desconto itens" value={formatBRL(t.itemsDiscount)} muted />
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">Desc. pedido</Typography>
                      <DecimalField
                        value={terms?.orderDiscount ?? 0}
                        onChange={(n) => state.setSupplierTerms(t.supplierCodigo, { orderDiscount: n })}
                        min={0}
                        max={100}
                        endAdornment="%"
                        fullWidth
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">Frete</Typography>
                      <DecimalField
                        value={t.freight}
                        onChange={(n) => state.setSupplierTerms(t.supplierCodigo, { freight: n })}
                        min={0}
                        fullWidth
                      />
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 1 }} />
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
                    <Typography variant="subtitle2">Total</Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800, color: isCheapest ? "success.dark" : "text.primary" }}
                    >
                      {formatBRL(t.grandTotal)}
                    </Typography>
                  </Stack>
                  {t.missingItems > 0 && (
                    <Typography variant="caption" color="warning.main">
                      {t.missingItems} item(ns) sem preço
                    </Typography>
                  )}
                </Box>
              );
            })}

            <Divider />

            <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "primary.50", border: 2, borderColor: "primary.main" }}>
              <Typography variant="caption" color="text.secondary">
                Total da seleção (vencedor por item)
              </Typography>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <Typography variant="body2" color="text.secondary">{selected.itemsCount} un.</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main" }}>
                  {formatBRL(selected.grandTotal)}
                </Typography>
              </Stack>
              {selected.unresolvedItems > 0 && (
                <Typography variant="caption" color="warning.main">
                  {selected.unresolvedItems} item(ns) sem fornecedor com preço.
                </Typography>
              )}
            </Box>
          </Stack>
        )}

        <TextField
          label="Observações"
          value={state.header.notes}
          onChange={(e) => state.setHeader({ notes: e.target.value })}
          multiline
          minRows={2}
          size="small"
          fullWidth
          disabled={closed}
          sx={{ mt: 2 }}
        />

        <Stack spacing={1} sx={{ mt: 2 }}>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={onSaveDraft} disabled={closed} fullWidth>
            Salvar rascunho
          </Button>
          <Button variant="contained" color="primary" startIcon={<LockIcon />} onClick={onClose} disabled={closed} fullWidth>
            {closed ? "Cotação fechada" : "Fechar cotação"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: muted ? 400 : 600 }}>{value}</Typography>
    </Stack>
  );
}

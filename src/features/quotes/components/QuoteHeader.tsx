import { Chip, Grid, Stack, TextField, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { useQuoteStore } from "../useQuoteStore";

export function QuoteHeader() {
  const { header, setHeader } = useQuoteStore();

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6">Cabeçalho da cotação</Typography>
        <Chip
          label={header.status === "draft" ? "Rascunho" : "Fechada"}
          color={header.status === "draft" ? "warning" : "success"}
          size="small"
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <DatePicker
            label="Data da cotação"
            value={new Date(header.date)}
            onChange={(d) => d && setHeader({ date: d.toISOString() })}
            slotProps={{ textField: { fullWidth: true, size: "small" } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DatePicker
            label="Previsão de entrega"
            value={header.deliveryDate ? new Date(header.deliveryDate) : null}
            onChange={(d) => setHeader({ deliveryDate: d ? d.toISOString() : null })}
            slotProps={{ textField: { fullWidth: true, size: "small" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Condições de pagamento"
            value={header.paymentTerms}
            onChange={(e) => setHeader({ paymentTerms: e.target.value })}
            placeholder="Ex.: 28/35/42 dias"
            size="small"
            fullWidth
          />
        </Grid>
      </Grid>
    </Stack>
  );
}

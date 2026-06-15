import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert, AppBar, Box, Button, Container, Drawer, Fab, Grid, Paper, Snackbar,
  Stack, Toolbar, Typography, useMediaQuery,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/ReceiptLongOutlined";
import { muiTheme } from "@/theme/mui-theme";
import { QuoteHeader } from "@/features/quotes/components/QuoteHeader";
import { QuoteSuppliersBar } from "@/features/quotes/components/QuoteSuppliersBar";
import { QuoteProductSearch } from "@/features/quotes/components/QuoteProductSearch";
import { QuoteItemCard } from "@/features/quotes/components/QuoteItemCard";
import { QuoteFinancialSummary } from "@/features/quotes/components/QuoteFinancialSummary";
import { useQuoteStore, selectWinners } from "@/features/quotes/useQuoteStore";
import { saveQuoteDraftClient, closeQuoteClient } from "@/lib/quotes.api";

export const Route = createFileRoute("/_authenticated/cotacoes/nova")({
  head: () => ({ meta: [{ title: "Nova cotação — Pregão Bebidas" }] }),
  component: NewQuotePage,
  errorComponent: NewQuoteErrorComponent,
});

function NewQuoteErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        Erro ao carregar a tela: {error?.message ?? "Erro desconhecido"}
      </Alert>
      <Button variant="contained" onClick={() => { reset(); router.invalidate(); }}>
        Tentar novamente
      </Button>
    </Container>
  );
}

function NewQuotePage() {
  const items = useQuoteStore((s) => s.items);
  const resetQuote = useQuoteStore((s) => s.resetQuote);
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const [drawer, setDrawer] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" | "info" } | null>(null);

  const queryClient = useQueryClient();

  const buildDraftPayload = () => {
    const s = useQuoteStore.getState();
    return {
      quoteId: s.header.quoteId,
      header: {
        date: s.header.date,
        notes: s.header.notes,
        paymentTerms: s.header.paymentTerms,
        deliveryDate: s.header.deliveryDate,
      },
      supplierTerms: s.header.terms,
      items: s.items.map((it) => ({
        produtoCodigo: it.produtoCodigo,
        productName: it.productName,
        packageLabel: it.packageLabel,
        pack: it.pack,
        stock: it.stock,
        quantity: it.quantityBoxes * it.pack + it.quantityUnits,
        lines: it.lines,
        winnerSupplierCodigo: it.winnerSupplierCodigo,
      })),
    };
  };

  const saveMutation = useMutation({ mutationFn: () => saveQuoteDraftClient(buildDraftPayload()) });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const saved = await saveQuoteDraftClient(buildDraftPayload());
      const winners = selectWinners(useQuoteStore.getState());
      await closeQuoteClient(saved.quoteId, winners);
      return saved;
    },
  });

  const summary = useMemo(
    () => (
      <QuoteFinancialSummary
        onSaveDraft={() => {
          if (useQuoteStore.getState().items.length === 0) {
            setSnack({ msg: "Adicione ao menos um item.", sev: "error" });
            return;
          }
          saveMutation.mutate(undefined, {
            onSuccess: () => {
              setSnack({ msg: "Rascunho salvo.", sev: "success" });
              queryClient.invalidateQueries({ queryKey: ["price-history"] });
              resetQuote();
              setDrawer(false);
            },
            onError: (e: any) => setSnack({ msg: e?.message ?? "Erro ao salvar.", sev: "error" }),
          });
        }}
        onClose={() => {
          const errors = useQuoteStore.getState().validate();
          if (errors.length) {
            setSnack({ msg: errors[0], sev: "error" });
            return;
          }
          closeMutation.mutate(undefined, {
            onSuccess: () => {
              setSnack({ msg: "Cotação fechada e histórico atualizado.", sev: "success" });
              queryClient.invalidateQueries({ queryKey: ["price-history"] });
              resetQuote();
              setDrawer(false);
            },
            onError: (e: any) => setSnack({ msg: e?.message ?? "Erro ao fechar.", sev: "error" }),
          });
        }}
      />
    ),
    [saveMutation, closeMutation, resetQuote, queryClient],
  );

  return (
    <>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar>
          <ReceiptIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>Nova Cotação</Typography>
          <Button component={Link} to="/dashboard" size="small">Início</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" disableGutters sx={{ py: 3, px: { xs: 1, sm: 1.5 }, pb: isMobile ? 12 : 3 }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={1.5}>
              <Paper variant="outlined" sx={{ px: 1, py: 2 }}>
                <QuoteHeader />
              </Paper>
              <Paper variant="outlined" sx={{ px: 1, py: 2 }}>
                <QuoteSuppliersBar />
              </Paper>
              <Paper variant="outlined" sx={{ px: 1, py: 2 }}>
                <QuoteProductSearch />
              </Paper>

              <Box>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Itens da cotação ({items.length})
                </Typography>
                <Stack spacing={1.5}>
                  {items.length === 0 ? (
                    <Alert severity="info" variant="outlined">
                      Nenhum item adicionado ainda.
                    </Alert>
                  ) : (
                    items.map((it) => <QuoteItemCard key={it.id} item={it} />)
                  )}
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {!isMobile && (
            <Grid size={{ xs: 12, lg: 4 }}>
              <Box sx={{ position: "sticky", top: 80 }}>{summary}</Box>
            </Grid>
          )}
        </Grid>
      </Container>

      {isMobile && (
        <>
          <Fab
            color="primary"
            variant="extended"
            onClick={() => setDrawer(true)}
            sx={{ position: "fixed", right: 16, bottom: 16, zIndex: 1200 }}
          >
            <ReceiptIcon sx={{ mr: 1 }} /> Comparativo
          </Fab>
          <Drawer anchor="bottom" open={drawer} onClose={() => setDrawer(false)}>
            <Box sx={{ p: 2 }}>{summary}</Box>
          </Drawer>
        </>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack ? <Alert severity={snack.sev} onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </>
  );
}

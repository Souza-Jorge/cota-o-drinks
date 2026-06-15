import { useEffect, useState } from "react";
import {
  Alert, Box, IconButton, List, ListItem, ListItemButton, ListItemText,
  Stack, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQuery } from "@tanstack/react-query";
import { searchProductsClient } from "@/lib/quotes.api";
import { useQuoteStore } from "../useQuoteStore";

export function QuoteProductSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const supplierCodigos = useQuoteStore((s) => s.header.supplierCodigos);
  const items = useQuoteStore((s) => s.items);
  const addItem = useQuoteStore((s) => s.addItem);
  const disabled = supplierCodigos.length === 0;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () => searchProductsClient(debounced),
    enabled: debounced.length > 0 && !disabled,
  });

  const isAdded = (codigo: number) => items.some((i) => i.produtoCodigo === codigo);

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">Buscar e adicionar produtos</Typography>
      {disabled && (
        <Alert severity="info" variant="outlined">
          Adicione pelo menos um fornecedor antes de incluir produtos.
        </Alert>
      )}
      <TextField
        placeholder="Buscar por código, nome ou código de barras"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
        size="small"
        fullWidth
      />
      {results.length > 0 && (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, maxHeight: 280, overflow: "auto" }}>
          <List dense disablePadding>
            {results.map((p) => (
              <ListItem
                key={p.codigo}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="primary"
                    disabled={isAdded(p.codigo)}
                    onClick={() => addItem(p)}
                    aria-label={`Adicionar ${p.name}`}
                  >
                    <AddIcon />
                  </IconButton>
                }
              >
                <ListItemButton disabled={isAdded(p.codigo)} onClick={() => addItem(p)}>
                  <ListItemText
                    primary={`${p.codigo} — ${p.name}`}
                    secondary={`${p.packageLabel || "—"} • EAN ${p.barcode || "—"} • Estoque ${p.stock}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {debounced && !isFetching && results.length === 0 && (
        <Typography variant="body2" color="text.secondary">Nenhum produto encontrado.</Typography>
      )}
    </Stack>
  );
}

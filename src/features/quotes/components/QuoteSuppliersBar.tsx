import { Autocomplete, Box, Chip, Stack, TextField, Typography } from "@mui/material";
import GroupIcon from "@mui/icons-material/GroupsOutlined";
import { useQuery } from "@tanstack/react-query";
import { listSuppliersClient } from "@/lib/quotes.api";
import { useQuoteStore } from "../useQuoteStore";

const palette = ["primary", "secondary", "success", "warning", "info"] as const;
export const supplierColor = (codes: number[], code: number) => {
  const idx = codes.indexOf(code);
  return palette[idx % palette.length];
};

export function QuoteSuppliersBar() {
  const supplierCodigos = useQuoteStore((s) => s.header.supplierCodigos);
  const supplierNames = useQuoteStore((s) => s.header.supplierNames);
  const addSupplier = useQuoteStore((s) => s.addSupplier);
  const removeSupplier = useQuoteStore((s) => s.removeSupplier);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliersClient(),
  });
  const suppliers = Array.isArray(data) ? data : [];
  const remaining = suppliers.filter((s) => !supplierCodigos.includes(s.codigo));

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
        <GroupIcon color="action" />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Fornecedores nesta cotação
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        {supplierCodigos.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Adicione um ou mais fornecedores para receber preços.
          </Typography>
        )}
        {supplierCodigos.map((code) => (
          <Chip
            key={code}
            label={supplierNames[code] ?? `Cód ${code}`}
            color={supplierColor(supplierCodigos, code)}
            variant="filled"
            onDelete={() => removeSupplier(code)}
          />
        ))}
      </Stack>

      <Box sx={{ maxWidth: 480 }}>
        <Autocomplete
          size="small"
          options={remaining}
          getOptionLabel={(o) => `${o.nome} — Cód ${o.codigo}`}
          value={null}
          blurOnSelect
          loading={isLoading}
          onChange={(_, v) => v && addSupplier(v.codigo, v.nome)}
          renderInput={(params) => <TextField {...params} label="+ Adicionar fornecedor" />}
          noOptionsText={isLoading ? "Carregando..." : "Nenhum fornecedor disponível"}
        />
      </Box>
    </Stack>
  );
}

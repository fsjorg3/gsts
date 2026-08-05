import { useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { MsIcon } from '@/shared/components';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { personasSearchOptions, useCrearPersona, type Persona } from './api';

// Selector de solicitante: busca por nombre/RFC (GET /personas) y permite el
// alta rápida (POST /personas) cuando no existe.
export interface PersonaPickerProps {
  tipo: 'FISICA' | 'MORAL';
  value: Persona | null;
  onChange: (persona: Persona | null) => void;
}

export function PersonaPicker({ tipo, value, onChange }: PersonaPickerProps) {
  const [entrada, setEntrada] = useState('');
  const [rfcAlta, setRfcAlta] = useState('');
  const notificar = useNotificar();
  const entradaDebounced = useDebouncedValue(entrada, 300);
  const busqueda = useQuery(personasSearchOptions(entradaDebounced));
  const crear = useCrearPersona();

  const opciones = useMemo(() => (busqueda.data ?? []).filter((p) => p.tipo === tipo), [busqueda.data, tipo]);
  const sinResultados = entrada.trim().length > 0 && !busqueda.isPending && opciones.length === 0 && !value;

  const altaRapida = () => {
    crear.mutate(
      { tipo, nombreRazonSocial: entrada.trim(), ...(rfcAlta.trim() ? { rfc: rfcAlta.trim().toUpperCase() } : {}) },
      {
        onSuccess: (persona) => {
          onChange(persona);
          notificar.exito('Persona registrada.');
        },
        onError: (error) => notificar.error(error),
      },
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Autocomplete<Persona, false, false, true>
        freeSolo
        clearOnBlur={false}
        options={opciones}
        value={value}
        onChange={(_evento, seleccion) => {
          // freeSolo permite texto libre (Enter sin match) sin que MUI resetee
          // `entrada` al perder el foco; sólo nos interesa una Persona real
          // elegida de la lista, o la limpieza explícita (botón "x" → null).
          if (seleccion === null) { onChange(null); return; }
          if (typeof seleccion === 'object') onChange(seleccion);
        }}
        inputValue={entrada}
        onInputChange={(_evento, texto) => setEntrada(texto)}
        loading={busqueda.isFetching}
        getOptionLabel={(opcion) => (typeof opcion === 'string' ? opcion : opcion.nombreRazonSocial)}
        isOptionEqualToValue={(a, b) => (typeof a === 'string' || typeof b === 'string' ? false : a.id === b.id)}
        noOptionsText="Sin coincidencias"
        renderOption={(props, opcion) => {
          if (typeof opcion === 'string') return null;
          return (
            <li {...props} key={opcion.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{opcion.nombreRazonSocial}</Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{opcion.rfc ?? 'Sin RFC'}</Typography>
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={tipo === 'FISICA' ? 'Nombre completo del titular' : 'Razón social'}
            placeholder="Busca por nombre"
          />
        )}
      />

      {sinResultados ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'grey.400',
            borderRadius: 1,
            bgcolor: 'grey.50',
            p: 1.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <MsIcon name="person_add" size={20} color="#9F7122" />
          <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.secondary', flex: 1, minWidth: 180 }}>
            «{entrada.trim()}» no existe. Regístrala para continuar.
          </Typography>
          {tipo === 'MORAL' ? (
            <TextField
              label="RFC (opcional)"
              value={rfcAlta}
              onChange={(evento) => setRfcAlta(evento.target.value)}
              sx={{ width: 180 }}
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
          ) : null}
          <Button variant="outlined" size="small" disabled={crear.isPending} onClick={altaRapida}>
            Registrar persona
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

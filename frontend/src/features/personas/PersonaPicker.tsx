import { useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { MsIcon } from '@/shared/components';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { personasSearchOptions, type Persona } from './api';

// Selector de solicitante: busca por nombre/RFC (GET /personas). Ya no da de
// alta por sí mismo — es un componente controlado: si el nombre tecleado no
// tiene match, el padre decide cuándo y cómo crear la persona (ver
// NuevoTramite.tsx, que la resuelve al dar clic en "Crear trámite").
export interface PersonaPickerProps {
  tipo: 'FISICA' | 'MORAL';
  value: Persona | null;
  onChange: (persona: Persona | null) => void;
  entrada: string;
  onEntradaChange: (texto: string) => void;
  /** RFC opcional para el alta futura; sólo se muestra/usa con tipo MORAL. */
  rfc?: string;
  onRfcChange?: (rfc: string) => void;
  disabled?: boolean;
  /** Sobrescribe el label por defecto ("Nombre completo del titular" /
   * "Razón social"): el mismo picker se reutiliza para capturar a quien se
   * presenta (representante/apoderado), donde ese label no aplica. */
  label?: string;
}

export function PersonaPicker({ tipo, value, onChange, entrada, onEntradaChange, rfc, onRfcChange, disabled = false, label }: PersonaPickerProps) {
  const entradaDebounced = useDebouncedValue(entrada, 300);
  const busqueda = useQuery(personasSearchOptions(entradaDebounced));

  const opciones = useMemo(() => (busqueda.data ?? []).filter((p) => p.tipo === tipo), [busqueda.data, tipo]);
  const sinResultados = entrada.trim().length > 0 && !busqueda.isPending && opciones.length === 0 && !value;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Autocomplete<Persona, false, false, true>
        freeSolo
        disabled={disabled}
        clearOnBlur={false}
        options={opciones}
        value={value}
        onChange={(_evento, seleccion) => {
          // freeSolo permite texto libre (Enter sin match) sin que MUI resetee
          // `entrada` al perder el foco; sólo nos interesa una Persona real
          // elegida de la lista, o la limpieza explícita (botón "x" → null).
          if (seleccion === null) {
            onChange(null);
            onEntradaChange('');
            onRfcChange?.('');
            return;
          }
          if (typeof seleccion === 'object') {
            onChange(seleccion);
            onEntradaChange(seleccion.nombreRazonSocial);
            onRfcChange?.(seleccion.rfc ?? '');
          }
        }}
        inputValue={entrada}
        onInputChange={(_evento, texto, motivo) => {
          // MUI también emite reset/selectOption al sincronizar una selección.
          // Sólo el tecleo o la limpieza explícita invalidan la identidad elegida.
          if (motivo !== 'input' && motivo !== 'clear') return;
          if (motivo === 'clear' || (value && texto.trim() !== value.nombreRazonSocial.trim())) {
            onChange(null);
            onRfcChange?.('');
          }
          onEntradaChange(texto);
        }}
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
                {opcion.rfc ? <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>{opcion.rfc}</Typography> : null}
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label ?? (tipo === 'FISICA' ? 'Nombre completo del titular' : 'Razón social')}
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
            «{entrada.trim()}» no existe. Se registrará automáticamente al crear el trámite.
          </Typography>
          {tipo === 'MORAL' ? (
            <TextField
              label="RFC (opcional)"
              disabled={disabled}
              value={rfc ?? ''}
              onChange={(evento) => onRfcChange?.(evento.target.value)}
              sx={{ width: 180 }}
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

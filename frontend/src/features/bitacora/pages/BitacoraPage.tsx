import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router';
import type { AppShellContext } from '@/app/layout/AppShell';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { formatFechaHora } from '@/api/serializers';
import { DataTable, MsIcon, type DataTableColumn } from '@/shared/components';
import { usePaginacionCursor } from '@/shared/hooks/usePaginacionCursor';
import { bitacoraInfiniteOptions, type Bitacora, type FiltrosBitacora } from '../api';

function actorEtiqueta(actorId: string | null): string {
  return actorId ? actorId.slice(0, 8) : 'Sistema';
}

function transicion(b: Bitacora): string {
  if (!b.estadoAnterior && !b.estadoNuevo) return '—';
  return `${b.estadoAnterior ?? '—'} → ${b.estadoNuevo ?? '—'}`;
}

const COLUMNAS: DataTableColumn<Bitacora>[] = [
  { key: 'fecha', header: 'Fecha', width: 150, render: (b) => <Typography sx={{ fontSize: 12.5 }}>{formatFechaHora(b.timestamp)}</Typography> },
  { key: 'entidad', header: 'Entidad', render: (b) => <Typography sx={{ fontSize: 13 }}>{b.entidad}</Typography> },
  { key: 'accion', header: 'Acción', render: (b) => <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{b.accion}</Typography> },
  { key: 'transicion', header: 'Transición', render: (b) => <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{transicion(b)}</Typography> },
  { key: 'origen', header: 'Origen', width: 100, ocultarEnMovil: true, render: (b) => <Typography sx={{ fontSize: 12.5 }}>{b.origen}</Typography> },
  { key: 'actor', header: 'Actor', width: 100, ocultarEnMovil: true, render: (b) => <Typography sx={{ fontSize: 12.5, fontFamily: 'monospace' }}>{actorEtiqueta(b.actorId)}</Typography> },
];

export function BitacoraPage() {
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosBitacora>({});
  const [borrador, setBorrador] = useState<FiltrosBitacora>({});
  const [detalle, setDetalle] = useState<Bitacora | null>(null);

  const [filasPorPagina, setFilasPorPagina] = useState(25);
  const consulta = useInfiniteQuery(bitacoraInfiniteOptions(filtrosAplicados, filasPorPagina));
  const { pagina, filas: entradas, total, irAPagina, reiniciar } = usePaginacionCursor(consulta);

  const rangoInvalido = Boolean(borrador.desde && borrador.hasta && borrador.desde > borrador.hasta);

  // Los campos vacíos viajarían como cadena vacía si se pasara el borrador tal
  // cual; `api.ts` los ignora, pero es más honesto no enviarlos.
  const buscar = () => {
    reiniciar();
    setFiltrosAplicados(Object.fromEntries(Object.entries(borrador).filter(([, valor]) => valor !== '')));
  };
  const limpiar = () => {
    reiniciar();
    setBorrador({});
    setFiltrosAplicados({});
  };
  const cambiarFilasPorPagina = (filas: number) => {
    reiniciar();
    setFilasPorPagina(filas);
  };

  return (
    <>
      <ModuleHeader titulo="Bitácora" subtitulo="Auditoría de acciones del sistema (rol TI)" onAbrirMenu={abrirMenu} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField size="small" label="Entidad" value={borrador.entidad ?? ''} onChange={(e) => setBorrador({ ...borrador, entidad: e.target.value })} helperText=" " sx={{ width: 160 }} />
          <TextField size="small" label="Acción" value={borrador.accion ?? ''} onChange={(e) => setBorrador({ ...borrador, accion: e.target.value })} helperText=" " sx={{ width: 180 }} />
          {/* min/max acotan el selector, pero el campo sigue siendo tecleable:
              de ahí el error visible y el botón deshabilitado. */}
          <TextField size="small" label="Desde" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: borrador.hasta || undefined } }} value={borrador.desde ?? ''} onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} error={rangoInvalido} helperText=" " sx={{ width: 160 }} />
          <TextField size="small" label="Hasta" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: borrador.desde || undefined } }} value={borrador.hasta ?? ''} onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} error={rangoInvalido} helperText={rangoInvalido ? '«Hasta» no puede ser anterior a «Desde»' : ' '} sx={{ width: 220 }} />
          <TextField size="small" label="Actor ID" value={borrador.actorId ?? ''} onChange={(e) => setBorrador({ ...borrador, actorId: e.target.value })} helperText=" " sx={{ width: 220 }} />
          <Button variant="contained" onClick={buscar} disabled={rangoInvalido} sx={{ mt: 0.5 }}>Buscar</Button>
          <Button variant="text" onClick={limpiar} sx={{ mt: 0.5 }}>Limpiar</Button>
        </Box>

        <DataTable
          columns={COLUMNAS}
          rows={entradas}
          rowKey={(b) => b.id}
          onRowClick={(b) => setDetalle(b)}
          emptyMessage={consulta.isPending ? 'Cargando…' : 'Sin entradas de auditoría para estos filtros.'}
          paginacion={{
            pagina,
            total,
            filasPorPagina,
            onCambiarPagina: irAPagina,
            onCambiarFilasPorPagina: cambiarFilasPorPagina,
          }}
        />
      </Box>

      <Dialog open={Boolean(detalle)} onClose={() => setDetalle(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          Detalle de la entrada
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => setDetalle(null)}>
            <MsIcon name="close" size={20} />
          </IconButton>
        </DialogTitle>
        {detalle ? (
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, rowGap: 1.5, columnGap: 3, mb: 2.5 }}>
              {(
                [
                  ['Entidad', detalle.entidad],
                  ['Entidad ID', detalle.entidadId],
                  ['Acción', detalle.accion],
                  ['Origen', detalle.origen],
                  ['Actor', actorEtiqueta(detalle.actorId)],
                  ['Fecha', formatFechaHora(detalle.timestamp)],
                ] as const
              ).map(([etiqueta, valor]) => (
                <Box key={etiqueta}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{etiqueta}</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{valor}</Typography>
                </Box>
              ))}
            </Box>
            {(['datosAntes', 'datosDespues', 'detalle'] as const).map((campo) =>
              detalle[campo] != null ? (
                <Box key={campo} sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>{campo}</Typography>
                  <Box
                    component="pre"
                    sx={{ fontSize: 12, fontFamily: 'monospace', bgcolor: 'grey.100', borderRadius: 1, p: 1.5, overflowX: 'auto', m: 0 }}
                  >
                    {JSON.stringify(detalle[campo], null, 2)}
                  </Box>
                </Box>
              ) : null,
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

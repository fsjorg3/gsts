import { useEffect, useState } from 'react';
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
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl';
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

// Filtros aplicados en la URL (`filas` es el tamaño de página): la búsqueda se
// comparte y sobrevive a un F5. El índice de página no va, porque la API es
// por cursor y no se puede saltar a la página N en frío.
const CLAVES_FILTRO = ['entidad', 'entidadId', 'accion', 'actorId', 'desde', 'hasta', 'filas'] as const;
const OPCIONES_FILAS = [10, 25, 50, 100];

export function BitacoraPage() {
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const { filtros, aplicar, limpiar: limpiarUrl } = useFiltrosUrl(CLAVES_FILTRO);
  const [borrador, setBorrador] = useState<FiltrosBitacora>(filtros);
  const [detalle, setDetalle] = useState<Bitacora | null>(null);

  // El borrador es lo que se teclea; la URL, lo aplicado. Se re-sincroniza al
  // cambiar la URL por fuera (Atrás/Adelante o el regreso desde Keycloak).
  useEffect(() => setBorrador(filtros), [filtros]);

  const filasPorPagina = OPCIONES_FILAS.includes(Number(filtros.filas)) ? Number(filtros.filas) : 25;
  // `filas` es del paginador, no un filtro de la API: no viaja en la consulta.
  const filtrosAplicados: FiltrosBitacora = {
    ...(filtros.entidad ? { entidad: filtros.entidad } : {}),
    ...(filtros.entidadId ? { entidadId: filtros.entidadId } : {}),
    ...(filtros.accion ? { accion: filtros.accion } : {}),
    ...(filtros.actorId ? { actorId: filtros.actorId } : {}),
    ...(filtros.desde ? { desde: filtros.desde } : {}),
    ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
  };
  const consulta = useInfiniteQuery(bitacoraInfiniteOptions(filtrosAplicados, filasPorPagina));
  const { pagina, filas: entradas, total, irAPagina, reiniciar } = usePaginacionCursor(consulta);

  const rangoInvalido = Boolean(borrador.desde && borrador.hasta && borrador.desde > borrador.hasta);

  const buscar = () => {
    reiniciar();
    aplicar({ ...borrador, filas: String(filasPorPagina) });
  };
  const limpiar = () => {
    reiniciar();
    limpiarUrl();
  };
  const cambiarFilasPorPagina = (filas: number) => {
    reiniciar();
    aplicar({ ...filtros, filas: String(filas) });
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

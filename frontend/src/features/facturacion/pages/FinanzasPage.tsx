import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { formatMxn } from '@/api/serializers';
import { DataTable, EstadoDeBadge, ESTADO_FACTURA, MsIcon, StatCard, type DataTableColumn } from '@/shared/components';
import { FACTURAS_DEMO, FIN_KPIS, type FacturaDemo } from '@/mocks/finanzas';

// Módulo Finanzas — SHELL con datos de demostración: el backend no expone GET
// de facturas/solicitudes y el timbrado (PAC) está fuera de alcance. Los hooks
// reales de aceptar/rechazar viven en ../api.ts listos para conectarse.
export function FinanzasPage() {
  const [tab, setTab] = useState(0);
  const [seleccionada, setSeleccionada] = useState<FacturaDemo | null>(null);

  const filas =
    tab === 1 ? FACTURAS_DEMO.filter((f) => f.estado === 'TIMBRADO_FALLIDO') : tab === 2 ? [] : FACTURAS_DEMO;

  const columnas: DataTableColumn<FacturaDemo>[] = [
    { key: 'folio', header: 'Folio constancia', render: (f) => <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{f.folioConstancia}</Typography> },
    { key: 'receptor', header: 'Receptor', render: (f) => <Typography sx={{ fontSize: 13 }}>{f.receptorNombre}</Typography> },
    { key: 'rfc', header: 'RFC', render: (f) => <Typography sx={{ fontSize: 13 }}>{f.receptorRfc}</Typography> },
    { key: 'monto', header: 'Monto', align: 'right', render: (f) => <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatMxn(f.monto)}</Typography> },
    { key: 'estado', header: 'Estado', render: (f) => <EstadoDeBadge estado={f.estado} mapa={ESTADO_FACTURA} /> },
  ];

  return (
    <>
      <ModuleHeader titulo="Gerencia de Administración y Finanzas" subtitulo="Timbrado CFDI 4.0 · monitoreo y reintentos" />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Alert severity="warning" icon={<MsIcon name="science" size={20} />}>
          Datos de demostración: el listado de facturas y solicitudes aún no tiene endpoints en el backend, y el timbrado
          lo realizará el worker PAC (fuera de alcance actual).
        </Alert>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.75 }}>
          {FIN_KPIS.map((k) => (
            <StatCard key={k.label} icon={k.icon} iconColor={k.color} label={k.label} value={k.value} />
          ))}
        </Box>

        <Box>
          <Tabs value={tab} onChange={(_evento, valor: number) => setTab(valor)}>
            <Tab label="Todas las facturas" />
            <Tab label="Timbrados fallidos" />
            <Tab label="Global público" />
          </Tabs>
          <Box sx={{ mt: 2 }}>
            <DataTable
              columns={columnas}
              rows={filas}
              rowKey={(f) => f.id}
              onRowClick={setSeleccionada}
              emptyMessage={tab === 2 ? 'La factura global del periodo se consolida al cierre (worker PAC pendiente).' : 'Sin facturas'}
            />
          </Box>
        </Box>
      </Box>

      {/* Detalle de factura (réplica del prototipo) */}
      <Dialog open={Boolean(seleccionada)} onClose={() => setSeleccionada(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center' }}>
          Detalle de factura
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={() => setSeleccionada(null)}>
            <MsIcon name="close" size={20} />
          </IconButton>
        </DialogTitle>
        {seleccionada ? (
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <EstadoDeBadge estado={seleccionada.estado} mapa={ESTADO_FACTURA} />
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{seleccionada.folioConstancia}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 2, columnGap: 3, mb: 2.5 }}>
              {(
                [
                  ['Receptor', seleccionada.receptorNombre],
                  ['RFC', seleccionada.receptorRfc],
                  ['C.P. fiscal', seleccionada.receptorCp],
                  ['Régimen', seleccionada.receptorRegimen],
                  ['Uso CFDI', seleccionada.usoCfdi],
                  ['Monto', formatMxn(seleccionada.monto)],
                ] as const
              ).map(([clave, valor]) => (
                <Box key={clave}>
                  <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled' }}>{clave}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mt: 0.25 }}>{valor}</Typography>
                </Box>
              ))}
            </Box>
            {seleccionada.errorPac ? (
              <>
                <Alert severity="error" icon={<MsIcon name="error" size={20} />}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Error reportado por el PAC</Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    {seleccionada.errorPac.codigo} — {seleccionada.errorPac.mensaje}
                  </Typography>
                </Alert>
                <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 1.5 }}>
                  Error de datos: no se reintenta automáticamente. Corrige y reintenta manualmente.
                </Typography>
              </>
            ) : null}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

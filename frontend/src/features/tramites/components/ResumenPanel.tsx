import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { formatFecha, formatMxn } from '@/api/serializers';
import { folioTramite, titularDe, type TramiteDetalle } from '../api';

// Contenido puro del resumen del expediente: se reutiliza tal cual dentro del
// aside fijo (lg+) y dentro del Drawer temporal que lo sustituye en móvil/tablet
// (ver TramiteWizard.tsx). La bitácora completa vive en el backend (append-only)
// y aún no expone endpoint de consulta.
export function ResumenPanelContenido({ tramite }: { tramite: TramiteDetalle }) {
  const titular = titularDe(tramite);
  const filas: Array<[string, string]> = [
    ['Folio', folioTramite(tramite)],
    ['Tipo', tramite.tipoConstancia === 'NO_ADEUDO' ? 'No adeudo' : 'No registro'],
    ['Solicitante', titular?.nombreRazonSocial ?? '—'],
    ['RFC', titular?.rfc ?? '—'],
    ['NIS / Cuenta', tramite.nis ?? '—'],
    ['Creado', formatFecha(tramite.createdAt)],
    ['Plazo de pago', formatFecha(tramite.plazoPagoHasta)],
    ['Evidencias', `${tramite.evidencias.length} archivo(s)`],
  ];
  if (tramite.tipoConstancia === 'NO_REGISTRO' && tramite.domicilioCalle) {
    filas.push(['Domicilio', `${tramite.domicilioCalle}, núm. ${tramite.domicilioNumero}, ${tramite.domicilioColonia}`]);
    filas.push(['Pertenece a', `${tramite.domicilioPerteneceA === 'MUNICIPIO' ? 'Municipio' : 'Junta auxiliar'}: ${tramite.domicilioPerteneceANombre}`]);
  }
  if (tramite.cobro) filas.push(['Cobro', formatMxn(tramite.cobro.montoFinal)]);
  if (tramite.constancia) filas.push(['Constancia', tramite.constancia.folioUnico]);

  return (
    <>
      <Box sx={{ p: 2.25, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Resumen del trámite</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.125 }}>
          {filas.map(([clave, valor]) => (
            <Box key={clave} sx={{ display: 'flex', gap: 1.25 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', width: 96, flexShrink: 0 }}>{clave}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'right', wordBreak: 'break-word' }}>{valor}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ p: 2.25 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', lineHeight: 1.5 }}>
          Cada acción queda sellada en la bitácora de auditoría del sistema (sólo anexado).
        </Typography>
      </Box>
    </>
  );
}

// Panel lateral fijo del wizard, visible sólo en lg+; por debajo de ese
// breakpoint el mismo contenido se muestra en un Drawer temporal (ver
// TramiteWizard.tsx) para no perder la información en pantallas angostas.
export function ResumenPanel({ tramite }: { tramite: TramiteDetalle }) {
  return (
    <Box
      component="aside"
      sx={{
        width: 326,
        flexShrink: 0,
        borderLeft: '1px solid',
        borderLeftColor: 'divider',
        bgcolor: 'background.paper',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      <ResumenPanelContenido tramite={tramite} />
    </Box>
  );
}

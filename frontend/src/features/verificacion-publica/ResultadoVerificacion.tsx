import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { EstadoDeBadge, ESTADO_VERIFICACION, MsIcon } from '@/shared/components';
import type { VerificacionConstancia } from './api';

const COPY_TIPO: Record<VerificacionConstancia['tipo'], string> = {
  NO_ADEUDO: 'Constancia de No Adeudo',
  NO_REGISTRO: 'Constancia de No Registro',
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' });
}

/** Tarjeta de resultado, compartida por la verificación por QR y la manual: el sobre de datos es idéntico. */
export function ResultadoVerificacion({ resultado }: { resultado: VerificacionConstancia }) {
  return (
    <Paper variant="outstanding" sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <MsIcon name="verified" size={28} color="#3D0017" />
        <Typography sx={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{COPY_TIPO[resultado.tipo]}</Typography>
        <EstadoDeBadge estado={resultado.estado} mapa={ESTADO_VERIFICACION} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Campo etiqueta="Folio" valor={resultado.folio} />
        <Campo etiqueta="Titular" valor={resultado.titular.nombreRazonSocial} />
        <Campo etiqueta={resultado.estado === 'VIGENTE' ? 'Vigente hasta' : 'Venció el'} valor={formatearFecha(resultado.vigenciaHasta)} />
        {resultado.domicilio ? <Campo etiqueta="Predio" valor={formatearDomicilio(resultado.domicilio)} /> : null}
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Este documento no sustituye la firma autógrafa del original ni tiene valor probatorio autónomo. Es una consulta de SOAPAP sobre su propio registro.
      </Typography>
    </Paper>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 140 }}>{etiqueta}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{valor}</Typography>
    </Box>
  );
}

function formatearDomicilio(domicilio: NonNullable<VerificacionConstancia['domicilio']>): string {
  const partes = [domicilio.calle, domicilio.numero].filter(Boolean).join(' ');
  const resto = [partes || null, domicilio.colonia].filter(Boolean).join(', ');
  return resto || 'Sin domicilio registrado';
}

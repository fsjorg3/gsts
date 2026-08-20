import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { formatMxn } from '@/api/serializers';
import { EstadoBadge, MsIcon } from '@/shared/components';
import { catalogoVistaPreviaOptions, gruposAplicables } from '@/features/catalogos/api';
import { useRegistrarValidacion, useRegistrarValidacionNoRegistro } from '@/features/validaciones/api';
import type { TramiteDetalle } from '../api';

// Paso 1 · Validación: resumen del checklist + cruce manual con el OUC (sólo
// NO_ADEUDO). La aprobación se dispara desde el pie del wizard.
export function PasoValidacion({ tramite }: { tramite: TramiteDetalle }) {
  const notificar = useNotificar();
  const catalogo = useQuery(catalogoVistaPreviaOptions(tramite.versionCatalogoId));
  const registrar = useRegistrarValidacion(tramite.id);
  const registrarNoRegistro = useRegistrarValidacionNoRegistro(tramite.id);
  const [capturandoAdeudo, setCapturandoAdeudo] = useState(false);
  const [montoAdeudo, setMontoAdeudo] = useState('');
  const [referencia, setReferencia] = useState('');

  const grupos = catalogo.data
    ? gruposAplicables(catalogo.data, {
        tipoConstancia: tramite.tipoConstancia,
        personalidad: tramite.personalidad,
        representacion: tramite.representacion,
      })
    : [];

  const validacionInicial = tramite.validacionesNoAdeudo.find((v) => v.momento === 'VALIDACION_INICIAL');
  const validacionInicialRegistro = tramite.validacionesNoRegistro.find((v) => v.momento === 'VALIDACION_INICIAL');

  const registrarResultado = (resultado: 'SIN_ADEUDO' | 'CON_ADEUDO') => {
    registrar.mutate(
      {
        momento: 'VALIDACION_INICIAL',
        resultado,
        ...(resultado === 'CON_ADEUDO' && montoAdeudo ? { adeudoMonto: Number(montoAdeudo) } : {}),
        ...(referencia.trim() ? { referenciaOuc: referencia.trim() } : {}),
      },
      {
        onSuccess: () => {
          setCapturandoAdeudo(false);
          notificar.exito(resultado === 'SIN_ADEUDO' ? 'Sin adeudo registrado.' : 'Adeudo registrado. El trámite no puede aprobarse.');
        },
        onError: (error) => notificar.error(error),
      },
    );
  };

  const registrarResultadoRegistro = (resultado: 'SIN_REGISTRO' | 'CON_REGISTRO') => {
    registrarNoRegistro.mutate(
      {
        momento: 'VALIDACION_INICIAL',
        resultado,
        ...(referencia.trim() ? { referenciaOuc: referencia.trim() } : {}),
      },
      {
        onSuccess: () => notificar.exito(resultado === 'SIN_REGISTRO' ? 'Sin registro en el padrón.' : 'Predio registrado. El trámite no puede aprobarse.'),
        onError: (error) => notificar.error(error),
      },
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {/* Resumen del checklist */}
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.75 }}>Checklist de requisitos</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.125 }}>
          {grupos.map((grupo) => {
            const evidencias = new Map(tramite.evidencias.map((e) => [e.opcionDocumentoId, e.estado]));
            const ok = grupo.opciones.some(
              (o) => o.documentos.length > 0 && o.documentos.every((d) => evidencias.get(d.id) === 'VALIDADO'),
            );
            return (
              <Box key={grupo.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.375, px: 1.5, py: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                <MsIcon name={ok ? 'check_circle' : 'radio_button_unchecked'} size={19} color={ok ? '#2E7D32' : '#A7ADB3'} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{grupo.nombre}</Typography>
                <EstadoBadge label={ok ? 'Completo' : 'Pendiente'} color={ok ? 'success' : 'neutral'} />
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Cruce OUC (sólo NO_ADEUDO) */}
      {tramite.tipoConstancia === 'NO_ADEUDO' ? (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <MsIcon name="plumbing" size={20} color="#5B132B" />
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Validación de no adeudo — OUC</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 2 }}>
            Cuenta {tramite.nis ?? '—'} · Cruce manual en el Organismo Único de Cobro.
          </Typography>

          {validacionInicial ? (
            <Alert
              severity={validacionInicial.resultado === 'SIN_ADEUDO' ? 'success' : 'error'}
              icon={<MsIcon name={validacionInicial.resultado === 'SIN_ADEUDO' ? 'check_circle' : 'error'} size={20} />}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {validacionInicial.resultado === 'SIN_ADEUDO'
                  ? 'Sin adeudo confirmado ($0.00)'
                  : `Adeudo detectado${validacionInicial.adeudoMonto ? ` · ${formatMxn(validacionInicial.adeudoMonto)}` : ''}`}
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                {validacionInicial.referenciaOuc ? `Folio OUC ${validacionInicial.referenciaOuc} · ` : ''}
                validación manual
                {validacionInicial.resultado === 'CON_ADEUDO' ? ' — procede el rechazo del trámite.' : '.'}
              </Typography>
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Referencia / Observaciones (opcional)"
                value={referencia}
                onChange={(evento) => setReferencia(evento.target.value)}
                sx={{ maxWidth: 420 }}
              />
              {capturandoAdeudo ? (
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label="Monto del adeudo (MXN)"
                    value={montoAdeudo}
                    onChange={(evento) => setMontoAdeudo(evento.target.value.replace(/[^0-9.]/g, ''))}
                    sx={{ width: 220 }}
                  />
                  <Button color="error" variant="contained" disabled={registrar.isPending || !montoAdeudo} onClick={() => registrarResultado('CON_ADEUDO')}>
                    Confirmar adeudo
                  </Button>
                  <Button variant="text" onClick={() => setCapturandoAdeudo(false)}>Cancelar</Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="success"
                    disabled={registrar.isPending}
                    onClick={() => registrarResultado('SIN_ADEUDO')}
                    startIcon={<MsIcon name="check_circle" size={18} />}
                    sx={{ borderColor: '#2E7D32', color: '#2E7D32', '&:hover': { bgcolor: '#E8F5E9', borderColor: '#2E7D32' } }}
                  >
                    Registrar sin adeudo ($0.00)
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    disabled={registrar.isPending}
                    onClick={() => setCapturandoAdeudo(true)}
                    startIcon={<MsIcon name="error" size={18} />}
                    sx={{ borderColor: '#BA1A1A', color: '#BA1A1A', '&:hover': { bgcolor: '#FFEBEE', borderColor: '#BA1A1A' } }}
                  >
                    Registrar con adeudo
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <MsIcon name="map" size={20} color="#5B132B" />
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Validación de no registro — padrón</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 2 }}>
            Búsqueda del predio en el padrón de SOAPAP para confirmar que no existe registro alguno.
          </Typography>

          {validacionInicialRegistro ? (
            <Alert
              severity={validacionInicialRegistro.resultado === 'SIN_REGISTRO' ? 'success' : 'error'}
              icon={<MsIcon name={validacionInicialRegistro.resultado === 'SIN_REGISTRO' ? 'check_circle' : 'error'} size={20} />}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {validacionInicialRegistro.resultado === 'SIN_REGISTRO'
                  ? 'Sin registro en el padrón'
                  : 'El predio sí está registrado'}
              </Typography>
              <Typography sx={{ fontSize: 12 }}>
                {validacionInicialRegistro.referenciaOuc ? `Folio ${validacionInicialRegistro.referenciaOuc} · ` : ''}
                validación manual
                {validacionInicialRegistro.resultado === 'CON_REGISTRO' ? ' — procede el rechazo del trámite.' : '.'}
              </Typography>
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Referencia / Folio de la consulta (opcional)"
                value={referencia}
                onChange={(evento) => setReferencia(evento.target.value)}
                sx={{ maxWidth: 420 }}
              />
              <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  disabled={registrarNoRegistro.isPending}
                  onClick={() => registrarResultadoRegistro('SIN_REGISTRO')}
                  startIcon={<MsIcon name="check_circle" size={18} />}
                  sx={{ borderColor: '#2E7D32', color: '#2E7D32', '&:hover': { bgcolor: '#E8F5E9', borderColor: '#2E7D32' } }}
                >
                  Sin registro en el padrón
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  disabled={registrarNoRegistro.isPending}
                  onClick={() => registrarResultadoRegistro('CON_REGISTRO')}
                  startIcon={<MsIcon name="error" size={18} />}
                  sx={{ borderColor: '#BA1A1A', color: '#BA1A1A', '&:hover': { bgcolor: '#FFEBEE', borderColor: '#BA1A1A' } }}
                >
                  El predio sí está registrado
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

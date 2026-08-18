import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { QRCodeSVG } from 'qrcode.react';
import { formatFecha } from '@/api/serializers';
import { useNotificar } from '@/store/useNotificar';
import { EstadoBadge, MsIcon } from '@/shared/components';
import { abrirBlobEnPestana, descargarBlob, nombreArchivoConstancia } from '@/shared/descargarArchivo';
import { useDescargarConstancia } from '@/features/constancias/api';
import type { TramiteDetalle } from '../api';

// Paso 4 · Entrega: la constancia emitida, único documento que ventanilla
// entrega. Si el ciudadano dijo querer factura, aquí sólo se le recuerda que la
// solicite en el portal del sistema Finanzas con su folio: GSTS no emite CFDI
// y finalizar el trámite ya no depende de que exista.
export function PasoEntrega({ tramite }: { tramite: TramiteDetalle }) {
  const constancia = tramite.constancia;
  const titular = tramite.personas[0]?.persona;
  const finalizado = tramite.estado === 'FINALIZADO';
  const notificar = useNotificar();
  const descargar = useDescargarConstancia(tramite.id);

  // El PDF lo genera y firma el backend; aquí sólo se obtiene el archivo ya
  // emitido, para entregarlo impreso o guardarlo.
  const obtenerPdf = (alRecibir: (blob: Blob) => void) => {
    if (!constancia) return;
    descargar.mutate(constancia.id, {
      onSuccess: (blob) => {
        try {
          alRecibir(blob);
        } catch (error) {
          notificar.error(error);
        }
      },
      onError: (error) => notificar.error(error),
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {constancia ? (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
          {/* QR de verificación: codifica la URL pública que confirma folio,
              titular y vigencia contra el registro de SOAPAP. No es una firma
              electrónica — la validez jurídica sigue en la firma autógrafa. */}
          <Box sx={{ width: 132, flexShrink: 0 }}>
            <Box sx={{ width: 132, height: 132, border: '1px solid', borderColor: constancia.urlVerificacion ? 'divider' : '#F0C000', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: constancia.urlVerificacion ? 'background.paper' : '#FFF8E1' }}>
              {constancia.urlVerificacion ? (
                <QRCodeSVG value={constancia.urlVerificacion} size={112} level="M" bgColor="#FFFFFF" fgColor="#3D0017" title={`Verificación de la constancia ${constancia.folioUnico}`} />
              ) : (
                <MsIcon name="key_off" size={72} color="#C58A00" />
              )}
            </Box>
            {/* urlVerificacion null no es "sin QR todavía": la constancia se emitió
                con una versión de clave que ya fue retirada, así que su QR impreso
                ya no puede verificarse. Es una anomalía operativa, no un estado normal. */}
            {!constancia.urlVerificacion ? (
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#8A6100', mt: 0.75, lineHeight: 1.4 }}>
                Verificación no disponible: la clave de firma de esta constancia fue retirada.
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <EstadoBadge label={finalizado ? 'Constancia emitida y entregada' : 'Constancia emitida'} color="success" />
            <Typography sx={{ fontSize: 20, fontWeight: 700, mt: 1.5, mb: 0.25 }}>{constancia.folioUnico}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary' }}>
              {tramite.tipoConstancia === 'NO_ADEUDO' ? 'Constancia de No Adeudo' : 'Constancia de No Registro'} ·{' '}
              {titular?.nombreRazonSocial ?? '—'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 1.75, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled', mb: 0.5 }}>VIGENCIA</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {formatFecha(constancia.vigenciaInicio)} → {formatFecha(constancia.vigenciaFin)}
                </Typography>
              </Box>
              {/* Sin Servicio de Firma en el proyecto, firmaDigital nace null y
                  no puede completarse después (la constancia es inmutable). Decir
                  "pendiente" sería falso: la autenticidad se sostiene en la firma
                  autógrafa del papel y en la verificación por QR. */}
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.disabled', mb: 0.5 }}>AUTENTICIDAD</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <MsIcon name="shield" size={16} color="#2E7D32" />
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {constancia.firmaDigital ? 'PKI SOAPAP · SHA-256' : 'Firma autógrafa + verificación QR'}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 11.5, fontWeight: 500, color: 'text.disabled', mt: 1.5, wordBreak: 'break-all' }}>
              Hash SHA-256: {constancia.hashPdf}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25, mt: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                disabled={descargar.isPending}
                onClick={() => obtenerPdf((blob) => abrirBlobEnPestana(blob))}
                startIcon={<MsIcon name="print" size={18} />}
              >
                {descargar.isPending ? 'Obteniendo…' : 'Imprimir'}
              </Button>
              <Button
                variant="outlined"
                disabled={descargar.isPending}
                onClick={() => obtenerPdf((blob) => descargarBlob(blob, nombreArchivoConstancia(constancia.folioUnico)))}
                startIcon={<MsIcon name="download" size={18} />}
              >
                Descargar PDF
              </Button>
            </Box>
          </Box>
        </Box>
      ) : null}

      {tramite.cobro?.facturaSolicitadaEnVentanilla ? (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
            <MsIcon name="receipt_long" size={20} color="#5B132B" />
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>El ciudadano pidió factura</Typography>
            <EstadoBadge label="Se solicita en el portal" color="info" />
          </Box>
          <Alert severity="info" icon={<MsIcon name="info" size={20} />}>
            La factura no se emite desde aquí. Indíquele que la solicite en el portal con el folio de su constancia; el
            plazo fiscal corre desde la fecha de pago. Finalizar el trámite ya no depende de que exista el CFDI.
          </Alert>
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 2, py: 1.75, border: '1px dashed', borderColor: 'grey.400', borderRadius: 1, bgcolor: 'grey.50' }}>
        <MsIcon name="public" size={19} color="#5B132B" />
        <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.secondary', lineHeight: 1.6 }}>
          El ciudadano verifica la autenticidad de la constancia en el portal público con el folio{' '}
          <Box component="span" sx={{ color: 'primary.light', fontWeight: 600 }}>{constancia?.folioUnico ?? '—'}</Box>
          {tramite.cobro?.facturaSolicitadaEnVentanilla ? ', y con ese mismo folio solicita su factura' : ''}.
        </Typography>
      </Box>
    </Box>
  );
}

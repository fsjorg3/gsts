import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { esApiError } from '@/api/errors';
import { formatMxn } from '@/api/serializers';
import { EstadoBadge, MsIcon } from '@/shared/components';
import { useDescargarComprobante } from '@/features/cobros/api';
import { MIME_PERMITIDOS } from '@/features/evidencias/api';
import type { TramiteDetalle } from '@/features/tramites/api';
import { catalogosSatOptions, origenesGafOptions, useCrearSolicitudGaf } from './api';
import { ComprobanteInvalidoError, TOTAL_MAX_BYTES, normalizarComprobante } from './comprobante';
import { copyGaf, detalleGafPorCampo } from './errors';

// "2026-06-30T18:05:00.000Z" -> "2026-06-30" en hora LOCAL, no UTC: un cobro de
// la tarde en Puebla puede caer al día siguiente en UTC, y fechaPago se usa
// para resolver los catálogos SAT vigentes, así que un desfase importa.
function fechaLocalISO(iso: string): string {
  const fecha = new Date(iso);
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

interface CamposFiscales {
  rfcReceptor: string;
  nombreReceptor: string;
  codigoPostalReceptor: string;
  correoReceptor: string;
  telefonoReceptor: string;
  concepto: string;
  regimenFiscalReceptor: string;
  usoCfdi: string;
  formaPago: string;
}

// Captura de la solicitud de facturación en GAF, en el único punto del wizard
// donde folio (constancia.folioUnico) y datos del cobro coexisten. El envío va
// directo al navegador → GAF: GSTS no guarda ni reenvía ningún dato fiscal.
export function SolicitudFacturaForm({ tramite }: { tramite: TramiteDetalle }) {
  const constancia = tramite.constancia;
  const cobro = tramite.cobro;
  const titular = tramite.personas[0]?.persona;

  const [campos, setCampos] = useState<CamposFiscales>({
    rfcReceptor: '',
    nombreReceptor: titular?.nombreRazonSocial ?? '',
    codigoPostalReceptor: '',
    correoReceptor: '',
    telefonoReceptor: '',
    concepto: constancia
      ? `Pago de constancia de ${tramite.tipoConstancia === 'NO_ADEUDO' ? 'no adeudo' : 'no registro'} — folio ${constancia.folioUnico}`
      : '',
    regimenFiscalReceptor: '',
    usoCfdi: '',
    formaPago: cobro?.formaPago ?? '',
  });
  const [comprobantes, setComprobantes] = useState<File[]>([]);
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
  const [fallo, setFallo] = useState<string | null>(null);
  const [duplicada, setDuplicada] = useState(false);
  const [resultado, setResultado] = useState<{ numeroSolicitud: string; estado: string } | null>(null);

  const fechaPago = cobro ? fechaLocalISO(cobro.cobradoAt) : '';
  const origenes = useQuery(origenesGafOptions());
  const catalogos = useQuery(catalogosSatOptions(fechaPago));
  const descargarComprobante = useDescargarComprobante(tramite.id);
  const crear = useCrearSolicitudGaf();

  if (!constancia || !cobro) return null;

  const usosPermitidos = campos.regimenFiscalReceptor ? (catalogos.data?.usosPorRegimenFiscal[campos.regimenFiscalReceptor] ?? []) : [];
  const opcionesUsoCfdi = (catalogos.data?.usoCfdi ?? []).filter((valor) => usosPermitidos.includes(valor.clave));

  function set<K extends keyof CamposFiscales>(campo: K, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
    setErroresCampo((prev) => ({ ...prev, [campo]: '' }));
  }

  // Al cambiar el régimen, un uso ya elegido puede dejar de ser válido: se
  // limpia en vez de dejar una combinación que GAF rechazaría.
  function elegirRegimen(clave: string) {
    setCampos((prev) => {
      const permitidos = catalogos.data?.usosPorRegimenFiscal[clave] ?? [];
      const conservaUso = prev.usoCfdi !== '' && permitidos.includes(prev.usoCfdi);
      return { ...prev, regimenFiscalReceptor: clave, usoCfdi: conservaUso ? prev.usoCfdi : '' };
    });
  }

  // Todo archivo pasa por normalizarComprobante antes de adjuntarse: GAF exige
  // que el MIME declarado sea idéntico al que detecta del contenido y que la
  // extensión del nombre le corresponda, y ni el nombre guardado en el cobro ni
  // el `type` que reporta el file picker son confiables para eso.
  function adjuntar(origen: Blob, nombreSugerido: string, alFallar: (mensaje: string) => void) {
    if (comprobantes.length >= 3) return;
    void normalizarComprobante(origen, nombreSugerido)
      .then((archivo) => {
        setComprobantes((prev) => {
          if (prev.length >= 3) return prev;
          if (prev.reduce((suma, a) => suma + a.size, 0) + archivo.size > TOTAL_MAX_BYTES) {
            alFallar('Los comprobantes superarían los 20 MB acumulados que acepta GAF.');
            return prev;
          }
          return [...prev, archivo];
        });
        setErroresCampo((prev) => ({ ...prev, comprobantes: '' }));
      })
      .catch((error: unknown) => {
        alFallar(error instanceof ComprobanteInvalidoError ? error.message : copyGaf(error));
      });
  }

  function usarComprobanteDelCobro() {
    descargarComprobante.mutate(undefined, {
      onSuccess: (blob) =>
        adjuntar(blob, cobro?.comprobanteNombreOriginal ?? `comprobante-${tramite.numeroTramite}`, setFallo),
      onError: (error) => setFallo(copyGaf(error)),
    });
  }

  function agregarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    adjuntar(archivo, archivo.name, (mensaje) => setErroresCampo((prev) => ({ ...prev, comprobantes: mensaje })));
  }

  function quitarArchivo(indice: number) {
    setComprobantes((prev) => prev.filter((_, i) => i !== indice));
  }

  function enviar() {
    if (!constancia || !cobro) return; // ya validado por el guard de arriba; defensivo para el closure
    setFallo(null);
    setDuplicada(false);
    const errores: Record<string, string> = {};
    if (!campos.rfcReceptor.trim()) errores.rfcReceptor = 'El RFC es obligatorio.';
    if (!campos.nombreReceptor.trim()) errores.nombreReceptor = 'El nombre del receptor es obligatorio.';
    if (!campos.codigoPostalReceptor.trim()) errores.codigoPostalReceptor = 'El código postal es obligatorio.';
    if (!campos.concepto.trim()) errores.concepto = 'El concepto es obligatorio.';
    if (!campos.regimenFiscalReceptor) errores.regimenFiscalReceptor = 'Elige el régimen fiscal.';
    if (!campos.usoCfdi) errores.usoCfdi = 'Elige el uso de CFDI.';
    if (!campos.formaPago) errores.formaPago = 'Elige la forma de pago.';
    if (!campos.correoReceptor.trim() && !campos.telefonoReceptor.trim()) {
      errores.correoReceptor = 'Captura al menos un medio de contacto: correo o teléfono.';
    }
    if (comprobantes.length === 0) errores.comprobantes = 'Adjunta al menos un comprobante (1 a 3).';
    if (Object.keys(errores).length > 0) {
      setErroresCampo(errores);
      return;
    }

    const formData = new FormData();
    formData.append('origenClave', 'CONSTANCIA');
    formData.append('referenciaOrigen', constancia.folioUnico);
    formData.append('rfcReceptor', campos.rfcReceptor);
    formData.append('nombreReceptor', campos.nombreReceptor);
    formData.append('codigoPostalReceptor', campos.codigoPostalReceptor);
    if (campos.correoReceptor.trim()) formData.append('correoReceptor', campos.correoReceptor.trim());
    if (campos.telefonoReceptor.trim()) formData.append('telefonoReceptor', campos.telefonoReceptor.trim());
    formData.append('concepto', campos.concepto);
    formData.append('monto', cobro.montoFinal);
    formData.append('fechaPago', fechaPago);
    formData.append('moneda', 'MXN');
    formData.append('regimenFiscalReceptor', campos.regimenFiscalReceptor);
    formData.append('usoCfdi', campos.usoCfdi);
    formData.append('formaPago', campos.formaPago);
    for (const archivo of comprobantes) formData.append('comprobantes', archivo);

    crear.mutate(formData, {
      onSuccess: (data) => setResultado({ numeroSolicitud: data.numeroSolicitud, estado: data.estado }),
      onError: (error) => {
        if (esApiError(error) && error.code === 'SOLICITUD_PAGO_DUPLICADA') {
          setDuplicada(true);
          return;
        }
        const porCampo = detalleGafPorCampo(error);
        if (Object.keys(porCampo).length > 0) setErroresCampo(porCampo);
        setFallo(copyGaf(error));
      },
    });
  }

  if (resultado) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
          <MsIcon name="receipt_long" size={20} color="#2E7D32" />
          <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Solicitud de factura enviada</Typography>
          <EstadoBadge label={resultado.estado} color="success" />
        </Box>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Número de solicitud en GAF: <strong>{resultado.numeroSolicitud}</strong>.
        </Typography>
      </Box>
    );
  }

  if (duplicada) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
          <MsIcon name="receipt_long" size={20} color="#5B132B" />
          <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Solicitud de factura</Typography>
          <EstadoBadge label="Ya existe en GAF" color="info" />
        </Box>
        <Alert severity="info" icon={<MsIcon name="info" size={20} />}>
          Esta constancia ya tiene una solicitud de factura activa en GAF — no hace falta volver a enviarla.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
        <MsIcon name="receipt_long" size={20} color="#5B132B" />
        <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>El ciudadano pidió factura</Typography>
      </Box>

      {fallo ? (
        <Alert
          severity="warning"
          icon={<MsIcon name="error" size={20} />}
          action={
            <Button color="inherit" size="small" onClick={enviar} disabled={crear.isPending}>
              Reintentar
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {fallo}
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <TextField
          label="RFC del receptor"
          value={campos.rfcReceptor}
          onChange={(evento) => set('rfcReceptor', evento.target.value)}
          error={Boolean(erroresCampo.rfcReceptor)}
          helperText={erroresCampo.rfcReceptor}
        />
        <TextField
          label="Nombre o razón social"
          value={campos.nombreReceptor}
          onChange={(evento) => set('nombreReceptor', evento.target.value)}
          error={Boolean(erroresCampo.nombreReceptor)}
          helperText={erroresCampo.nombreReceptor}
        />
        <TextField
          label="Código postal"
          value={campos.codigoPostalReceptor}
          onChange={(evento) => set('codigoPostalReceptor', evento.target.value)}
          error={Boolean(erroresCampo.codigoPostalReceptor)}
          helperText={erroresCampo.codigoPostalReceptor}
        />
        <TextField label="Monto" value={formatMxn(cobro.montoFinal)} disabled />
        <TextField
          label="Correo (opcional si hay teléfono)"
          value={campos.correoReceptor}
          onChange={(evento) => set('correoReceptor', evento.target.value)}
          error={Boolean(erroresCampo.correoReceptor)}
          helperText={erroresCampo.correoReceptor}
        />
        <TextField
          label="Teléfono (opcional si hay correo)"
          value={campos.telefonoReceptor}
          onChange={(evento) => set('telefonoReceptor', evento.target.value)}
        />
      </Box>

      <TextField
        label="Concepto"
        value={campos.concepto}
        onChange={(evento) => set('concepto', evento.target.value)}
        error={Boolean(erroresCampo.concepto)}
        helperText={erroresCampo.concepto}
        fullWidth
        sx={{ mb: 2 }}
      />

      {!fechaPago ? null : catalogos.isPending ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>Cargando catálogos SAT…</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            select
            label="Régimen fiscal"
            value={campos.regimenFiscalReceptor}
            onChange={(evento) => elegirRegimen(evento.target.value)}
            error={Boolean(erroresCampo.regimenFiscalReceptor)}
            helperText={erroresCampo.regimenFiscalReceptor}
          >
            {(catalogos.data?.regimenFiscal ?? []).map((valor) => (
              <MenuItem key={valor.clave} value={valor.clave}>{valor.clave} · {valor.descripcion}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Uso de CFDI"
            value={campos.usoCfdi}
            onChange={(evento) => set('usoCfdi', evento.target.value)}
            disabled={!campos.regimenFiscalReceptor}
            error={Boolean(erroresCampo.usoCfdi)}
            helperText={erroresCampo.usoCfdi ?? (!campos.regimenFiscalReceptor ? 'Elige primero el régimen fiscal' : undefined)}
          >
            {opcionesUsoCfdi.map((valor) => (
              <MenuItem key={valor.clave} value={valor.clave}>{valor.clave} · {valor.descripcion}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Forma de pago (SAT)"
            value={campos.formaPago}
            onChange={(evento) => set('formaPago', evento.target.value)}
            error={Boolean(erroresCampo.formaPago)}
            helperText={erroresCampo.formaPago}
          >
            {(catalogos.data?.formaPago ?? []).map((valor) => (
              <MenuItem key={valor.clave} value={valor.clave}>{valor.clave} · {valor.descripcion}</MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Comprobante(s) de pago</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            disabled={descargarComprobante.isPending || comprobantes.length >= 3}
            onClick={usarComprobanteDelCobro}
            startIcon={<MsIcon name="receipt" size={17} />}
          >
            {descargarComprobante.isPending ? 'Obteniendo…' : 'Usar el comprobante del cobro'}
          </Button>
          <Button component="label" variant="text" size="small" disabled={comprobantes.length >= 3} startIcon={<MsIcon name="upload" size={17} />}>
            Adjuntar otro
            <input
              type="file"
              hidden
              accept={MIME_PERMITIDOS.join(',')}
              onChange={(evento) => {
                agregarArchivo(evento.target.files?.[0]);
                evento.target.value = '';
              }}
            />
          </Button>
        </Box>
        {comprobantes.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
            {comprobantes.map((archivo, indice) => (
              <Box key={`${archivo.name}-${indice}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MsIcon name="description" size={15} color="#A7ADB3" />
                <Typography noWrap sx={{ fontSize: 12, flex: 1 }}>{archivo.name}</Typography>
                <Button size="small" color="error" onClick={() => quitarArchivo(indice)}>Quitar</Button>
              </Box>
            ))}
          </Box>
        ) : null}
        {erroresCampo.comprobantes ? (
          <Typography sx={{ fontSize: 12, color: 'error.main', mt: 0.5 }}>{erroresCampo.comprobantes}</Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={crear.isPending || !origenes.data?.some((o) => o.clave === 'CONSTANCIA')}
          onClick={enviar}
          startIcon={<MsIcon name="send" size={18} />}
        >
          {crear.isPending ? 'Enviando…' : 'Enviar solicitud a GAF'}
        </Button>
      </Box>
    </Box>
  );
}

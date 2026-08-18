import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { esApiError } from '@/api/errors';
import { formatMxn } from '@/api/serializers';
import { MsIcon } from '@/shared/components';
import { tieneRevalidacion, tieneRevalidacionNegativa, useRegistrarValidacion, useRegistrarValidacionNoRegistro } from '@/features/validaciones/api';
import { borradoresOptions, tarifasActivasOptions, useAplicarBorrador, useCobroDirecto, useGuardarBorrador } from '@/features/cobros/api';
import { useEmitirConstancia } from '@/features/constancias/api';
import { MIME_PERMITIDOS } from '@/features/evidencias/api';
import { motivosReduccionOptions } from '@/features/motivos-reduccion/api';
import type { TramiteDetalle } from '../api';

const FORMAS_PAGO_SAT = [
  { valor: '01', etiqueta: '01 · Efectivo' },
  { valor: '03', etiqueta: '03 · Transferencia' },
  { valor: '04', etiqueta: '04 · Tarjeta de crédito' },
  { valor: '28', etiqueta: '28 · Tarjeta de débito' },
] as const;

function Card({ children, deshabilitada = false }: { children: React.ReactNode; deshabilitada?: boolean }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2.5,
        opacity: deshabilitada ? 0.55 : 1,
        pointerEvents: deshabilitada ? 'none' : 'auto',
      }}
    >
      {children}
    </Box>
  );
}

// Paso 3 · Cobro y emisión. Estado APROBADO: revalidación OUC + captura del
// cobro (directo o vía borrador compartido entre ventanillas). Estado COBRO:
// emisión de la constancia (PDF + vigencia; firma vía Servicio de Firma).
export function PasoCobro({ tramite }: { tramite: TramiteDetalle }) {
  const notificar = useNotificar();
  const enCobro = tramite.estado === 'COBRO';

  // --- Revalidación antes de cobrar (ambos tipos la requieren) ---
  // Cada tipo revalida contra su propio hecho (adeudo o registro) y su propio
  // endpoint; los predicados eligen el arreglo y el resultado por tipo.
  const esNoAdeudo = tramite.tipoConstancia === 'NO_ADEUDO';
  const registrarValidacion = useRegistrarValidacion(tramite.id);
  const registrarNoRegistro = useRegistrarValidacionNoRegistro(tramite.id);
  const revalidando = registrarValidacion.isPending || registrarNoRegistro.isPending;
  const revalidada = tieneRevalidacion(tramite);
  const revalidadaConHallazgo = tieneRevalidacionNegativa(tramite);
  const requiereRevalidacion = !enCobro;
  const puedeCobrar = enCobro ? false : revalidada;

  // Registra la revalidación al cobro en el endpoint correcto según el tipo.
  const registrarRevalidacion = (positivo: boolean) => {
    const alTerminar = {
      onSuccess: () =>
        positivo
          ? notificar.exito(esNoAdeudo ? 'Revalidación registrada: sin adeudo.' : 'Revalidación registrada: sin registro.')
          : notificar.info(esNoAdeudo ? 'Adeudo sobrevenido registrado.' : 'Registro sobrevenido registrado.'),
      onError: (error: unknown) => notificar.error(error),
    };
    if (esNoAdeudo) {
      registrarValidacion.mutate({ momento: 'REVALIDACION_COBRO', resultado: positivo ? 'SIN_ADEUDO' : 'CON_ADEUDO' }, alTerminar);
    } else {
      registrarNoRegistro.mutate({ momento: 'REVALIDACION_COBRO', resultado: positivo ? 'SIN_REGISTRO' : 'CON_REGISTRO' }, alTerminar);
    }
  };

  // --- Cobro ---
  const tarifas = useQuery(tarifasActivasOptions(tramite.tipoConstancia));
  const motivosReduccion = useQuery(motivosReduccionOptions(true));
  const borradores = useQuery({ ...borradoresOptions(tramite.id), enabled: !enCobro });
  const borradorAbierto = borradores.data?.find((b) => b.estado === 'ABIERTO');
  const guardarBorrador = useGuardarBorrador(tramite.id);
  const aplicarBorrador = useAplicarBorrador(tramite.id);
  const cobroDirecto = useCobroDirecto(tramite.id);

  const [tarifaId, setTarifaId] = useState('');
  const [motivoReduccionId, setMotivoReduccionId] = useState('');
  const [formaPago, setFormaPago] = useState('01');
  const [metodoPago, setMetodoPago] = useState<'PUE' | 'PPD'>('PUE');
  const [facturaSolicitadaEnVentanilla, setFacturaSolicitada] = useState(false);
  const [referenciaPago, setReferenciaPago] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const comprobanteRef = useRef<HTMLInputElement>(null);
  const precargado = useRef(false);

  // Prefill desde el borrador ABIERTO (cualquier ventanilla puede continuarlo).
  useEffect(() => {
    if (precargado.current || !borradorAbierto) return;
    precargado.current = true;
    if (borradorAbierto.tarifaId) setTarifaId(borradorAbierto.tarifaId);
    if (borradorAbierto.motivoReduccionId) setMotivoReduccionId(borradorAbierto.motivoReduccionId);
    if (borradorAbierto.formaPago) setFormaPago(borradorAbierto.formaPago);
    if (borradorAbierto.metodoPago) setMetodoPago(borradorAbierto.metodoPago);
    if (borradorAbierto.facturaSolicitadaEnVentanilla !== null) setFacturaSolicitada(borradorAbierto.facturaSolicitadaEnVentanilla);
    if (borradorAbierto.referenciaPago) setReferenciaPago(borradorAbierto.referenciaPago);
  }, [borradorAbierto]);

  useEffect(() => {
    if (!tarifaId && tarifas.data?.length === 1) setTarifaId(tarifas.data[0]!.id);
  }, [tarifas.data, tarifaId]);

  const tarifa = tarifas.data?.find((t) => t.id === tarifaId);
  const motivo = motivosReduccion.data?.find((m) => m.id === motivoReduccionId);
  // Estimación de presentación (el porcentaje real lo deriva y verifica el
  // backend desde el catálogo, nunca confía en un número enviado por el cliente).
  const totalEstimado = useMemo(() => {
    if (!tarifa) return null;
    const base = Number(tarifa.monto);
    if (Number.isNaN(base)) return null;
    const porcentaje = motivo ? Number(motivo.porcentaje) : 0;
    return (base * (1 - porcentaje / 100)).toFixed(2);
  }, [tarifa, motivo]);

  const valoresBorrador = {
    ...(tarifaId ? { tarifaId } : {}),
    motivoReduccionId: motivoReduccionId || null,
    formaPago,
    metodoPago,
    facturaSolicitadaEnVentanilla,
    ...(referenciaPago.trim() ? { referenciaPago: referenciaPago.trim() } : {}),
    ...(comprobante ? { comprobante } : {}),
  };

  const guardar = () => {
    guardarBorrador.mutate(
      { borradorId: borradorAbierto?.id, valores: valoresBorrador },
      {
        onSuccess: () => notificar.exito('Borrador de cobro guardado. Cualquier ventanilla puede continuarlo.'),
        onError: (error) => {
          if (esApiError(error) && error.code === 'DRAFT_ALREADY_OPEN') void borradores.refetch();
          notificar.error(error);
        },
      },
    );
  };

  const cobrar = () => {
    if (!tarifaId) return;
    const alTerminar = {
      onSuccess: () => notificar.exito('Cobro registrado. El trámite pasó a COBRO: emite la constancia.'),
      onError: (error: unknown) => notificar.error(error),
    };
    if (borradorAbierto) {
      // Aplicar exige coincidencia exacta borrador↔cobro: sincronizamos y aplicamos.
      guardarBorrador.mutate(
        { borradorId: borradorAbierto.id, valores: valoresBorrador },
        {
          onSuccess: () => aplicarBorrador.mutate(borradorAbierto.id, alTerminar),
          onError: (error) => notificar.error(error),
        },
      );
    } else {
      cobroDirecto.mutate(
        { tarifaId, motivoReduccionId: motivoReduccionId || null, formaPago, metodoPago, moneda: 'MXN', facturaSolicitadaEnVentanilla, ...(referenciaPago.trim() ? { referenciaPago: referenciaPago.trim() } : {}), ...(comprobante ? { comprobante } : {}) },
        alTerminar,
      );
    }
  };

  // --- Emisión (estado COBRO) ---
  // El PDF lo genera el backend desde la plantilla del tipo de constancia; aquí
  // no se adjunta ni se captura nada. La vigencia y el firmante salen de la
  // configuración que TI define en Administración.
  const emitir = useEmitirConstancia(tramite.id);

  const emitirConstancia = () => {
    emitir.mutate(undefined, {
      onSuccess: () => notificar.exito('Constancia generada, firmada y emitida.'),
      onError: (error) => {
        notificar.error(error);
        notificar.info('El trámite sigue en COBRO: puedes reintentar la emisión.');
      },
    });
  };

  const ocupado = guardarBorrador.isPending || aplicarBorrador.isPending || cobroDirecto.isPending;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {/* Revalidación antes de cobrar (según el tipo: adeudo o registro) */}
      {requiereRevalidacion ? (
        <Card>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <MsIcon name="restart_alt" size={20} color="#5B132B" />
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
              {esNoAdeudo ? 'Revalidación de no adeudo' : 'Revalidación de no registro'}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 1.75 }}>
            {esNoAdeudo
              ? 'Se revalida la situación de adeudo antes de cobrar. Si apareció un adeudo desde la aprobación, no procede el cobro.'
              : 'Se revalida la búsqueda en el padrón antes de cobrar. Si apareció registro desde la aprobación, no procede el cobro.'}
          </Typography>
          {revalidada ? (
            <Alert severity="success" icon={<MsIcon name="check_circle" size={20} />}>
              {esNoAdeudo
                ? 'Sin adeudo confirmado · revalidación al cobrar — procede el cobro.'
                : 'Sin registro confirmado · revalidación al cobrar — procede el cobro.'}
            </Alert>
          ) : revalidadaConHallazgo ? (
            <Alert severity="error" icon={<MsIcon name="error" size={20} />}>
              {esNoAdeudo
                ? 'Adeudo sobrevenido detectado: no procede el cobro. Rechaza el trámite.'
                : 'Registro sobrevenido detectado: no procede el cobro. Rechaza el trámite.'}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button
                variant="contained"
                disabled={revalidando}
                onClick={() => registrarRevalidacion(true)}
                startIcon={<MsIcon name={esNoAdeudo ? 'plumbing' : 'map'} size={17} />}
              >
                {esNoAdeudo ? 'Confirmar sin adeudo en OUC' : 'Confirmar sin registro en padrón'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                disabled={revalidando}
                onClick={() => registrarRevalidacion(false)}
                sx={{ borderColor: '#BA1A1A', color: '#BA1A1A' }}
              >
                {esNoAdeudo ? 'Registrar adeudo sobrevenido' : 'Registrar registro sobrevenido'}
              </Button>
            </Box>
          )}
        </Card>
      ) : null}

      {/* Cobro */}
      {!enCobro ? (
        <Card deshabilitada={!puedeCobrar}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Cobro</Typography>
            {borradorAbierto ? (
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#1565C0' }}>
                Borrador abierto — se aplicará al cobrar
              </Typography>
            ) : null}
          </Box>

          <TextField
            select
            label="Tarifa"
            value={tarifaId}
            onChange={(evento) => setTarifaId(evento.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            helperText={tarifas.data?.length === 0 ? 'No hay tarifa activa para este tipo: TI debe publicar una.' : undefined}
          >
            {(tarifas.data ?? []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.concepto} · v{t.version} · {formatMxn(t.monto)}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              select
              label="Reducción"
              value={motivoReduccionId}
              onChange={(evento) => setMotivoReduccionId(evento.target.value)}
              helperText={motivosReduccion.data?.length === 0 ? 'Sin motivos activos: TI puede publicar en Administración.' : undefined}
            >
              <MenuItem value="">Sin reducción</MenuItem>
              {(motivosReduccion.data ?? []).map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre} — {Number(m.porcentaje)} %
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Forma de pago (SAT)" value={formaPago} onChange={(evento) => setFormaPago(evento.target.value)}>
              {FORMAS_PAGO_SAT.map((f) => (
                <MenuItem key={f.valor} value={f.valor}>{f.etiqueta}</MenuItem>
              ))}
            </TextField>
            <TextField label="Moneda" value="MXN" disabled />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 1 }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Método de pago</Typography>
              <RadioGroup row value={metodoPago} onChange={(evento) => setMetodoPago(evento.target.value as 'PUE' | 'PPD')}>
                <FormControlLabel value="PUE" control={<Radio size="small" />} label="PUE · Una exhibición" />
                <FormControlLabel value="PPD" control={<Radio size="small" />} label="PPD · Parcialidades" />
              </RadioGroup>
            </Box>
            <TextField label="Referencia de pago (opcional)" value={referenciaPago} onChange={(evento) => setReferenciaPago(evento.target.value)} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            <input
              ref={comprobanteRef}
              type="file"
              hidden
              accept={MIME_PERMITIDOS.join(',')}
              onChange={(evento) => setComprobante(evento.target.files?.[0] ?? null)}
            />
            <Button variant="outlined" size="small" onClick={() => comprobanteRef.current?.click()} startIcon={<MsIcon name="receipt" size={17} />}>
              {comprobante ? 'Cambiar comprobante' : 'Adjuntar comprobante de pago (opcional)'}
            </Button>
            {comprobante ? (
              <Typography noWrap sx={{ fontSize: 12, color: 'success.main' }}>{comprobante.name}</Typography>
            ) : borradorAbierto?.comprobanteNombreOriginal ? (
              <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
                Ya hay un comprobante adjunto: «{borradorAbierto.comprobanteNombreOriginal}» — elegir uno nuevo lo reemplaza.
              </Typography>
            ) : null}
          </Box>

          {/* Facturación — se registra la intención; el CFDI lo emite Finanzas */}
          <Box sx={{ borderTop: '1px solid', borderTopColor: 'divider', pt: 1.75, mt: 1 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>¿El ciudadano solicita factura?</Typography>
            <RadioGroup row value={facturaSolicitadaEnVentanilla ? 'si' : 'no'} onChange={(evento) => setFacturaSolicitada(evento.target.value === 'si')}>
              <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
              <FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
            </RadioGroup>
            <Alert severity="info" icon={<MsIcon name={facturaSolicitadaEnVentanilla ? 'receipt_long' : 'groups'} size={19} />} sx={{ mt: 1 }}>
              {facturaSolicitadaEnVentanilla
                ? 'La factura no se emite aquí: indíquele que la solicite en el portal con el folio de su constancia. Este dato queda sólo como registro de lo que contestó hoy.'
                : 'No se registra solicitud de factura. Si cambia de opinión, puede pedirla después en el portal con el folio de su constancia.'}
            </Alert>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1.75, mt: 1.75, borderTop: '1px solid', borderTopColor: 'divider' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>Total a cobrar</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: 'primary.main' }}>
              {totalEstimado ? formatMxn(totalEstimado) : '—'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25, mt: 1.75 }}>
            <Button variant="outlined" disabled={ocupado} onClick={guardar} startIcon={<MsIcon name="save" size={17} />}>
              Guardar borrador
            </Button>
            <Button variant="contained" disabled={ocupado || !tarifaId} onClick={cobrar} startIcon={<MsIcon name="payments" size={18} />}>
              Cobrar
            </Button>
          </Box>
        </Card>
      ) : null}

      {/* Emisión de constancia (estado COBRO) */}
      {enCobro ? (
        <Card>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
            <MsIcon name="workspace_premium" size={20} color="#5B132B" />
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Emitir constancia</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 2 }}>
            El sistema genera el documento con su folio único y el código QR de verificación, y registra el hash SHA-256
            del archivo como ancla de integridad. La constancia se entrega firmada de forma autógrafa.
          </Typography>
          <Alert severity="info" icon={<MsIcon name="description" size={19} />} sx={{ mb: 2 }}>
            La vigencia y el firmante impresos salen de la configuración de constancias que TI define en Administración.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={emitir.isPending} onClick={emitirConstancia} startIcon={<MsIcon name="verified" size={18} />}>
              {emitir.isPending ? 'Generando y firmando…' : 'Generar y emitir constancia'}
            </Button>
          </Box>
        </Card>
      ) : null}
    </Box>
  );
}

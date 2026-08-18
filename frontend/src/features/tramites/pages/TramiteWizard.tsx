import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { useNotificar } from '@/store/useNotificar';
import { EstadoDeBadge, ESTADO_TRAMITE, MsIcon } from '@/shared/components';
import { catalogoVistaPreviaOptions, gruposAplicables } from '@/features/catalogos/api';
import { ChecklistRequisitos, checklistSatisfecho } from '@/features/evidencias/ChecklistRequisitos';
import { tieneValidacionInicial } from '@/features/validaciones/api';
import { folioTramite, tramiteOptions, useTransicionarTramite, type TramiteDetalle } from '../api';
import { PasoAprobacion } from '../components/PasoAprobacion';
import { PasoCobro } from '../components/PasoCobro';
import { PasoEntrega } from '../components/PasoEntrega';
import { PasoValidacion } from '../components/PasoValidacion';
import { RechazoDialog } from '../components/RechazoDialog';
import { ResumenPanel } from '../components/ResumenPanel';
import { StateStepper } from '../components/StateStepper';

// El paso activo se deriva del estado del trámite (server); sólo la sub-vista
// de APROBADO (aprobación → cobro) es estado local de UI.
export function derivarPaso(
  tramite: Pick<TramiteDetalle, 'estado' | 'constancia' | 'cobro' | 'plazoPagoHasta'>,
  subVistaCobro: boolean,
): number {
  switch (tramite.estado) {
    case 'CAPTURA':
      return 0;
    case 'EN_VALIDACION':
      return 1;
    case 'APROBADO':
      return subVistaCobro ? 3 : 2;
    case 'COBRO':
      return tramite.constancia ? 4 : 3;
    case 'FINALIZADO':
      return 4;
    case 'RECHAZADO':
    case 'EXPIRADO':
      return tramite.cobro ? 3 : tramite.plazoPagoHasta ? 2 : 1;
    default:
      return 0;
  }
}

export function TramiteWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notificar = useNotificar();
  const [subVistaCobro, setSubVistaCobro] = useState(false);
  const [rechazoAbierto, setRechazoAbierto] = useState(false);

  const consulta = useQuery(tramiteOptions(id ?? ''));
  const tramite = consulta.data;
  const transicionar = useTransicionarTramite(id ?? '');
  const catalogo = useQuery({ ...catalogoVistaPreviaOptions(tramite?.versionCatalogoId ?? ''), enabled: Boolean(tramite) });

  const satisfecho = useMemo(() => {
    if (!tramite || !catalogo.data) return false;
    const grupos = gruposAplicables(catalogo.data, {
      tipoConstancia: tramite.tipoConstancia,
      personalidad: tramite.personalidad,
      representacion: tramite.representacion,
    });
    const porDocumento = new Map(
      tramite.evidencias.map((e) => [e.opcionDocumentoId, { estado: e.estado }]),
    );
    return checklistSatisfecho(grupos, porDocumento);
  }, [tramite, catalogo.data]);

  if (consulta.isPending) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>Cargando expediente…</Typography>
      </Box>
    );
  }
  if (!tramite) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>Trámite no encontrado.</Typography>
      </Box>
    );
  }

  const paso = derivarPaso(tramite, subVistaCobro);
  const terminadoMal = tramite.estado === 'RECHAZADO' || tramite.estado === 'EXPIRADO';
  const titular = tramite.personas[0]?.persona;

  const ejecutar = (accion: 'iniciar-validacion' | 'aprobar' | 'rechazar' | 'expirar' | 'finalizar', motivo?: string) => {
    transicionar.mutate(
      { accion, ...(motivo ? { motivo } : {}) },
      {
        onSuccess: () => {
          setRechazoAbierto(false);
          if (accion === 'iniciar-validacion') notificar.exito('Checklist satisfecho. El trámite pasó a validación.');
          if (accion === 'aprobar') notificar.exito('Trámite aprobado. Se estampó el plazo de pago.');
          if (accion === 'rechazar') notificar.info('El trámite fue rechazado y cerrado.');
          if (accion === 'finalizar') notificar.exito('Trámite finalizado.');
        },
        onError: (error) => notificar.error(error),
      },
    );
  };

  // Acción primaria contextual del pie. Las guardas duras las impone la BD;
  // aquí sólo se anticipan para una UX clara (un 409 igualmente se traduce).
  const validacionInicialOk = tieneValidacionInicial(tramite);
  const plazoVencido = tramite.plazoPagoHasta ? new Date(tramite.plazoPagoHasta).getTime() < Date.now() : false;

  let primario: { label: string; icon: string; disabled: boolean; onClick: () => void } | null = null;
  if (!terminadoMal) {
    if (paso === 0) {
      primario = {
        label: 'Continuar a validación',
        icon: 'chevron_right',
        disabled: !satisfecho || transicionar.isPending,
        onClick: () => ejecutar('iniciar-validacion'),
      };
    } else if (paso === 1) {
      primario = {
        label: 'Aprobar trámite',
        icon: 'check',
        disabled: !validacionInicialOk || transicionar.isPending,
        onClick: () => ejecutar('aprobar'),
      };
    } else if (paso === 2) {
      primario = plazoVencido
        ? { label: 'Marcar expirado', icon: 'timer_off', disabled: transicionar.isPending, onClick: () => ejecutar('expirar') }
        : { label: 'Iniciar cobro', icon: 'payments', disabled: false, onClick: () => setSubVistaCobro(true) };
    } else if (paso === 4 && tramite.estado === 'COBRO') {
      primario = {
        label: 'Finalizar',
        icon: 'done_all',
        disabled: transicionar.isPending,
        onClick: () => ejecutar('finalizar'),
      };
    } else if (tramite.estado === 'FINALIZADO') {
      primario = { label: 'Volver a ventanilla', icon: 'home', disabled: false, onClick: () => void navigate('/ventanilla') };
    }
  }

  return (
    <>
      {/* Encabezado del wizard */}
      <Box sx={{ flexShrink: 0, bgcolor: 'background.paper', borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 3.5, pt: 1.75, pb: 1.5, gap: 1.75 }}>
          <IconButton size="small" onClick={() => void navigate('/ventanilla')} sx={{ color: 'text.secondary' }}>
            <MsIcon name="arrow_back" size={22} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
              Trámite {folioTramite(tramite)} · {tramite.tipoConstancia === 'NO_ADEUDO' ? 'Constancia de No Adeudo' : 'Constancia de No Registro'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mt: 0.25 }}>
              {titular?.nombreRazonSocial ?? '—'}
              {tramite.nis ? ` · NIS ${tramite.nis}` : ''}
            </Typography>
          </Box>
          <EstadoDeBadge estado={tramite.estado} mapa={ESTADO_TRAMITE} />
        </Box>
        <StateStepper pasoActivo={paso} />
      </Box>

      {/* Cuerpo: área de trabajo + panel lateral */}
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', px: 3.5, pt: 3, pb: 5 }}>
          <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.25 }}>
            {tramite.estado === 'RECHAZADO' ? (
              <Alert severity="error" icon={<MsIcon name="block" size={20} />}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Trámite rechazado</Typography>
                <Typography sx={{ fontSize: 13 }}>
                  {tramite.motivoRechazo || 'Sin motivo registrado.'} — El trámite se cierra sin emisión; obtener la
                  constancia requiere iniciar uno nuevo.
                </Typography>
              </Alert>
            ) : null}
            {tramite.estado === 'EXPIRADO' ? (
              <Alert severity="warning" icon={<MsIcon name="timer_off" size={20} />}>
                El plazo de pago venció sin cobro. El trámite expiró y se cierra sin emisión.
              </Alert>
            ) : null}

            {paso === 0 ? <ChecklistRequisitos tramite={tramite} soloLectura={terminadoMal} /> : null}
            {paso === 1 ? <PasoValidacion tramite={tramite} /> : null}
            {paso === 2 ? <PasoAprobacion tramite={tramite} /> : null}
            {paso === 3 ? <PasoCobro tramite={tramite} /> : null}
            {paso === 4 ? <PasoEntrega tramite={tramite} /> : null}
          </Box>
        </Box>
        <ResumenPanel tramite={tramite} />
      </Box>

      {/* Pie de acciones */}
      <Box
        sx={{
          flexShrink: 0,
          borderTop: '1px solid',
          borderTopColor: 'divider',
          bgcolor: 'background.paper',
          px: 3.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {paso === 3 && tramite.estado === 'APROBADO' ? (
          <Button variant="text" onClick={() => setSubVistaCobro(false)} startIcon={<MsIcon name="chevron_left" size={18} />}>
            Atrás
          </Button>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {paso === 0 && !terminadoMal ? (
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled' }}>
            {satisfecho ? 'Checklist completo: puedes continuar.' : 'Adjunta y valida los documentos del checklist para continuar.'}
          </Typography>
        ) : null}
        {paso === 1 && !terminadoMal && !validacionInicialOk ? (
          <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled' }}>
            {tramite.tipoConstancia === 'NO_ADEUDO'
              ? 'Registra el resultado del cruce OUC para poder aprobar.'
              : 'Registra la búsqueda en el padrón para poder aprobar.'}
          </Typography>
        ) : null}
        {!terminadoMal && paso >= 1 && paso <= 3 && (tramite.estado === 'EN_VALIDACION' || tramite.estado === 'APROBADO') ? (
          <Button variant="outlined" onClick={() => setRechazoAbierto(true)}>Rechazar</Button>
        ) : null}
        {primario ? (
          <Button variant="contained" disabled={primario.disabled} onClick={primario.onClick} endIcon={<MsIcon name={primario.icon} size={18} />}>
            {primario.label}
          </Button>
        ) : null}
      </Box>

      <RechazoDialog
        open={rechazoAbierto}
        onClose={() => setRechazoAbierto(false)}
        onConfirm={(motivo) => ejecutar('rechazar', motivo)}
        pendiente={transicionar.isPending}
      />
    </>
  );
}

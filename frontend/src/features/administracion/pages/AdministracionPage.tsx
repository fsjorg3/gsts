import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { useNotificar } from '@/store/useNotificar';
import { formatFecha, formatMxn } from '@/api/serializers';
import { EstadoBadge, MsIcon } from '@/shared/components';
import { catalogoActivoOptions, catalogosListaOptions, catalogoVistaPreviaOptions } from '@/features/catalogos/api';
import { tarifasActivasOptions } from '@/features/cobros/api';
import { motivosReduccionOptions, useActualizarMotivoReduccion, useCrearMotivoReduccion } from '@/features/motivos-reduccion/api';
import {
  configuracionConstanciaOptions,
  plazosOptions,
  useAgregarDocumento,
  useAgregarGrupo,
  useAgregarOpcion,
  useCrearCatalogo,
  useCrearTarifa,
  useGuardarConfiguracionConstancia,
  useGuardarPlazos,
  usePublicarCatalogo,
  usePublicarTarifa,
  useValidarCatalogo,
  type Tarifa,
  type TipoConstancia,
  type VersionCatalogo,
} from '../api';

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>{titulo}</Typography>
      {children}
    </Box>
  );
}

// ---------- Plazos ----------
function PanelPlazos() {
  const notificar = useNotificar();
  const vigente = useQuery(plazosOptions);
  const guardar = useGuardarPlazos();
  const [pago, setPago] = useState('');
  const [editado, setEditado] = useState(false);

  // Precarga desde el servidor una sola vez; si el usuario ya está editando,
  // no pisar lo que está escribiendo (p. ej. tras el refetch al guardar).
  useEffect(() => {
    if (editado || !vigente.data) return;
    setPago(String(vigente.data.plazoPagoDias));
  }, [vigente.data, editado]);

  return (
    <Card titulo="Plazos operativos">
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
        El plazo de pago se estampa al aprobar un trámite. El plazo para solicitar factura ya no se configura aquí: lo
        calcula el sistema Finanzas desde la fecha de pago.
      </Typography>
      {!vigente.isPending && !vigente.data ? (
        <Alert severity="info" icon={<MsIcon name="info" size={20} />} sx={{ mb: 2 }}>
          Aún no hay una configuración guardada; se creará al guardar por primera vez.
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField label="Plazo de pago (días)" value={pago} onChange={(e) => { setEditado(true); setPago(e.target.value.replace(/\D/g, '')); }} sx={{ width: 200 }} />
        <Button
          variant="contained"
          disabled={!Number(pago) || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              { plazoPagoDias: Number(pago) },
              { onSuccess: () => { setEditado(false); notificar.exito('Plazos operativos actualizados.'); }, onError: (error) => notificar.error(error) },
            )
          }
        >
          Guardar plazos
        </Button>
      </Box>
    </Card>
  );
}

// ---------- Constancias (vigencia y firmante impresos en el PDF) ----------
function FormularioConstancia({ tipo, etiqueta }: { tipo: TipoConstancia; etiqueta: string }) {
  const notificar = useNotificar();
  const vigente = useQuery(configuracionConstanciaOptions(tipo));
  const guardar = useGuardarConfiguracionConstancia(tipo);
  const [dias, setDias] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [oficio, setOficio] = useState('');
  const [editado, setEditado] = useState(false);
  const anioActual = new Date().getFullYear();

  useEffect(() => {
    if (editado || !vigente.data) return;
    setDias(String(vigente.data.vigenciaDias));
    setNombre(vigente.data.firmanteNombre);
    setCargo(vigente.data.firmanteCargo);
    setOficio(vigente.data.oficioPrefijo);
  }, [vigente.data, editado]);

  const listo = Boolean(Number(dias)) && nombre.trim() !== '' && cargo.trim() !== '' && oficio.trim() !== '';

  return (
    <Box sx={{ mb: 3 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.25 }}>{etiqueta}</Typography>
      {!vigente.isPending && !vigente.data ? (
        <Alert severity="warning" icon={<MsIcon name="warning" size={20} />} sx={{ mb: 1.75 }}>
          Sin configurar: no se pueden emitir constancias de este tipo hasta guardar la vigencia y el firmante.
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField label="Vigencia (días naturales)" value={dias} onChange={(e) => { setEditado(true); setDias(e.target.value.replace(/\D/g, '')); }} sx={{ width: 190 }} />
        <TextField label="Nombre del firmante" value={nombre} onChange={(e) => { setEditado(true); setNombre(e.target.value); }} sx={{ width: 280 }} />
        <TextField label="Cargo del firmante" value={cargo} onChange={(e) => { setEditado(true); setCargo(e.target.value); }} sx={{ width: 320 }} />
        <TextField
          label="Prefijo de oficio"
          value={oficio}
          onChange={(e) => { setEditado(true); setOficio(e.target.value); }}
          helperText={oficio.trim() ? `Se imprime como "${oficio.trim()}/${anioActual}"` : 'Ej. SOAPAP/GSTS/CNR'}
          sx={{ width: 260 }}
        />
        <Button
          variant="contained"
          disabled={!listo || guardar.isPending}
          onClick={() =>
            guardar.mutate(
              { vigenciaDias: Number(dias), firmanteNombre: nombre.trim(), firmanteCargo: cargo.trim(), oficioPrefijo: oficio.trim() },
              { onSuccess: () => { setEditado(false); notificar.exito(`Configuración de ${etiqueta} actualizada.`); }, onError: (error) => notificar.error(error) },
            )
          }
        >
          Guardar
        </Button>
      </Box>
    </Box>
  );
}

function PanelConstancias() {
  return (
    <Card titulo="Constancias emitidas">
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2.5 }}>
        El sistema genera el PDF de la constancia con estos datos: la vigencia se cuenta en días naturales desde la
        emisión y se imprime en el cuerpo del documento; el nombre y el cargo aparecen en el bloque de firma. Cambiarlos
        no altera constancias ya emitidas.
      </Typography>
      <FormularioConstancia tipo="NO_REGISTRO" etiqueta="No Registro" />
      <FormularioConstancia tipo="NO_ADEUDO" etiqueta="No Adeudo" />
      <Alert severity="info" icon={<MsIcon name="info" size={20} />}>
        La plantilla de No Adeudo aún no existe: su texto legal está por confirmarse, así que la emisión de ese tipo
        seguirá rechazándose aunque se configure aquí.
      </Alert>
    </Card>
  );
}

// ---------- Tarifas ----------
function PanelTarifas() {
  const notificar = useNotificar();
  const activasNa = useQuery(tarifasActivasOptions('NO_ADEUDO'));
  const activasNr = useQuery(tarifasActivasOptions('NO_REGISTRO'));
  const crear = useCrearTarifa();
  const publicar = usePublicarTarifa();
  const [tipo, setTipo] = useState<'NO_ADEUDO' | 'NO_REGISTRO'>('NO_ADEUDO');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [version, setVersion] = useState('1');
  const [borrador, setBorrador] = useState<Tarifa | null>(null);

  const activas = [...(activasNa.data ?? []), ...(activasNr.data ?? [])];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Card titulo="Tarifas vigentes">
        {activas.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>No hay tarifas activas.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activas.map((t) => (
              <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                <EstadoBadge label={t.tipoConstancia === 'NO_ADEUDO' ? 'No adeudo' : 'No registro'} color="vino" />
                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{t.concepto} · v{t.version}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{formatMxn(t.monto)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card titulo="Nueva tarifa (publicar desactiva la anterior del mismo tipo y concepto)">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 0.7fr', gap: 2, mb: 2 }}>
          <TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <MenuItem value="NO_ADEUDO">No adeudo</MenuItem>
            <MenuItem value="NO_REGISTRO">No registro</MenuItem>
          </TextField>
          <TextField label="Concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Constancia de no adeudo" />
          <TextField label="Monto (MXN)" value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))} />
          <TextField label="Versión" value={version} onChange={(e) => setVersion(e.target.value.replace(/\D/g, ''))} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
          <Button
            variant="outlined"
            disabled={!concepto.trim() || !Number(monto) || !Number(version) || crear.isPending}
            onClick={() =>
              crear.mutate(
                { tipoConstancia: tipo, concepto: concepto.trim(), monto: Number(monto), version: Number(version) },
                { onSuccess: (t) => { setBorrador(t); notificar.exito('Borrador de tarifa creado.'); }, onError: (error) => notificar.error(error) },
              )
            }
          >
            Crear borrador
          </Button>
          {borrador ? (
            <>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Borrador: {borrador.concepto} · {formatMxn(borrador.monto)}
              </Typography>
              <Button
                variant="contained"
                disabled={publicar.isPending}
                onClick={() =>
                  publicar.mutate(borrador.id, {
                    onSuccess: () => { setBorrador(null); notificar.exito('Tarifa publicada y activada.'); },
                    onError: (error) => notificar.error(error),
                  })
                }
              >
                Publicar y activar
              </Button>
            </>
          ) : null}
        </Box>
      </Card>
    </Box>
  );
}

// ---------- Catálogo de requisitos ----------
function PanelCatalogo() {
  const notificar = useNotificar();
  const queryClient = useQueryClient();
  const activo = useQuery(catalogoActivoOptions);
  const lista = useQuery(catalogosListaOptions);
  const crear = useCrearCatalogo();
  const validar = useValidarCatalogo();
  const publicar = usePublicarCatalogo();
  const [borrador, setBorrador] = useState<VersionCatalogo | null>(null);
  const [errores, setErrores] = useState<string[] | null>(null);
  const vistaPrevia = useQuery({ ...catalogoVistaPreviaOptions(borrador?.id ?? ''), enabled: Boolean(borrador) });

  // La versión es única en toda la tabla (publicada o no) — nunca sólo activa+1,
  // o un borrador abandonado (como el que originó este arreglo) choca con el UNIQUE.
  const siguienteVersion = Math.max(0, ...(lista.data ?? []).map((v) => v.version)) + 1;
  const borradoresPendientes = (lista.data ?? []).filter((v) => !v.publicada);
  const refrescarLista = () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'lista'] });

  const agregarGrupo = useAgregarGrupo(borrador?.id ?? '');
  const agregarOpcion = useAgregarOpcion(borrador?.id ?? '');
  const agregarDocumento = useAgregarDocumento(borrador?.id ?? '');

  // Formularios compactos de alta.
  const [grupo, setGrupo] = useState({ clave: '', nombre: '', aplicaTipo: '', aplicaPersonalidad: '', aplicaRepresentacion: '' });
  const [opcion, setOpcion] = useState({ grupoId: '', clave: '', nombre: '' });
  const [documento, setDocumento] = useState({ opcionId: '', nombre: '' });

  const arbol = vistaPrevia.data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Card titulo="Catálogo activo">
        {activo.data ? (
          <Typography sx={{ fontSize: 13 }}>
            Versión <b>{activo.data.version}</b> · {activo.data.grupos.length} grupo(s) · publicado y activo.
          </Typography>
        ) : (
          <Alert severity="warning" icon={<MsIcon name="warning" size={20} />}>
            No hay catálogo activo: ventanilla no puede crear trámites hasta publicar uno.
          </Alert>
        )}
      </Card>

      {!borrador ? (
        <>
          {borradoresPendientes.length > 0 ? (
            <Card titulo="Borradores sin publicar">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {borradoresPendientes.map((v) => (
                  <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                    <EstadoBadge label={`v${v.version}`} color="neutral" />
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }}>Creado {formatFecha(v.createdAt)}</Typography>
                    <Button size="small" variant="outlined" onClick={() => setBorrador(v)}>Continuar</Button>
                  </Box>
                ))}
              </Box>
            </Card>
          ) : null}

          <Card titulo="Nuevo borrador de catálogo">
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                variant="contained"
                disabled={crear.isPending || lista.isPending}
                onClick={() =>
                  crear.mutate(
                    { version: siguienteVersion, ...(activo.data ? { clonarDesdeId: activo.data.id } : {}) },
                    {
                      onSuccess: (v) => {
                        setBorrador(v);
                        refrescarLista();
                        notificar.exito(`Borrador v${v.version} creado${activo.data ? ' (clonado del activo)' : ''}.`);
                      },
                      onError: (error) => notificar.error(error),
                    },
                  )
                }
              >
                {activo.data ? `Crear borrador v${siguienteVersion} clonando el activo` : `Crear catálogo v${siguienteVersion}`}
              </Button>
              {activo.data ? (
                <Button
                  variant="outlined"
                  disabled={crear.isPending || lista.isPending}
                  onClick={() =>
                    crear.mutate(
                      { version: siguienteVersion },
                      {
                        onSuccess: (v) => {
                          setBorrador(v);
                          refrescarLista();
                          notificar.exito(`Borrador v${v.version} creado en blanco.`);
                        },
                        onError: (error) => notificar.error(error),
                      },
                    )
                  }
                >
                  {`Crear v${siguienteVersion} desde cero`}
                </Button>
              ) : null}
            </Box>
          </Card>


        </>
      ) : (
        <>
          <Card titulo={`Borrador v${borrador.version} — estructura`}>
            {arbol && arbol.grupos.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {arbol.grupos.map((g) => (
                  <Box key={g.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0.75, p: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {g.nombre} <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>({g.clave}
                      {g.aplicaTipo ? ` · ${g.aplicaTipo}` : ''}{g.aplicaPersonalidad ? ` · ${g.aplicaPersonalidad}` : ''}
                      {g.aplicaRepresentacion ? ` · ${g.aplicaRepresentacion}` : ''})</Box>
                    </Typography>
                    {g.opciones.map((o) => (
                      <Box key={o.id} sx={{ pl: 2, mt: 0.75 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>◦ {o.nombre} ({o.clave})</Typography>
                        {o.documentos.map((d) => (
                          <Typography key={d.id} sx={{ fontSize: 12, color: 'text.secondary', pl: 2 }}>· {d.nombre}</Typography>
                        ))}
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.disabled', mb: 2 }}>Sin grupos todavía.</Typography>
            )}

            {/* Alta de grupo */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr auto', gap: 1.5, mb: 1.5 }}>
              <TextField label="Clave" value={grupo.clave} onChange={(e) => setGrupo({ ...grupo, clave: e.target.value.toUpperCase() })} />
              <TextField label="Nombre del grupo" value={grupo.nombre} onChange={(e) => setGrupo({ ...grupo, nombre: e.target.value })} />
              <TextField select label="Tipo" value={grupo.aplicaTipo} onChange={(e) => setGrupo({ ...grupo, aplicaTipo: e.target.value })}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="NO_ADEUDO">No adeudo</MenuItem>
                <MenuItem value="NO_REGISTRO">No registro</MenuItem>
              </TextField>
              <TextField select label="Personalidad" value={grupo.aplicaPersonalidad} onChange={(e) => setGrupo({ ...grupo, aplicaPersonalidad: e.target.value })}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="FISICA">Física</MenuItem>
                <MenuItem value="MORAL">Moral</MenuItem>
              </TextField>
              <TextField select label="Representación" value={grupo.aplicaRepresentacion} onChange={(e) => setGrupo({ ...grupo, aplicaRepresentacion: e.target.value })}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="TITULAR">Titular</MenuItem>
                <MenuItem value="REPRESENTANTE">Representante</MenuItem>
                <MenuItem value="APODERADO">Apoderado</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                disabled={!grupo.clave || !grupo.nombre || agregarGrupo.isPending}
                onClick={() =>
                  agregarGrupo.mutate(
                    {
                      clave: grupo.clave,
                      nombre: grupo.nombre,
                      orden: arbol?.grupos.length ?? 0,
                      ...(grupo.aplicaTipo ? { aplicaTipo: grupo.aplicaTipo as 'NO_ADEUDO' | 'NO_REGISTRO' } : {}),
                      ...(grupo.aplicaPersonalidad ? { aplicaPersonalidad: grupo.aplicaPersonalidad as 'FISICA' | 'MORAL' } : {}),
                      ...(grupo.aplicaRepresentacion ? { aplicaRepresentacion: grupo.aplicaRepresentacion as 'TITULAR' | 'REPRESENTANTE' | 'APODERADO' } : {}),
                    },
                    { onSuccess: () => setGrupo({ clave: '', nombre: '', aplicaTipo: '', aplicaPersonalidad: '', aplicaRepresentacion: '' }), onError: (error) => notificar.error(error) },
                  )
                }
              >
                + Grupo
              </Button>
            </Box>

            {/* Alta de opción */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 1.5, mb: 1.5 }}>
              <TextField select label="Grupo destino" value={opcion.grupoId} onChange={(e) => setOpcion({ ...opcion, grupoId: e.target.value })}>
                {(arbol?.grupos ?? []).map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.nombre}</MenuItem>
                ))}
              </TextField>
              <TextField label="Clave" value={opcion.clave} onChange={(e) => setOpcion({ ...opcion, clave: e.target.value.toUpperCase() })} />
              <TextField label="Nombre de la opción" value={opcion.nombre} onChange={(e) => setOpcion({ ...opcion, nombre: e.target.value })} />
              <Button
                variant="outlined"
                disabled={!opcion.grupoId || !opcion.clave || !opcion.nombre || agregarOpcion.isPending}
                onClick={() => {
                  const g = arbol?.grupos.find((x) => x.id === opcion.grupoId);
                  agregarOpcion.mutate(
                    { grupoId: opcion.grupoId, clave: opcion.clave, nombre: opcion.nombre, orden: g?.opciones.length ?? 0 },
                    { onSuccess: () => setOpcion({ grupoId: '', clave: '', nombre: '' }), onError: (error) => notificar.error(error) },
                  );
                }}
              >
                + Opción
              </Button>
            </Box>

            {/* Alta de documento */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 3fr auto', gap: 1.5 }}>
              <TextField select label="Opción destino" value={documento.opcionId} onChange={(e) => setDocumento({ ...documento, opcionId: e.target.value })}>
                {(arbol?.grupos ?? []).flatMap((g) => g.opciones.map((o) => (
                  <MenuItem key={o.id} value={o.id}>{g.nombre} → {o.nombre}</MenuItem>
                )))}
              </TextField>
              <TextField label="Nombre del documento" value={documento.nombre} onChange={(e) => setDocumento({ ...documento, nombre: e.target.value })} />
              <Button
                variant="outlined"
                disabled={!documento.opcionId || !documento.nombre || agregarDocumento.isPending}
                onClick={() => {
                  const o = arbol?.grupos.flatMap((g) => g.opciones).find((x) => x.id === documento.opcionId);
                  agregarDocumento.mutate(
                    { opcionId: documento.opcionId, nombre: documento.nombre, orden: o?.documentos.length ?? 0 },
                    { onSuccess: () => setDocumento({ opcionId: '', nombre: '' }), onError: (error) => notificar.error(error) },
                  );
                }}
              >
                + Documento
              </Button>
            </Box>
          </Card>

          <Card titulo="Validar y publicar">
            {errores ? (
              errores.length === 0 ? (
                <Alert severity="success" icon={<MsIcon name="check_circle" size={20} />} sx={{ mb: 1.5 }}>
                  El catálogo es válido: cubre todas las combinaciones y no tiene duplicados.
                </Alert>
              ) : (
                <Alert severity="error" icon={<MsIcon name="error" size={20} />} sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>El catálogo aún no puede publicarse:</Typography>
                  {errores.map((e) => (
                    <Typography key={e} sx={{ fontSize: 12.5 }}>· {e}</Typography>
                  ))}
                </Alert>
              )
            ) : null}
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button
                variant="outlined"
                disabled={validar.isPending}
                onClick={() =>
                  validar.mutate(borrador.id, {
                    onSuccess: (r) => setErrores(r.errors),
                    onError: (error) => notificar.error(error),
                  })
                }
              >
                Validar
              </Button>
              <Button
                variant="contained"
                disabled={publicar.isPending}
                onClick={() =>
                  publicar.mutate(borrador.id, {
                    onSuccess: () => { setBorrador(null); setErrores(null); refrescarLista(); notificar.exito('Catálogo publicado y activado.'); },
                    onError: (error) => notificar.error(error),
                  })
                }
              >
                Publicar y activar
              </Button>
              <Button variant="text" onClick={() => { setBorrador(null); setErrores(null); }}>Descartar sesión</Button>
            </Box>
          </Card>
        </>
      )}
    </Box>
  );
}

// ---------- Reducciones ----------
function PanelReducciones() {
  const notificar = useNotificar();
  const motivos = useQuery(motivosReduccionOptions());
  const crear = useCrearMotivoReduccion();
  const actualizar = useActualizarMotivoReduccion();
  const [clave, setClave] = useState('');
  const [nombre, setNombre] = useState('');
  const [porcentaje, setPorcentaje] = useState('');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Card titulo="Motivos de reducción">
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
          El porcentaje se congela en cada cobro al momento de aplicarse: editar o desactivar un motivo aquí nunca
          altera cobros ya registrados, sólo deja de ofrecerse hacia adelante.
        </Typography>
        {(motivos.data ?? []).length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>Sin motivos registrados.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(motivos.data ?? []).map((m) => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                <EstadoBadge label={m.activo ? 'Activo' : 'Inactivo'} color={m.activo ? 'success' : 'neutral'} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{m.nombre} <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>({m.clave})</Box></Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{Number(m.porcentaje)} %</Typography>
                <Button
                  size="small"
                  variant="text"
                  disabled={actualizar.isPending}
                  onClick={() =>
                    actualizar.mutate(
                      { id: m.id, activo: !m.activo },
                      { onError: (error) => notificar.error(error) },
                    )
                  }
                >
                  {m.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Card titulo="Nuevo motivo">
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 2, alignItems: 'start' }}>
          <TextField label="Clave" value={clave} onChange={(e) => setClave(e.target.value.toUpperCase())} placeholder="INAPAM" />
          <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="INAPAM / discapacidad" />
          <TextField label="Porcentaje" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value.replace(/[^0-9.]/g, ''))} />
          <Button
            variant="outlined"
            disabled={!clave.trim() || !nombre.trim() || !Number(porcentaje) || crear.isPending}
            onClick={() =>
              crear.mutate(
                { clave: clave.trim(), nombre: nombre.trim(), porcentaje: Number(porcentaje) },
                {
                  onSuccess: () => { setClave(''); setNombre(''); setPorcentaje(''); notificar.exito('Motivo de reducción creado.'); },
                  onError: (error) => notificar.error(error),
                },
              )
            }
          >
            Crear
          </Button>
        </Box>
      </Card>
    </Box>
  );
}

export function AdministracionPage() {
  const [tab, setTab] = useState(0);
  return (
    <>
      <ModuleHeader titulo="Administración" subtitulo="Catálogos, tarifas y plazos operativos (rol TI)" />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5 }}>
        <Box sx={{ maxWidth: 980, mx: 'auto' }}>
          <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} sx={{ mb: 2.25 }}>
            <Tab label="Catálogo de requisitos" />
            <Tab label="Tarifas" />
            <Tab label="Reducciones" />
            <Tab label="Plazos" />
            <Tab label="Constancias" />
          </Tabs>
          {tab === 0 ? <PanelCatalogo /> : null}
          {tab === 1 ? <PanelTarifas /> : null}
          {tab === 2 ? <PanelReducciones /> : null}
          {tab === 3 ? <PanelPlazos /> : null}
          {tab === 4 ? <PanelConstancias /> : null}
        </Box>
      </Box>
    </>
  );
}

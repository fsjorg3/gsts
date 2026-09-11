import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router';
import Alert from '@mui/material/Alert';
import type { AppShellContext } from '@/app/layout/AppShell';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { useNotificar } from '@/store/useNotificar';
import { MsIcon } from '@/shared/components';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { catalogoActivoOptions } from '@/features/catalogos/api';
import { NIS_LONGITUD_MINIMA_PADRON, padronPorNisOptions } from '@/features/padron/api';
import { PersonaPicker } from '@/features/personas/PersonaPicker';
import { useCrearPersona, type Persona } from '@/features/personas/api';
import { useCrearTramite } from '../api';

type Tipo = 'NO_ADEUDO' | 'NO_REGISTRO';
type Personalidad = 'FISICA' | 'MORAL';
type Representacion = 'TITULAR' | 'REPRESENTANTE' | 'APODERADO';
type PerteneceA = 'JUNTA_AUXILIAR' | 'MUNICIPIO';

function Card({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mb: subtitulo ? 0.375 : 2 }}>{titulo}</Typography>
      {subtitulo ? (
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 2 }}>{subtitulo}</Typography>
      ) : null}
      {children}
    </Box>
  );
}

// Paso previo del wizard: clasificación + solicitante. Al crear (POST /tramites)
// el backend estampa el catálogo activo y el trámite nace en CAPTURA.
export function NuevoTramite() {
  const navigate = useNavigate();
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const notificar = useNotificar();
  const catalogo = useQuery(catalogoActivoOptions);
  const crear = useCrearTramite();
  const crearPersonaTitular = useCrearPersona();
  const crearPersonaPresentante = useCrearPersona();

  const [tipo, setTipo] = useState<Tipo>('NO_ADEUDO');
  const [personalidad, setPersonalidad] = useState<Personalidad>('FISICA');
  const [representacion, setRepresentacion] = useState<Representacion>('TITULAR');
  // El titular es siempre obligatorio: sus datos son los que va impresos en la
  // constancia y la emisión exige una persona con rol TITULAR en el trámite
  // (ver CONTRATO_API_GSTS.md). Quien se presenta sólo se captura aparte
  // cuando no es el propio titular — un representante o un apoderado legal
  // son personas distintas, con su propio registro y rol.
  //
  // `persona*` guarda la persona ya resuelta (elegida de la búsqueda, o dada
  // de alta en un envío previo que falló más adelante — así un reintento no
  // la vuelve a crear); `entrada*`/`rfcTitular` es el texto tecleado, que
  // "Crear trámite" da de alta si al enviar no hay persona resuelta todavía.
  const [personaTitular, setPersonaTitular] = useState<Persona | null>(null);
  const [entradaTitular, setEntradaTitular] = useState('');
  const [rfcTitular, setRfcTitular] = useState('');
  const [personaPresentante, setPersonaPresentante] = useState<Persona | null>(null);
  const [entradaPresentante, setEntradaPresentante] = useState('');
  const [nis, setNis] = useState('');
  const [cicloNis, setCicloNis] = useState(0);
  const [cicloPadronResuelto, setCicloPadronResuelto] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const envioEnCurso = useRef(false);

  // Domicilio del predio: va impreso en la constancia de ambos tipos — en No
  // Registro se captura a mano; en No Adeudo lo resuelve el catálogo offline
  // del padrón por NIS (o se captura a mano si no aparece ahí). Sin catálogo
  // de juntas auxiliares/municipios — la zona de cobertura abarca Puebla y 4
  // municipios más; se captura en mayúsculas para no fragmentar la
  // agrupación por variaciones de mayúsculas/minúsculas.
  const [domicilioCalle, setDomicilioCalle] = useState('');
  const [domicilioNumero, setDomicilioNumero] = useState('');
  const [domicilioColonia, setDomicilioColonia] = useState('');
  const [perteneceA, setPerteneceA] = useState<PerteneceA>('JUNTA_AUXILIAR');
  const [perteneceANombre, setPerteneceANombre] = useState('');

  const nisNormalizado = nis.trim();
  const nisDebounced = useDebouncedValue(nisNormalizado, 300);
  const padron = useQuery(padronPorNisOptions(tipo === 'NO_ADEUDO' ? nisDebounced : ''));
  const consultaPadronActual = tipo === 'NO_ADEUDO' && nisNormalizado.length >= NIS_LONGITUD_MINIMA_PADRON && nisNormalizado === nisDebounced;
  const consultandoPadron = tipo === 'NO_ADEUDO' && nisNormalizado.length >= NIS_LONGITUD_MINIMA_PADRON && cicloPadronResuelto !== cicloNis;

  // Cada cambio efectivo de NIS abre un ciclo, incluso A → B → A con A en
  // caché. Sólo se aplica una vez: ni respuestas anteriores ni refetches
  // posteriores pueden pisar lo que ventanilla ya corrigió a mano.
  useEffect(() => {
    if (!consultaPadronActual || cicloPadronResuelto === cicloNis || padron.isFetching) return;
    if (!padron.isSuccess && !padron.isError) return;
    if (!padron.isError && padron.data) {
      if (padron.data.nis !== nisNormalizado) return;
      setDomicilioCalle(padron.data.domicilio.calle);
      setDomicilioNumero(padron.data.domicilio.numero);
      setDomicilioColonia(padron.data.domicilio.colonia);
      setPerteneceA(padron.data.domicilio.perteneceA ?? 'JUNTA_AUXILIAR');
      setPerteneceANombre(padron.data.domicilio.perteneceANombre ?? '');
      setEntradaTitular(padron.data.nombreSugerido ?? '');
    }
    setCicloPadronResuelto(cicloNis);
  }, [consultaPadronActual, cicloPadronResuelto, cicloNis, nisNormalizado, padron.data, padron.isFetching, padron.isSuccess, padron.isError]);

  const padronNoEncontrado =
    consultaPadronActual && !consultandoPadron && !padron.isError && padron.data === null;
  const errorPadron = consultaPadronActual && !consultandoPadron && padron.isError;

  function limpiarTitular() {
    setPersonaTitular(null);
    setEntradaTitular('');
    setRfcTitular('');
  }

  function cambiarPersonalidad(valor: Personalidad) {
    if (valor === personalidad) return;
    setPersonalidad(valor);
    limpiarTitular();
  }

  function cambiarTipo(valor: Tipo) {
    setTipo(valor);
    // Salir de No Adeudo cancela el autocompletado de este ciclo, aunque su
    // petición termine después o se vuelva a ese tipo con el mismo NIS.
    if (valor !== 'NO_ADEUDO') setCicloPadronResuelto(cicloNis);
  }

  function cambiarNis(valor: string) {
    setNis(valor);
    if (valor.trim() === nisNormalizado) return;
    setCicloNis((previo) => previo + 1);
    limpiarTitular();
    setDomicilioCalle('');
    setDomicilioNumero('');
    setDomicilioColonia('');
    setPerteneceA('JUNTA_AUXILIAR');
    setPerteneceANombre('');
  }

  // Regla del prototipo: persona moral siempre se presenta por apoderado legal.
  const representacionEfectiva: Representacion = personalidad === 'MORAL' ? 'APODERADO' : representacion;
  // Base sin perteneceANombre: el contrato sólo exige calle/número/colonia en
  // No Adeudo (perteneceANombre queda null cuando el predio está en Puebla,
  // el caso mayoritario). No Registro sí lo exige — es su dato principal.
  const domicilioBaseCompleto = domicilioCalle.trim().length > 0 && domicilioNumero.trim().length > 0 && domicilioColonia.trim().length > 0;
  const domicilioCompleto = domicilioBaseCompleto && perteneceANombre.trim().length > 0;
  const presentanteRequerido = representacionEfectiva !== 'TITULAR';
  const listo =
    (personaTitular !== null || entradaTitular.trim().length > 0) &&
    (!presentanteRequerido || personaPresentante !== null || entradaPresentante.trim().length > 0) &&
    (tipo !== 'NO_ADEUDO' || (nis.trim().length > 0 && domicilioBaseCompleto)) &&
    (tipo !== 'NO_REGISTRO' || domicilioCompleto);
  const capturaDeshabilitada = enviando || consultandoPadron;

  // Usa la persona ya resuelta si existe; si no, la da de alta con el texto
  // tecleado. `guardarPersona` refleja el alta en el estado del picker para
  // que, si el envío del trámite falla más adelante, un reintento reutilice
  // la persona recién creada en vez de duplicarla.
  async function resolverPersona(
    tipoPersonalidad: Personalidad,
    persona: Persona | null,
    entrada: string,
    rfc: string,
    mutacion: ReturnType<typeof useCrearPersona>,
    guardarPersona: (persona: Persona) => void,
  ): Promise<string> {
    if (persona) return persona.id;
    const nueva = await mutacion.mutateAsync({
      tipo: tipoPersonalidad,
      nombreRazonSocial: entrada.trim(),
      ...(rfc.trim() ? { rfc: rfc.trim().toUpperCase() } : {}),
    });
    guardarPersona(nueva);
    return nueva.id;
  }

  const crearTramite = async () => {
    if (envioEnCurso.current || !listo || consultandoPadron || catalogo.data === null) return;
    const coincidePersona = (persona: Persona | null, entrada: string, tipoPersonalidad: Personalidad) =>
      !persona || (persona.tipo === tipoPersonalidad && persona.nombreRazonSocial.trim() === entrada.trim());
    if (!coincidePersona(personaTitular, entradaTitular, personalidad) ||
        (presentanteRequerido && !coincidePersona(personaPresentante, entradaPresentante, 'FISICA'))) {
      notificar.error(new Error('La persona seleccionada no coincide con el nombre o la personalidad capturados. Vuelve a seleccionarla.'));
      return;
    }
    envioEnCurso.current = true;
    setEnviando(true);
    try {
      const titularId = await resolverPersona(personalidad, personaTitular, entradaTitular, rfcTitular, crearPersonaTitular, setPersonaTitular);
      let presentanteId: string | undefined;
      if (presentanteRequerido) {
        presentanteId = await resolverPersona('FISICA', personaPresentante, entradaPresentante, '', crearPersonaPresentante, setPersonaPresentante);
      }
      const tramite = await crear.mutateAsync({
        tipoConstancia: tipo,
        personalidad,
        representacion: representacionEfectiva,
        ...(tipo === 'NO_ADEUDO' && nis.trim() ? { nis: nis.trim() } : {}),
        ...(tipo === 'NO_ADEUDO' && domicilioBaseCompleto
          ? {
              domicilioCalle: domicilioCalle.trim(),
              domicilioNumero: domicilioNumero.trim(),
              domicilioColonia: domicilioColonia.trim(),
              ...(perteneceANombre.trim() ? { domicilioPerteneceA: perteneceA, domicilioPerteneceANombre: perteneceANombre.trim() } : {}),
            }
          : {}),
        ...(tipo === 'NO_REGISTRO' && domicilioCompleto
          ? {
              domicilioCalle: domicilioCalle.trim(),
              domicilioNumero: domicilioNumero.trim(),
              domicilioColonia: domicilioColonia.trim(),
              domicilioPerteneceA: perteneceA,
              domicilioPerteneceANombre: perteneceANombre.trim(),
            }
          : {}),
        personas: [
          { personaId: titularId, rol: 'TITULAR' },
          ...(presentanteRequerido ? [{ personaId: presentanteId!, rol: representacionEfectiva }] : []),
        ],
      });
      notificar.exito('Trámite creado. Continúa con los requisitos documentales.');
      void navigate(`/ventanilla/tramites/${tramite.id}`, { replace: true });
    } catch (error) {
      notificar.error(error);
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <>
      <ModuleHeader titulo="Nuevo trámite" subtitulo="Clasificación y solicitante" onAbrirMenu={abrirMenu} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5 }}>
        <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          {catalogo.data === null ? (
            <Alert severity="warning" icon={<MsIcon name="warning" size={20} />}>
              No hay un catálogo de requisitos activo. TI debe publicar uno antes de crear trámites.
            </Alert>
          ) : null}

          <Card titulo="Clasificación del trámite" subtitulo="Determina el catálogo de requisitos aplicable.">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>Tipo de constancia</Typography>
                <RadioGroup row value={tipo} onChange={(evento) => cambiarTipo(evento.target.value as Tipo)}>
                  <FormControlLabel disabled={enviando} value="NO_ADEUDO" control={<Radio size="small" />} label="Constancia de No Adeudo" />
                  <FormControlLabel disabled={enviando} value="NO_REGISTRO" control={<Radio size="small" />} label="Constancia de No Registro" />
                </RadioGroup>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Personalidad</Typography>
                  <RadioGroup row value={personalidad} onChange={(evento) => cambiarPersonalidad(evento.target.value as Personalidad)}>
                    <FormControlLabel disabled={enviando} value="FISICA" control={<Radio size="small" />} label="Física" />
                    <FormControlLabel disabled={enviando} value="MORAL" control={<Radio size="small" />} label="Moral" />
                  </RadioGroup>
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Quién se presenta</Typography>
                  {personalidad === 'FISICA' ? (
                    <RadioGroup row value={representacion} onChange={(evento) => setRepresentacion(evento.target.value as Representacion)}>
                      <FormControlLabel disabled={enviando} value="TITULAR" control={<Radio size="small" />} label="Titular" />
                      <FormControlLabel disabled={enviando} value="REPRESENTANTE" control={<Radio size="small" />} label="Representante" />
                    </RadioGroup>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, px: 1.75, py: 1.5,
                        border: '1px solid', borderColor: 'grey.400', borderRadius: 0.75, bgcolor: 'grey.50',
                      }}
                    >
                      <MsIcon name="gavel" size={18} color="#5B132B" />
                      <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary' }}>Apoderado legal</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Card>

          <Card titulo={personalidad === 'FISICA' ? 'Datos del titular' : 'Datos de la persona moral'}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <PersonaPicker
                tipo={personalidad}
                value={personaTitular}
                onChange={setPersonaTitular}
                entrada={entradaTitular}
                onEntradaChange={setEntradaTitular}
                rfc={rfcTitular}
                onRfcChange={setRfcTitular}
                disabled={capturaDeshabilitada}
              />
              {tipo === 'NO_ADEUDO' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, alignItems: 'end' }}>
                    <TextField
                      label="NIS / Número de cuenta"
                      disabled={enviando}
                      value={nis}
                      onChange={(evento) => cambiarNis(evento.target.value)}
                      placeholder="Ej. 4821-0034-17"
                      slotProps={{ input: { endAdornment: consultandoPadron ? <CircularProgress size={16} /> : null } }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.875, alignItems: 'center', pb: 0.5 }}>
                      <MsIcon name="info" size={17} color="#1565C0" />
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled' }}>
                        La cuenta se cruza contra el OUC en el paso de validación.
                      </Typography>
                    </Box>
                  </Box>
                  {padronNoEncontrado ? (
                    <Alert severity="info" icon={<MsIcon name="info" size={20} />}>
                      Este NIS no está en el catálogo offline del padrón. Captura el domicilio manualmente abajo; quedará disponible para la próxima consulta de este NIS.
                    </Alert>
                  ) : null}
                  {errorPadron ? (
                    <Alert severity="warning" icon={<MsIcon name="warning" size={20} />}>
                      No se pudo consultar el catálogo offline del padrón. Puedes capturar el titular y el domicilio manualmente; no se ha confirmado si este NIS existe en el catálogo.
                    </Alert>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          </Card>

          {presentanteRequerido ? (
            <Card
              titulo="Datos de quien se presenta"
              subtitulo={
                representacionEfectiva === 'APODERADO'
                  ? 'Apoderado legal que se presenta en nombre del titular. Sólo su identidad; no va impreso en la constancia.'
                  : 'Representante que se presenta en nombre del titular. Sólo su identidad; no va impreso en la constancia.'
              }
            >
              <PersonaPicker
                tipo="FISICA"
                disabled={enviando}
                value={personaPresentante}
                onChange={setPersonaPresentante}
                entrada={entradaPresentante}
                onEntradaChange={setEntradaPresentante}
                label={representacionEfectiva === 'APODERADO' ? 'Nombre completo del apoderado legal' : 'Nombre completo del representante'}
              />
            </Card>
          ) : null}

          {tipo === 'NO_ADEUDO' || tipo === 'NO_REGISTRO' ? (
            <Card
              titulo="Domicilio del predio"
              subtitulo={
                tipo === 'NO_ADEUDO'
                  ? 'Va impreso en la constancia. Se autocompleta desde el catálogo offline del padrón al capturar el NIS; edítalo si hace falta.'
                  : 'Va impreso en la constancia; captúralo tal cual debe aparecer.'
              }
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Calle"
                    disabled={capturaDeshabilitada}
                    value={domicilioCalle}
                    onChange={(evento) => setDomicilioCalle(evento.target.value.toUpperCase())}
                    placeholder='PRIVADA JAZMÍN "B"'
                  />
                  <TextField
                    label="Número"
                    disabled={capturaDeshabilitada}
                    value={domicilioNumero}
                    onChange={(evento) => setDomicilioNumero(evento.target.value.toUpperCase())}
                    placeholder="612-1"
                  />
                </Box>
                <TextField
                  label="Colonia"
                  disabled={capturaDeshabilitada}
                  value={domicilioColonia}
                  onChange={(evento) => setDomicilioColonia(evento.target.value.toUpperCase())}
                  placeholder="LOS JAZMINES ANEXO A GUADALUPE CALERAS"
                />
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Perteneciente a</Typography>
                  <RadioGroup row value={perteneceA} onChange={(evento) => setPerteneceA(evento.target.value as PerteneceA)}>
                    <FormControlLabel disabled={capturaDeshabilitada} value="JUNTA_AUXILIAR" control={<Radio size="small" />} label="Junta auxiliar" />
                    <FormControlLabel disabled={capturaDeshabilitada} value="MUNICIPIO" control={<Radio size="small" />} label="Municipio" />
                  </RadioGroup>
                </Box>
                <TextField
                  label={perteneceA === 'JUNTA_AUXILIAR' ? 'Nombre de la junta auxiliar' : 'Nombre del municipio'}
                  disabled={capturaDeshabilitada}
                  value={perteneceANombre}
                  onChange={(evento) => setPerteneceANombre(evento.target.value.toUpperCase())}
                  placeholder={perteneceA === 'JUNTA_AUXILIAR' ? 'SAN JERÓNIMO CALERAS' : 'PUEBLA'}
                />
              </Box>
            </Card>
          ) : null}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
            <Button variant="text" disabled={enviando} onClick={() => void navigate('/ventanilla')}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={!listo || capturaDeshabilitada || catalogo.data === null}
              onClick={() => void crearTramite()}
              endIcon={<MsIcon name="chevron_right" size={18} />}
            >
              Crear trámite
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
}

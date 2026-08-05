import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import Alert from '@mui/material/Alert';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { useNotificar } from '@/store/useNotificar';
import { MsIcon } from '@/shared/components';
import { catalogoActivoOptions } from '@/features/catalogos/api';
import { PersonaPicker } from '@/features/personas/PersonaPicker';
import type { Persona } from '@/features/personas/api';
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
  const notificar = useNotificar();
  const catalogo = useQuery(catalogoActivoOptions);
  const crear = useCrearTramite();

  const [tipo, setTipo] = useState<Tipo>('NO_ADEUDO');
  const [personalidad, setPersonalidad] = useState<Personalidad>('FISICA');
  const [representacion, setRepresentacion] = useState<Representacion>('TITULAR');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [nis, setNis] = useState('');

  // Domicilio del predio (solo No Registro): va impreso en la constancia. Sin
  // catálogo de juntas auxiliares/municipios — la zona de cobertura abarca
  // Puebla y 4 municipios más; se captura en mayúsculas para no fragmentar la
  // agrupación por variaciones de mayúsculas/minúsculas.
  const [domicilioCalle, setDomicilioCalle] = useState('');
  const [domicilioNumero, setDomicilioNumero] = useState('');
  const [domicilioColonia, setDomicilioColonia] = useState('');
  const [perteneceA, setPerteneceA] = useState<PerteneceA>('JUNTA_AUXILIAR');
  const [perteneceANombre, setPerteneceANombre] = useState('');

  // Regla del prototipo: persona moral siempre se presenta por apoderado legal.
  const representacionEfectiva: Representacion = personalidad === 'MORAL' ? 'APODERADO' : representacion;
  const domicilioCompleto =
    domicilioCalle.trim().length > 0 && domicilioNumero.trim().length > 0 && domicilioColonia.trim().length > 0 && perteneceANombre.trim().length > 0;
  const listo =
    persona !== null &&
    (tipo !== 'NO_ADEUDO' || nis.trim().length > 0) &&
    (tipo !== 'NO_REGISTRO' || domicilioCompleto);

  const crearTramite = () => {
    if (!persona) return;
    crear.mutate(
      {
        tipoConstancia: tipo,
        personalidad,
        representacion: representacionEfectiva,
        ...(tipo === 'NO_ADEUDO' && nis.trim() ? { nis: nis.trim() } : {}),
        ...(tipo === 'NO_REGISTRO' && domicilioCompleto
          ? {
              domicilioCalle: domicilioCalle.trim(),
              domicilioNumero: domicilioNumero.trim(),
              domicilioColonia: domicilioColonia.trim(),
              domicilioPerteneceA: perteneceA,
              domicilioPerteneceANombre: perteneceANombre.trim(),
            }
          : {}),
        personas: [{ personaId: persona.id, rol: representacionEfectiva }],
      },
      {
        onSuccess: (tramite) => {
          notificar.exito('Trámite creado. Continúa con los requisitos documentales.');
          void navigate(`/ventanilla/tramites/${tramite.id}`, { replace: true });
        },
        onError: (error) => notificar.error(error),
      },
    );
  };

  return (
    <>
      <ModuleHeader titulo="Nuevo trámite" subtitulo="Clasificación y solicitante" />
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
                <RadioGroup row value={tipo} onChange={(evento) => setTipo(evento.target.value as Tipo)}>
                  <FormControlLabel value="NO_ADEUDO" control={<Radio size="small" />} label="Constancia de No Adeudo" />
                  <FormControlLabel value="NO_REGISTRO" control={<Radio size="small" />} label="Constancia de No Registro" />
                </RadioGroup>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Personalidad</Typography>
                  <RadioGroup row value={personalidad} onChange={(evento) => setPersonalidad(evento.target.value as Personalidad)}>
                    <FormControlLabel value="FISICA" control={<Radio size="small" />} label="Física" />
                    <FormControlLabel value="MORAL" control={<Radio size="small" />} label="Moral" />
                  </RadioGroup>
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Quién se presenta</Typography>
                  {personalidad === 'FISICA' ? (
                    <RadioGroup row value={representacion} onChange={(evento) => setRepresentacion(evento.target.value as Representacion)}>
                      <FormControlLabel value="TITULAR" control={<Radio size="small" />} label="Titular" />
                      <FormControlLabel value="REPRESENTANTE" control={<Radio size="small" />} label="Representante" />
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
              <PersonaPicker tipo={personalidad} value={persona} onChange={setPersona} />
              {tipo === 'NO_ADEUDO' ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, alignItems: 'end' }}>
                  <TextField
                    label="NIS / Número de cuenta"
                    value={nis}
                    onChange={(evento) => setNis(evento.target.value)}
                    placeholder="Ej. 4821-0034-17"
                  />
                  <Box sx={{ display: 'flex', gap: 0.875, alignItems: 'center', pb: 0.5 }}>
                    <MsIcon name="info" size={17} color="#1565C0" />
                    <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled' }}>
                      La cuenta se cruza contra el OUC en el paso de validación.
                    </Typography>
                  </Box>
                </Box>
              ) : null}
            </Box>
          </Card>

          {tipo === 'NO_REGISTRO' ? (
            <Card titulo="Domicilio del predio" subtitulo="Va impreso en la constancia; captúralo tal cual debe aparecer.">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                  <TextField
                    label="Calle"
                    value={domicilioCalle}
                    onChange={(evento) => setDomicilioCalle(evento.target.value.toUpperCase())}
                    placeholder='PRIVADA JAZMÍN "B"'
                  />
                  <TextField
                    label="Número"
                    value={domicilioNumero}
                    onChange={(evento) => setDomicilioNumero(evento.target.value.toUpperCase())}
                    placeholder="612-1"
                  />
                </Box>
                <TextField
                  label="Colonia"
                  value={domicilioColonia}
                  onChange={(evento) => setDomicilioColonia(evento.target.value.toUpperCase())}
                  placeholder="LOS JAZMINES ANEXO A GUADALUPE CALERAS"
                />
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>Perteneciente a</Typography>
                  <RadioGroup row value={perteneceA} onChange={(evento) => setPerteneceA(evento.target.value as PerteneceA)}>
                    <FormControlLabel value="JUNTA_AUXILIAR" control={<Radio size="small" />} label="Junta auxiliar" />
                    <FormControlLabel value="MUNICIPIO" control={<Radio size="small" />} label="Municipio" />
                  </RadioGroup>
                </Box>
                <TextField
                  label={perteneceA === 'JUNTA_AUXILIAR' ? 'Nombre de la junta auxiliar' : 'Nombre del municipio'}
                  value={perteneceANombre}
                  onChange={(evento) => setPerteneceANombre(evento.target.value.toUpperCase())}
                  placeholder={perteneceA === 'JUNTA_AUXILIAR' ? 'SAN JERÓNIMO CALERAS' : 'PUEBLA'}
                />
              </Box>
            </Card>
          ) : null}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25 }}>
            <Button variant="text" onClick={() => void navigate('/ventanilla')}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={!listo || crear.isPending || catalogo.data === null}
              onClick={crearTramite}
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

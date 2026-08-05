import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { EstadoBadge, MsIcon } from '@/shared/components';
import { CONSTANCIAS_POR_MES, DIR_KPIS, TRAMITES_POR_ESTADO } from '@/mocks/direccion';

// Módulo Dirección — SHELL con datos de demostración: no existe endpoint de
// métricas. Colores de datos validados (CVD/contraste) con el validador del
// sistema: vino de datos #8C2748 + oro #B8822A sobre superficie clara.
const VINO_DATOS = '#8C2748';
const ORO_DATOS = '#B8822A';

function KpiTile({ icon, label, value, delta, positiva }: (typeof DIR_KPIS)[number]) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <MsIcon name={icon} size={20} color="#5B132B" />
        <EstadoBadge label={delta} color={delta === '=' ? 'neutral' : positiva ? 'success' : 'warning'} />
      </Box>
      <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.secondary', mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

export function DireccionPage() {
  const totalEstados = TRAMITES_POR_ESTADO.reduce((suma, e) => suma + e.valor, 0);
  return (
    <>
      <ModuleHeader titulo="Tablero de dirección" subtitulo="Indicadores de desempeño · junio 2026" />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Alert severity="warning" icon={<MsIcon name="science" size={20} />}>
          Datos de demostración: el endpoint de métricas de dirección aún no existe en el backend.
        </Alert>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.75 }}>
          {DIR_KPIS.map((k) => (
            <KpiTile key={k.label} {...k} />
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 2 }}>
          {/* Constancias por mes (apilado por tipo) */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Constancias emitidas por mes</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 1 }}>
              No adeudo vs. no registro · 2026
            </Typography>
            <BarChart
              height={280}
              xAxis={[{ data: [...CONSTANCIAS_POR_MES.meses], scaleType: 'band' }]}
              series={[
                { data: [...CONSTANCIAS_POR_MES.noAdeudo], label: 'No adeudo', stack: 'total', color: VINO_DATOS },
                { data: [...CONSTANCIAS_POR_MES.noRegistro], label: 'No registro', stack: 'total', color: ORO_DATOS },
              ]}
              slotProps={{ legend: { position: { vertical: 'bottom', horizontal: 'center' } } }}
              grid={{ horizontal: true }}
              borderRadius={4}
            />
          </Box>

          {/* Trámites por estado */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 2 }}>Trámites por estado</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
              {TRAMITES_POR_ESTADO.map((estado) => (
                <Box key={estado.etiqueta}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.625 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: estado.color }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{estado.etiqueta}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{estado.valor.toLocaleString('es-MX')}</Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 999, bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${(estado.valor / totalEstados) * 100}%`, bgcolor: estado.color, borderRadius: 999 }} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

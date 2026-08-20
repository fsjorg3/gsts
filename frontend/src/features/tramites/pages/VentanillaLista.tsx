import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router';
import type { AppShellContext } from '@/app/layout/AppShell';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { formatFecha } from '@/api/serializers';
import { DataTable, EstadoDeBadge, ESTADO_TRAMITE, MsIcon, StatCard, type DataTableColumn } from '@/shared/components';
import { folioTramite, tramitesInfiniteOptions, type FiltrosTramites, type Tramite } from '../api';

const COLUMNAS: DataTableColumn<Tramite>[] = [
  { key: 'folio', header: 'Folio', render: (t) => <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{folioTramite(t)}</Typography> },
  {
    key: 'tipo',
    header: 'Tipo',
    render: (t) => (
      <Typography sx={{ fontSize: 13 }}>{t.tipoConstancia === 'NO_ADEUDO' ? 'No adeudo' : 'No registro'}</Typography>
    ),
  },
  { key: 'nis', header: 'NIS / Cuenta', render: (t) => <Typography sx={{ fontSize: 13 }}>{t.nis ?? '—'}</Typography> },
  { key: 'estado', header: 'Estado', render: (t) => <EstadoDeBadge estado={t.estado} mapa={ESTADO_TRAMITE} /> },
  { key: 'creado', header: 'Creado', render: (t) => <Typography sx={{ fontSize: 13 }}>{formatFecha(t.createdAt)}</Typography> },
];

interface BorradorFiltros {
  estado: string;
  tipoConstancia: string;
  nis: string;
  desde: string;
  hasta: string;
}

const FILTROS_VACIOS: BorradorFiltros = { estado: '', tipoConstancia: '', nis: '', desde: '', hasta: '' };

export function VentanillaLista() {
  const navigate = useNavigate();
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const [borrador, setBorrador] = useState<BorradorFiltros>(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosTramites>({});
  const consulta = useInfiniteQuery(tramitesInfiniteOptions(filtrosAplicados));
  const tramites = consulta.data?.pages.flatMap((page) => page.data) ?? [];

  const buscar = () =>
    setFiltrosAplicados({
      ...(borrador.estado ? { estado: borrador.estado as Tramite['estado'] } : {}),
      ...(borrador.tipoConstancia ? { tipoConstancia: borrador.tipoConstancia as Tramite['tipoConstancia'] } : {}),
      ...(borrador.nis ? { nis: borrador.nis } : {}),
      ...(borrador.desde ? { desde: borrador.desde } : {}),
      ...(borrador.hasta ? { hasta: borrador.hasta } : {}),
    });
  const limpiar = () => {
    setBorrador(FILTROS_VACIOS);
    setFiltrosAplicados({});
  };

  // KPIs derivados de lo cargado (no existe endpoint de métricas).
  const abiertos = tramites.filter((t) => ['CAPTURA', 'EN_VALIDACION'].includes(t.estado)).length;
  const porCobrar = tramites.filter((t) => t.estado === 'APROBADO').length;
  const enCobro = tramites.filter((t) => t.estado === 'COBRO').length;
  const finalizados = tramites.filter((t) => t.estado === 'FINALIZADO').length;

  return (
    <>
      <ModuleHeader
        titulo="Ventanilla de atención"
        subtitulo="Trámites de constancias de no adeudo y no registro"
        onAbrirMenu={abrirMenu}
        acciones={
          <Button variant="contained" onClick={() => void navigate('/ventanilla/tramites/nuevo')} startIcon={<MsIcon name="add" size={19} />}>
            Nuevo trámite
          </Button>
        }
      />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Tipo"
            value={borrador.tipoConstancia}
            onChange={(e) => {
              const tipoConstancia = e.target.value;
              setBorrador({ ...borrador, tipoConstancia, ...(tipoConstancia === 'NO_REGISTRO' ? { nis: '' } : {}) });
            }}
            sx={{ width: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="NO_ADEUDO">No adeudo</MenuItem>
            <MenuItem value="NO_REGISTRO">No registro</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Estado"
            value={borrador.estado}
            onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
            sx={{ width: 180 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(ESTADO_TRAMITE).map(([valor, cfg]) => (
              <MenuItem key={valor} value={valor}>
                {cfg.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="NIS / Cuenta"
            value={borrador.nis}
            onChange={(e) => setBorrador({ ...borrador, nis: e.target.value })}
            disabled={borrador.tipoConstancia === 'NO_REGISTRO'}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            label="Desde"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={borrador.desde}
            onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            label="Hasta"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={borrador.hasta}
            onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
            sx={{ width: 160 }}
          />
          <Button variant="contained" onClick={buscar}>
            Buscar
          </Button>
          <Button variant="text" onClick={limpiar}>
            Limpiar
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.75 }}>
          <StatCard icon="pending_actions" iconColor="#1565C0" label="En captura / validación" value={String(abiertos)} />
          <StatCard icon="schedule" iconColor="#C58A00" label="Aprobados por cobrar" value={String(porCobrar)} />
          <StatCard icon="payments" iconColor="#5B132B" label="En cobro" value={String(enCobro)} />
          <StatCard icon="task_alt" iconColor="#2E7D32" label="Finalizados" value={String(finalizados)} />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1.5 }}>Trámites recientes</Typography>
          <DataTable
            columns={COLUMNAS}
            rows={tramites}
            rowKey={(t) => t.id}
            onRowClick={(t) => void navigate(`/ventanilla/tramites/${t.id}`)}
            emptyMessage={consulta.isPending ? 'Cargando…' : 'Aún no hay trámites. Crea el primero con "Nuevo trámite".'}
          />
          {consulta.hasNextPage ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
              <Button variant="text" disabled={consulta.isFetchingNextPage} onClick={() => void consulta.fetchNextPage()}>
                {consulta.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
              </Button>
            </Box>
          ) : null}
        </Box>
      </Box>
    </>
  );
}

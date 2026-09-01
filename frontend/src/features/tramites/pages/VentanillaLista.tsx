import { useEffect, useState } from 'react';
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
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl';
import { usePaginacionCursor } from '@/shared/hooks/usePaginacionCursor';
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
  folio: string;
  estado: string;
  tipoConstancia: string;
  nis: string;
  desde: string;
  hasta: string;
}

/** Rellena los campos de captura con lo que traiga la URL. */
function borradorDesde(filtros: Partial<Record<(typeof CLAVES_FILTRO)[number], string>>): BorradorFiltros {
  return {
    folio: filtros.folio ?? '',
    estado: filtros.estado ?? '',
    tipoConstancia: filtros.tipoConstancia ?? '',
    nis: filtros.nis ?? '',
    desde: filtros.desde ?? '',
    hasta: filtros.hasta ?? '',
  };
}

// Los filtros aplicados viven en la URL (`filas` es el tamaño de página), no en
// estado local: así una búsqueda se comparte, sobrevive a un F5 y se recupera
// al volver a iniciar sesión. El índice de página no, porque la API es por cursor.
const CLAVES_FILTRO = ['folio', 'estado', 'tipoConstancia', 'nis', 'desde', 'hasta', 'filas'] as const;
const OPCIONES_FILAS = [10, 25, 50, 100];

export function VentanillaLista() {
  const navigate = useNavigate();
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const { filtros, aplicar, limpiar: limpiarUrl } = useFiltrosUrl(CLAVES_FILTRO);
  const [borrador, setBorrador] = useState<BorradorFiltros>(() => borradorDesde(filtros));

  // El borrador es lo que se teclea; la URL, lo aplicado. Se re-sincroniza
  // cuando la URL cambia por fuera (Atrás/Adelante o el regreso desde Keycloak)
  // para que los campos nunca muestren algo distinto de la lista.
  useEffect(() => setBorrador(borradorDesde(filtros)), [filtros]);

  const filasPorPagina = OPCIONES_FILAS.includes(Number(filtros.filas)) ? Number(filtros.filas) : 25;
  const filtrosAplicados: FiltrosTramites = filtros.folio
    ? { folio: filtros.folio }
    : {
        ...(filtros.estado ? { estado: filtros.estado as Tramite['estado'] } : {}),
        ...(filtros.tipoConstancia ? { tipoConstancia: filtros.tipoConstancia as Tramite['tipoConstancia'] } : {}),
        ...(filtros.nis ? { nis: filtros.nis } : {}),
        ...(filtros.desde ? { desde: filtros.desde } : {}),
        ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
      };

  const consulta = useInfiniteQuery(tramitesInfiniteOptions(filtrosAplicados, filasPorPagina));
  const { pagina, filas: tramites, total, irAPagina, reiniciar } = usePaginacionCursor(consulta);

  // El folio identifica un trámite concreto: manda sobre el resto de los
  // filtros, tanto aquí como en el backend.
  const porFolio = borrador.folio.trim() !== '';
  const rangoInvalido = Boolean(borrador.desde && borrador.hasta && borrador.desde > borrador.hasta);

  const buscar = () => {
    reiniciar();
    const filas = String(filasPorPagina);
    aplicar(porFolio ? { folio: borrador.folio.trim(), filas } : { ...borrador, filas });
  };
  const limpiar = () => {
    reiniciar();
    limpiarUrl();
  };
  const cambiarFilasPorPagina = (filas: number) => {
    reiniciar();
    aplicar({ ...filtros, filas: String(filas) });
  };

  // Conteos del universo filtrado completo, no de la página visible: el backend
  // los calcula ignorando el filtro `estado`, que si no dejaría en cero a las
  // tarjetas restantes.
  const porEstado = consulta.data?.pages[0]?.meta?.porEstado;
  const conteo = (estado: string) => porEstado?.[estado] ?? 0;
  const abiertos = conteo('CAPTURA') + conteo('EN_VALIDACION');
  const porCobrar = conteo('APROBADO');
  const enCobro = conteo('COBRO');
  const finalizados = conteo('FINALIZADO');

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
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            size="small"
            label="Folio"
            placeholder="NA-2026-02038"
            value={borrador.folio}
            onChange={(e) => setBorrador({ ...borrador, folio: e.target.value })}
            helperText={porFolio ? 'El folio ignora los demás filtros' : ' '}
            sx={{ width: 190 }}
          />
          <TextField
            select
            size="small"
            label="Tipo"
            value={borrador.tipoConstancia}
            onChange={(e) => {
              const tipoConstancia = e.target.value;
              setBorrador({ ...borrador, tipoConstancia, ...(tipoConstancia === 'NO_REGISTRO' ? { nis: '' } : {}) });
            }}
            disabled={porFolio}
            helperText=" "
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
            disabled={porFolio}
            helperText=" "
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
            disabled={porFolio || borrador.tipoConstancia === 'NO_REGISTRO'}
            helperText=" "
            sx={{ width: 160 }}
          />
          {/* min/max acotan el selector de fecha, pero el campo sigue siendo
              tecleable: de ahí el error visible y el botón deshabilitado. */}
          <TextField
            size="small"
            label="Desde"
            type="date"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: borrador.hasta || undefined } }}
            value={borrador.desde}
            onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
            disabled={porFolio}
            error={rangoInvalido}
            helperText=" "
            sx={{ width: 160 }}
          />
          <TextField
            size="small"
            label="Hasta"
            type="date"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: borrador.desde || undefined } }}
            value={borrador.hasta}
            onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
            disabled={porFolio}
            error={rangoInvalido}
            helperText={rangoInvalido ? '«Hasta» no puede ser anterior a «Desde»' : ' '}
            sx={{ width: 220 }}
          />
          <Button variant="contained" onClick={buscar} disabled={rangoInvalido} sx={{ mt: 0.5 }}>
            Buscar
          </Button>
          <Button variant="text" onClick={limpiar} sx={{ mt: 0.5 }}>
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
            paginacion={{
              pagina,
              total,
              filasPorPagina,
              onCambiarPagina: irAPagina,
              onCambiarFilasPorPagina: cambiarFilasPorPagina,
            }}
          />
        </Box>
      </Box>
    </>
  );
}

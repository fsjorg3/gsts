import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useOutletContext } from 'react-router';
import type { AppShellContext } from '@/app/layout/AppShell';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { ESTADO_TRAMITE, MsIcon } from '@/shared/components';
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl';
import { descargarBlob } from '@/shared/descargarArchivo';
import { useNotificar } from '@/store/useNotificar';
import type { FiltrosTramites, Tramite } from '@/features/tramites/api';
import { nombreArchivoExportTramites, useExportarTramites } from '../api';

interface BorradorFiltros {
  folio: string;
  estado: string;
  tipoConstancia: string;
  nis: string;
  desde: string;
  hasta: string;
}

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

// Mismo vocabulario de filtro que Ventanilla (ver VentanillaLista.tsx) y misma
// razón para vivir en la URL: una búsqueda se comparte y sobrevive a un F5. Sin
// `filas`: GET /tramites/export no pagina, exporta todo lo que cumpla el filtro.
const CLAVES_FILTRO = ['folio', 'estado', 'tipoConstancia', 'nis', 'desde', 'hasta'] as const;

export function ExportarPage() {
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const { filtros, aplicar, limpiar: limpiarUrl } = useFiltrosUrl(CLAVES_FILTRO);
  const [borrador, setBorrador] = useState<BorradorFiltros>(() => borradorDesde(filtros));
  const notificar = useNotificar();
  const exportar = useExportarTramites();

  useEffect(() => setBorrador(borradorDesde(filtros)), [filtros]);

  const filtrosAplicados: FiltrosTramites = filtros.folio
    ? { folio: filtros.folio }
    : {
        ...(filtros.estado ? { estado: filtros.estado as Tramite['estado'] } : {}),
        ...(filtros.tipoConstancia ? { tipoConstancia: filtros.tipoConstancia as Tramite['tipoConstancia'] } : {}),
        ...(filtros.nis ? { nis: filtros.nis } : {}),
        ...(filtros.desde ? { desde: filtros.desde } : {}),
        ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
      };

  const porFolio = borrador.folio.trim() !== '';
  const rangoInvalido = Boolean(borrador.desde && borrador.hasta && borrador.desde > borrador.hasta);

  const buscar = () => aplicar(porFolio ? { folio: borrador.folio.trim() } : { ...borrador });
  const limpiar = () => limpiarUrl();

  const descargar = () => {
    exportar.mutate(filtrosAplicados, {
      onSuccess: (blob) => descargarBlob(blob, nombreArchivoExportTramites()),
      onError: (error) => notificar.error(error),
    });
  };

  return (
    <>
      <ModuleHeader titulo="Exportar trámites" subtitulo="Descarga en XLSX de los trámites que cumplan el filtro" onAbrirMenu={abrirMenu} />
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
            Aplicar filtro
          </Button>
          <Button variant="text" onClick={limpiar} sx={{ mt: 0.5 }}>
            Limpiar
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<MsIcon name="download" size={19} />}
            disabled={exportar.isPending || rangoInvalido}
            onClick={descargar}
          >
            {exportar.isPending ? 'Generando…' : 'Descargar XLSX'}
          </Button>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Incluye titular, NIS, domicilio, cobro y folio de constancia de los trámites que cumplan el filtro de arriba.
          </Typography>
        </Box>
      </Box>
    </>
  );
}

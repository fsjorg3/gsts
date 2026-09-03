import { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useOutletContext } from 'react-router';
import type { AppShellContext } from '@/app/layout/AppShell';
import { ModuleHeader } from '@/app/layout/ModuleHeader';
import { PanelCatalogo } from '../components/administracion/PanelCatalogo';
import { PanelConstancias } from '../components/administracion/PanelConstancias';
import { PanelPlazos } from '../components/administracion/PanelPlazos';
import { PanelReducciones } from '../components/administracion/PanelReducciones';
import { PanelTarifas } from '../components/administracion/PanelTarifas';

export function AdministracionPage() {
  const { abrirMenu } = useOutletContext<AppShellContext>();
  const [tab, setTab] = useState(0);
  return (
    <>
      <ModuleHeader titulo="Administración" subtitulo="Catálogos, tarifas y plazos operativos (rol TI)" onAbrirMenu={abrirMenu} />
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

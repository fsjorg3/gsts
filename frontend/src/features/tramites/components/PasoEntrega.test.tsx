import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { store } from '@/app/store';
import { theme } from '@/app/theme';
import type { TramiteDetalle } from '../api';
import { PasoEntrega } from './PasoEntrega';

// Fixture mínimo del expediente. PasoEntrega sólo lee estado, tipo, personas,
// cobro y constancia; el resto del DTO se completa vacío para no acoplar la
// prueba a campos que la pantalla no usa.
function construirTramite(constancia: TramiteDetalle['constancia']): TramiteDetalle {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    numeroTramite: 42,
    tipoConstancia: 'NO_REGISTRO',
    personalidad: 'FISICA',
    representacion: 'TITULAR',
    nis: null,
    domicilioCalle: 'CALLE 12 NORTE',
    domicilioNumero: '612',
    domicilioColonia: 'COLONIA CENTRO',
    domicilioPerteneceA: 'JUNTA_AUXILIAR',
    domicilioPerteneceANombre: 'SAN BALTAZAR CAMPECHE',
    versionCatalogoId: '22222222-2222-2222-2222-222222222222',
    estado: 'COBRO',
    plazoPagoHasta: null,
    motivoRechazo: null,
    creadoPorId: '33333333-3333-3333-3333-333333333333',
    createdAt: '2026-07-24T18:00:00.000Z',
    updatedAt: '2026-07-24T18:00:00.000Z',
    personas: [
      {
        id: '44444444-4444-4444-4444-444444444444',
        tramiteId: '11111111-1111-1111-1111-111111111111',
        personaId: '55555555-5555-5555-5555-555555555555',
        rol: 'TITULAR',
        createdAt: '2026-07-24T18:00:00.000Z',
        persona: { id: '55555555-5555-5555-5555-555555555555', tipo: 'FISICA', nombreRazonSocial: 'JUAN PÉREZ LÓPEZ', rfc: null, createdAt: '2026-07-24T18:00:00.000Z' },
      },
    ],
    evidencias: [],
    validaciones: [],
    confirmaciones: [],
    cobro: null,
    constancia,
  } as unknown as TramiteDetalle;
}

const CONSTANCIA_BASE = {
  id: '66666666-6666-6666-6666-666666666666',
  tramiteId: '11111111-1111-1111-1111-111111111111',
  folioUnico: 'SICEF-42-A1B2C3D4',
  hashPdf: 'a'.repeat(64),
  hashContenido: 'b'.repeat(64),
  versionToken: 'v1',
  archivoUuid: '77777777-7777-7777-7777-777777777777',
  firmaDigital: 'firma-de-prueba',
  certificadoId: 'cert-1',
  emitidaAt: '2026-07-24T18:00:00.000Z',
  vigenciaInicio: '2026-07-24T18:00:00.000Z',
  vigenciaFin: '2026-08-23T18:00:00.000Z',
  anulada: false,
} as const;

// La pantalla usa notificaciones (Redux) y la mutación de descarga (React
// Query), así que necesita ambos proveedores además del tema.
const renderizar = (constancia: TramiteDetalle['constancia']) =>
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <ThemeProvider theme={theme}>
          <PasoEntrega tramite={construirTramite(constancia)} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  );

// vitest corre con globals:false, así que el auto-cleanup de Testing Library no
// se registra solo: sin esto el DOM se acumularía entre pruebas.
afterEach(cleanup);

describe('PasoEntrega', () => {
  it('dibuja el QR de verificación cuando la constancia trae urlVerificacion', () => {
    const url = 'https://portal.test/constancias/SICEF-42-A1B2C3D4/verificar/v1.abcdef0123456789abcd';
    const { container } = renderizar({ ...CONSTANCIA_BASE, urlVerificacion: url } as unknown as TramiteDetalle['constancia']);

    expect(screen.getByTitle(`Verificación de la constancia ${CONSTANCIA_BASE.folioUnico}`)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText(/Verificación no disponible/i)).not.toBeInTheDocument();
  });

  it('advierte de la clave retirada cuando urlVerificacion es null, sin confundirlo con "aún no emitida"', () => {
    renderizar({ ...CONSTANCIA_BASE, urlVerificacion: null } as unknown as TramiteDetalle['constancia']);

    expect(screen.getByText(/la clave de firma de esta constancia fue retirada/i)).toBeInTheDocument();
    // La constancia sí existe: su folio se sigue mostrando (en la tarjeta y en
    // la leyenda del pie, de ahí la consulta en plural).
    expect(screen.getAllByText(CONSTANCIA_BASE.folioUnico).length).toBeGreaterThan(0);
    expect(screen.queryByTitle(/Verificación de la constancia/)).not.toBeInTheDocument();
  });

  it('no muestra tarjeta de constancia ni advertencias cuando aún no se ha emitido', () => {
    renderizar(null);

    expect(screen.queryAllByText(CONSTANCIA_BASE.folioUnico)).toHaveLength(0);
    expect(screen.queryByText(/Verificación no disponible/i)).not.toBeInTheDocument();
    expect(screen.getByText(/verifica la autenticidad de la constancia/i)).toBeInTheDocument();
  });

  it('ofrece imprimir y descargar el PDF una vez emitida la constancia', () => {
    renderizar({ ...CONSTANCIA_BASE, urlVerificacion: null } as unknown as TramiteDetalle['constancia']);

    expect(screen.getByRole('button', { name: /imprimir/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /descargar pdf/i })).toBeEnabled();
  });

  it('no ofrece descarga mientras no exista la constancia', () => {
    renderizar(null);

    expect(screen.queryByRole('button', { name: /imprimir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descargar pdf/i })).not.toBeInTheDocument();
  });
});

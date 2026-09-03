import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { store } from '@/app/store';
import { theme } from '@/app/theme';
import type { TramiteDetalle } from '../api';
import { PasoCobro } from './PasoCobro';

// Fixture mínimo en APROBADO: sin revalidación aún, así que PasoCobro dibuja
// la tarjeta de revalidación (evidencia obligatoria) antes que la de cobro.
function construirTramite(): TramiteDetalle {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    numeroTramite: 42,
    tipoConstancia: 'NO_ADEUDO',
    personalidad: 'FISICA',
    representacion: 'TITULAR',
    nis: '10234567',
    versionCatalogoId: '22222222-2222-2222-2222-222222222222',
    estado: 'APROBADO',
    evidencias: [],
    validacionesNoAdeudo: [],
    validacionesNoRegistro: [],
    confirmaciones: [],
    cobro: null,
    constancia: null,
  } as unknown as TramiteDetalle;
}

const renderizar = () =>
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ThemeProvider theme={theme}>
          <PasoCobro tramite={construirTramite()} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  );

const archivoFalso = () => new File(['contenido'], 'revalidacion.png', { type: 'image/png' });

afterEach(cleanup);

describe('PasoCobro — revalidación', () => {
  it('deshabilita las decisiones de revalidación hasta adjuntar evidencia', () => {
    renderizar();
    const confirmar = screen.getByRole('button', { name: /confirmar sin adeudo en ouc/i });
    const sobrevenido = screen.getByRole('button', { name: /registrar adeudo sobrevenido/i });
    expect(confirmar).toBeDisabled();
    expect(sobrevenido).toBeDisabled();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivoFalso()] } });

    expect(confirmar).toBeEnabled();
    expect(sobrevenido).toBeEnabled();
  });
});

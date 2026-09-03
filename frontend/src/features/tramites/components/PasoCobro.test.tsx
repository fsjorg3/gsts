import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { store } from '@/app/store';
import { theme } from '@/app/theme';
import type { TramiteDetalle } from '../api';
import { PasoCobro } from './PasoCobro';

// Fixture mínimo en APROBADO. requiereRevalidacionCobro lo calcula el backend
// (ventana de gracia desde la aprobación); por defecto true, así que PasoCobro
// dibuja la tarjeta de revalidación (evidencia obligatoria) antes que la de cobro.
function construirTramite(requiereRevalidacionCobro = true): TramiteDetalle {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    numeroTramite: 42,
    tipoConstancia: 'NO_ADEUDO',
    personalidad: 'FISICA',
    representacion: 'TITULAR',
    nis: '10234567',
    versionCatalogoId: '22222222-2222-2222-2222-222222222222',
    estado: 'APROBADO',
    aprobadoEn: '2026-01-01T12:00:00.000Z',
    requiereRevalidacionCobro,
    evidencias: [],
    validacionesNoAdeudo: [],
    validacionesNoRegistro: [],
    confirmaciones: [],
    cobro: null,
    constancia: null,
  } as unknown as TramiteDetalle;
}

const renderizar = (requiereRevalidacionCobro = true) =>
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ThemeProvider theme={theme}>
          <PasoCobro tramite={construirTramite(requiereRevalidacionCobro)} />
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

  it('no exige revalidación cuando el backend indica que no hace falta (dentro de la ventana de gracia)', () => {
    renderizar(false);
    expect(screen.queryByText(/revalidación de no adeudo/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar sin adeudo en ouc/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cobrar$/i })).toBeInTheDocument();
  });
});

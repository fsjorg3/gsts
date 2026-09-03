import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { store } from '@/app/store';
import { theme } from '@/app/theme';
import type { TramiteDetalle } from '../api';
import { PasoValidacion } from './PasoValidacion';

// Fixture mínimo: PasoValidacion sólo lee tipo/personalidad/representación,
// nis, evidencias y las validaciones ya registradas.
function construirTramite(tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO'): TramiteDetalle {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    numeroTramite: 42,
    tipoConstancia,
    personalidad: 'FISICA',
    representacion: 'TITULAR',
    nis: '10234567',
    versionCatalogoId: '22222222-2222-2222-2222-222222222222',
    estado: 'EN_VALIDACION',
    evidencias: [],
    validacionesNoAdeudo: [],
    validacionesNoRegistro: [],
    confirmaciones: [],
    cobro: null,
    constancia: null,
  } as unknown as TramiteDetalle;
}

const renderizar = (tipoConstancia: 'NO_ADEUDO' | 'NO_REGISTRO') =>
  render(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <ThemeProvider theme={theme}>
          <PasoValidacion tramite={construirTramite(tipoConstancia)} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  );

const archivoFalso = () => new File(['contenido'], 'consulta.png', { type: 'image/png' });

afterEach(cleanup);

describe('PasoValidacion', () => {
  it('deshabilita "Registrar sin adeudo" hasta adjuntar la evidencia OUC', () => {
    renderizar('NO_ADEUDO');
    const boton = screen.getByRole('button', { name: /registrar sin adeudo/i });
    expect(boton).toBeDisabled();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivoFalso()] } });

    expect(boton).toBeEnabled();
  });

  it('deshabilita "Registrar con adeudo" hasta adjuntar la evidencia OUC', () => {
    renderizar('NO_ADEUDO');
    const boton = screen.getByRole('button', { name: /registrar con adeudo/i });
    expect(boton).toBeDisabled();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivoFalso()] } });

    expect(boton).toBeEnabled();
  });

  it('deshabilita las decisiones de No Registro hasta adjuntar la evidencia', () => {
    renderizar('NO_REGISTRO');
    const sinRegistro = screen.getByRole('button', { name: /sin registro en el padrón/i });
    const conRegistro = screen.getByRole('button', { name: /el predio sí está registrado/i });
    expect(sinRegistro).toBeDisabled();
    expect(conRegistro).toBeDisabled();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [archivoFalso()] } });

    expect(sinRegistro).toBeEnabled();
    expect(conRegistro).toBeEnabled();
  });
});

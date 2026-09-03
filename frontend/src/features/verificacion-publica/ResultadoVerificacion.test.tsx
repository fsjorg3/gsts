import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { theme } from '@/app/theme';
import type { VerificacionConstancia } from './api';
import { ResultadoVerificacion } from './ResultadoVerificacion';

afterEach(cleanup);

function renderizar(resultado: VerificacionConstancia) {
  render(
    <ThemeProvider theme={theme}>
      <ResultadoVerificacion resultado={resultado} />
    </ThemeProvider>,
  );
}

const BASE: VerificacionConstancia = {
  valido: true,
  folio: 'GSTS-42',
  tipo: 'NO_ADEUDO',
  estado: 'VIGENTE',
  vigenciaHasta: '2099-01-15T00:00:00.000Z',
  titular: { nombreRazonSocial: 'Juan Pérez Salinas' },
};

describe('ResultadoVerificacion', () => {
  it('muestra folio, titular y el estado', () => {
    renderizar(BASE);
    expect(screen.getByText('GSTS-42')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez Salinas')).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('no muestra domicilio en una constancia de No Adeudo', () => {
    renderizar(BASE);
    expect(screen.queryByText('Predio')).not.toBeInTheDocument();
  });

  it('muestra el domicilio del predio en una constancia de No Registro', () => {
    renderizar({
      ...BASE,
      tipo: 'NO_REGISTRO',
      domicilio: { calle: 'CALLE 12 NORTE', numero: '612', colonia: 'COLONIA CENTRO', perteneceA: 'JUNTA_AUXILIAR', perteneceANombre: 'SAN BALTAZAR CAMPECHE' },
    });
    expect(screen.getByText('Predio')).toBeInTheDocument();
    expect(screen.getByText('CALLE 12 NORTE 612, COLONIA CENTRO')).toBeInTheDocument();
  });

  it('etiqueta vencida y anulada con su propio color', () => {
    renderizar({ ...BASE, estado: 'VENCIDA' });
    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });
});

import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '@/app/store';
import { theme } from '@/app/theme';
import { ApiError } from '@/api/errors';

// Único punto de red de la prueba: NuevoTramite dispara tres queries (catálogo
// activo, búsqueda de personas y consulta al padrón por NIS) — se mockea el
// cliente HTTP compartido en vez de cada api.ts, para no tener que replicar
// tres módulos distintos.
const NIS_ENCONTRADO = '2164542';
const PERSONA_EXISTENTE = { id: 'persona-existente', tipo: 'FISICA' as const, nombreRazonSocial: 'ANA TORRES GOMEZ', rfc: null };
const PERSONA_MORAL = { id: 'persona-moral', tipo: 'MORAL' as const, nombreRazonSocial: 'EMPRESA DEL CENTRO', rfc: 'ECE010101AAA' };
const OTRO_NIS = '7654321';
const PADRON = {
  nis: NIS_ENCONTRADO,
  nombreSugerido: 'CANIZALES, JAIME',
  titularPago: null,
  domicilio: { calle: 'CALLE PLAZA B M 6', numero: '4', colonia: 'INFONAVIT SAN JORGE', perteneceA: null, perteneceANombre: null },
  origen: 'IMPORTADO',
};
const OTRO_PADRON = { ...PADRON, nis: OTRO_NIS, nombreSugerido: 'MARIA LOPEZ', domicilio: { ...PADRON.domicilio, calle: 'CALLE NUEVA', numero: '20' } };

const responderGet = async (path: string, options?: { params?: { path?: Record<string, string>; query?: Record<string, unknown> } }) => {
  if (path === '/catalogos/requisitos/activo') return { data: { data: { id: 'cat-1' } } };
  if (path === '/personas') {
    const search = options?.params?.query?.search;
    return { data: { data: [PERSONA_EXISTENTE, PERSONA_MORAL].filter((persona) => persona.nombreRazonSocial === search) } };
  }
  if (path === '/padron/{nis}') {
    const nis = options?.params?.path?.nis;
    if (nis === NIS_ENCONTRADO) return { data: { data: PADRON } };
    if (nis === OTRO_NIS) return { data: { data: OTRO_PADRON } };
    throw new ApiError(404, { error: { code: 'NOT_FOUND', message: 'NIS no encontrado' } });
  }
  throw new Error(`GET no mockeado en el test: ${path}`);
};
const mockGet = vi.fn(responderGet);

const mockPost = vi.fn();

vi.mock('@/api/client', () => ({
  api: { GET: (...args: Parameters<typeof mockGet>) => mockGet(...args), POST: (...args: Parameters<typeof mockPost>) => mockPost(...args) },
}));

const { NuevoTramite } = await import('./NuevoTramite');

const renderizar = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Outlet context={{ abrirMenu: () => undefined }} />,
      children: [
        { index: true, element: <NuevoTramite /> },
        { path: 'ventanilla/tramites/:id', element: <div>Expediente creado</div> },
      ],
    },
  ]);
  const vista = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  );
  return { ...vista, router, queryClient };
};

beforeEach(() => {
  // React Router construye un Request de Node al navegar; su signal debe
  // provenir del mismo runtime, no del AbortController que aporta jsdom.
  vi.stubGlobal('AbortController', transferableAbortController().constructor);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mockGet.mockReset().mockImplementation(responderGet);
  mockPost.mockReset();
});

function cambiarCampo(label: RegExp, valor: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: valor } });
}

function capturarNoRegistro() {
  fireEvent.click(screen.getByLabelText(/constancia de no registro/i));
  cambiarCampo(/^calle$/i, 'CALLE X');
  cambiarCampo(/^número$/i, '10');
  cambiarCampo(/^colonia$/i, 'CENTRO');
  cambiarCampo(/nombre de la junta auxiliar/i, 'SAN JERONIMO');
}

async function seleccionarPersona(label: RegExp, persona: typeof PERSONA_EXISTENTE | typeof PERSONA_MORAL = PERSONA_EXISTENTE) {
  const usuario = userEvent.setup();
  await usuario.click(screen.getByRole('combobox', { name: label }));
  await usuario.paste(persona.nombreRazonSocial);
  await usuario.click(await screen.findByRole('option', { name: new RegExp(persona.nombreRazonSocial, 'i') }));
}

function responderAltas() {
  mockPost.mockImplementation(async (path: string, options?: { body?: Record<string, unknown> }) => {
    if (path === '/personas') return { data: { data: { id: `persona-${String(options?.body?.nombreRazonSocial)}`, rfc: null, ...options?.body } } };
    if (path === '/tramites') return { data: { data: { id: 'tramite-1' } } };
    throw new Error(`POST no mockeado en el test: ${path}`);
  });
}

function respuestaPendiente<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promesa, resolver };
}

describe('NuevoTramite — lookup de padrón por NIS (No Adeudo)', () => {
  it('autocompleta domicilio y sugiere el nombre cuando el NIS existe en el catálogo offline', async () => {
    renderizar();
    const nis = screen.getByLabelText(/nis \/ número de cuenta/i);
    fireEvent.change(nis, { target: { value: NIS_ENCONTRADO } });

    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue('CALLE PLAZA B M 6'));
    expect(screen.getByLabelText(/^número$/i)).toHaveValue('4');
    expect(screen.getByLabelText(/^colonia$/i)).toHaveValue('INFONAVIT SAN JORGE');
    expect(screen.queryByText(/no está en el catálogo offline/i)).not.toBeInTheDocument();

    // El nombre sugerido precarga la búsqueda de persona (editable después).
    await waitFor(() => expect(screen.getByRole('combobox', { name: /nombre completo del titular/i })).toHaveValue('CANIZALES, JAIME'));
  });

  it('avisa y deja domicilio en blanco para captura manual cuando el NIS no está en el catálogo', async () => {
    renderizar();
    const nis = screen.getByLabelText(/nis \/ número de cuenta/i);
    fireEvent.change(nis, { target: { value: '999999' } });

    await waitFor(() => expect(screen.getByText(/no está en el catálogo offline del padrón/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^calle$/i)).not.toBeDisabled();
  });
});

describe('NuevoTramite — quien se presenta distinto del titular', () => {
  it('da de alta ambas personas de forma transparente al dar clic en "Crear trámite"', async () => {
    const personas: Record<string, { id: string }> = {};
    mockPost.mockImplementation(async (path: string, options?: { body?: Record<string, unknown> }) => {
      if (path === '/personas') {
        const body = options?.body as { nombreRazonSocial: string; tipo: string };
        const persona = { id: `persona-${body.nombreRazonSocial}`, tipo: body.tipo, nombreRazonSocial: body.nombreRazonSocial, rfc: null };
        personas[body.nombreRazonSocial] = persona;
        return { data: { data: persona } };
      }
      if (path === '/tramites') return { data: { data: { id: 'tramite-1' } } };
      throw new Error(`POST no mockeado en el test: ${path}`);
    });

    renderizar();

    // Sin elegir "Representante" no debe existir la segunda tarjeta.
    expect(screen.queryByRole('combobox', { name: /nombre completo del representante/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^representante$/i));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /nombre completo del representante/i })).toBeInTheDocument());

    // Domicilio: NIS fuera del catálogo, captura manual (mismo camino que el test de arriba).
    fireEvent.change(screen.getByLabelText(/nis \/ número de cuenta/i), { target: { value: '999999' } });
    await waitFor(() => expect(screen.getByText(/no está en el catálogo offline del padrón/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/^calle$/i), { target: { value: 'CALLE X' } });
    fireEvent.change(screen.getByLabelText(/^número$/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/^colonia$/i), { target: { value: 'CENTRO' } });

    const boton = screen.getByRole('button', { name: /crear trámite/i });
    expect(boton).toBeDisabled();

    // El titular sigue siendo "Nombre completo del titular": no cambia de significado.
    // Ya no hay botón "Registrar persona" — sólo se teclea el nombre.
    fireEvent.change(screen.getByRole('combobox', { name: /nombre completo del titular/i }), { target: { value: 'JUAN PEREZ' } });
    await waitFor(() => expect(screen.getByText(/«JUAN PEREZ» no existe/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /registrar persona/i })).not.toBeInTheDocument();

    // Aún deshabilitado: falta la persona que se presenta.
    expect(boton).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: /nombre completo del representante/i }), { target: { value: 'MARIA LOPEZ' } });
    await waitFor(() => expect(screen.getByText(/«MARIA LOPEZ» no existe/i)).toBeInTheDocument());

    await waitFor(() => expect(boton).not.toBeDisabled());
    fireEvent.click(boton);

    // El clic único resuelve (da de alta) ambas personas antes de crear el trámite.
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/personas', expect.objectContaining({ body: expect.objectContaining({ nombreRazonSocial: 'JUAN PEREZ' }) })),
    );
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/personas', expect.objectContaining({ body: expect.objectContaining({ nombreRazonSocial: 'MARIA LOPEZ' }) })),
    );
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/tramites',
        expect.objectContaining({
          body: expect.objectContaining({
            personas: [
              { personaId: personas['JUAN PEREZ']!.id, rol: 'TITULAR' },
              { personaId: personas['MARIA LOPEZ']!.id, rol: 'REPRESENTANTE' },
            ],
          }),
        }),
      ),
    );
  });
});

describe('NuevoTramite — reutiliza una persona existente', () => {
  it('no crea una persona nueva cuando el nombre tecleado se elige de la búsqueda', async () => {
    mockPost.mockImplementation(async (path: string) => {
      if (path === '/tramites') return { data: { data: { id: 'tramite-1' } } };
      throw new Error(`POST no mockeado en el test: ${path}`);
    });

    renderizar();
    const usuario = userEvent.setup();

    // No Registro: domicilio 100% manual, sin padrón — mantiene el caso enfocado en personas.
    fireEvent.click(screen.getByLabelText(/constancia de no registro/i));
    fireEvent.change(screen.getByLabelText(/^calle$/i), { target: { value: 'CALLE X' } });
    fireEvent.change(screen.getByLabelText(/^número$/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/^colonia$/i), { target: { value: 'CENTRO' } });
    fireEvent.change(screen.getByLabelText(/nombre de la junta auxiliar/i), { target: { value: 'SAN JERONIMO' } });

    const titular = screen.getByRole('combobox', { name: /nombre completo del titular/i });
    await usuario.type(titular, PERSONA_EXISTENTE.nombreRazonSocial);
    const opcion = await screen.findByRole('option', { name: new RegExp(PERSONA_EXISTENTE.nombreRazonSocial, 'i') });
    await usuario.click(opcion);
    expect(screen.queryByText(/no existe/i)).not.toBeInTheDocument();

    const boton = screen.getByRole('button', { name: /crear trámite/i });
    await waitFor(() => expect(boton).not.toBeDisabled());
    fireEvent.click(boton);

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/tramites',
        expect.objectContaining({
          body: expect.objectContaining({ personas: [{ personaId: PERSONA_EXISTENTE.id, rol: 'TITULAR' }] }),
        }),
      ),
    );
    expect(mockPost).not.toHaveBeenCalledWith('/personas', expect.anything());
  });
});

describe('NuevoTramite — identidad de la captura', () => {
  it.each(['TITULAR', 'REPRESENTANTE', 'APODERADO'] as const)('descarta el ID anterior al editar el nombre de %s', async (rol) => {
    responderAltas();
    const { router } = renderizar();
    capturarNoRegistro();
    if (rol === 'APODERADO') fireEvent.click(screen.getByLabelText(/^moral$/i));
    if (rol === 'REPRESENTANTE') fireEvent.click(screen.getByLabelText(/^representante$/i));
    if (rol !== 'TITULAR') cambiarCampo(rol === 'APODERADO' ? /razón social/i : /nombre completo del titular/i, 'TITULAR NUEVO');
    const label = rol === 'TITULAR' ? /nombre completo del titular/i : rol === 'REPRESENTANTE' ? /nombre completo del representante/i : /nombre completo del apoderado legal/i;
    await seleccionarPersona(label);
    cambiarCampo(label, 'OTRA PERSONA');
    const usuario = userEvent.setup();
    await usuario.keyboard('{Enter}');
    await usuario.tab();
    expect(screen.getByRole('combobox', { name: label })).toHaveValue('OTRA PERSONA');
    await usuario.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(router.state.location.pathname).toBe('/ventanilla/tramites/tramite-1');
    expect(mockPost).toHaveBeenCalledWith('/personas', expect.objectContaining({ body: expect.objectContaining({ nombreRazonSocial: 'OTRA PERSONA', tipo: 'FISICA' }) }));
    const envio = mockPost.mock.calls.find(([path]) => path === '/tramites')?.[1] as { body: { personas: { personaId: string; rol: string }[] } };
    expect(envio.body.personas).toContainEqual({ personaId: 'persona-OTRA PERSONA', rol });
    expect(envio.body.personas.some((persona) => persona.personaId === PERSONA_EXISTENTE.id)).toBe(false);
  });

  it('permite limpiar y volver a seleccionar sin que Enter o blur invaliden la selección', async () => {
    responderAltas();
    renderizar();
    capturarNoRegistro();
    await seleccionarPersona(/nombre completo del titular/i);
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('combobox'));
    await usuario.click(screen.getByTitle('Clear'));
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByRole('button', { name: /crear trámite/i })).toBeDisabled();
    await seleccionarPersona(/nombre completo del titular/i);
    await usuario.keyboard('{Enter}');
    await usuario.tab();
    await usuario.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(mockPost).not.toHaveBeenCalledWith('/personas', expect.anything());
    expect(mockPost).toHaveBeenCalledWith('/tramites', expect.objectContaining({ body: expect.objectContaining({ personas: [{ personaId: PERSONA_EXISTENTE.id, rol: 'TITULAR' }] }) }));
  });

  it('conserva la identidad si sólo cambian espacios exteriores del nombre', async () => {
    responderAltas();
    renderizar();
    capturarNoRegistro();
    await seleccionarPersona(/nombre completo del titular/i);
    cambiarCampo(/nombre completo del titular/i, `  ${PERSONA_EXISTENTE.nombreRazonSocial}  `);
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(mockPost).not.toHaveBeenCalledWith('/personas', expect.anything());
  });

  it('limpia el RFC de una persona moral cuando su nombre se sustituye por otro', async () => {
    responderAltas();
    renderizar();
    capturarNoRegistro();
    fireEvent.click(screen.getByLabelText(/^moral$/i));
    cambiarCampo(/nombre completo del apoderado legal/i, 'APODERADO');
    await seleccionarPersona(/razón social/i, PERSONA_MORAL);
    cambiarCampo(/razón social/i, 'EMPRESA NUEVA');
    await waitFor(() => expect(screen.getByLabelText(/rfc \(opcional\)/i)).toHaveValue(''));
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(mockPost).toHaveBeenCalledWith('/personas', { body: { tipo: 'MORAL', nombreRazonSocial: 'EMPRESA NUEVA' } });
  });

  it('limpia titular y RFC al cambiar personalidad en ambos sentidos, conservando predio y presentante', async () => {
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    const usuario = userEvent.setup();
    await usuario.clear(screen.getByRole('combobox', { name: /nombre completo del titular/i }));
    await seleccionarPersona(/nombre completo del titular/i);
    fireEvent.click(screen.getByLabelText(/^representante$/i));
    cambiarCampo(/nombre completo del representante/i, 'PRESENTANTE');
    fireEvent.click(screen.getByLabelText(/^moral$/i));
    expect(screen.getByRole('combobox', { name: /razón social/i })).toHaveValue('');
    expect(screen.getByRole('button', { name: /crear trámite/i })).toBeDisabled();
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle);
    expect(screen.getByLabelText(/nis \/ número de cuenta/i)).toHaveValue(NIS_ENCONTRADO);
    expect(screen.getByRole('combobox', { name: /nombre completo del apoderado legal/i })).toHaveValue('PRESENTANTE');
    await seleccionarPersona(/razón social/i, PERSONA_MORAL);
    fireEvent.click(screen.getByLabelText(/^física$/i));
    expect(screen.getByRole('combobox', { name: /nombre completo del titular/i })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /nombre completo del representante/i })).toHaveValue('PRESENTANTE');
    expect(screen.getByRole('button', { name: /crear trámite/i })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/^moral$/i));
    cambiarCampo(/razón social/i, 'OTRA EMPRESA');
    await waitFor(() => expect(screen.getByLabelText(/rfc \(opcional\)/i)).toHaveValue(''));
  });
});

describe('NuevoTramite — ciclos de captura del NIS', () => {
  it('limpia titular y domicilio manuales, preserva presentante y aplica sólo el NIS nuevo', async () => {
    responderAltas();
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    cambiarCampo(/^calle$/i, 'CALLE CORREGIDA');
    cambiarCampo(/nombre completo del titular/i, 'TITULAR MANUAL');
    fireEvent.click(screen.getByLabelText(/^municipio$/i));
    cambiarCampo(/nombre del municipio/i, 'MUNICIPIO MANUAL');
    fireEvent.click(screen.getByLabelText(/^representante$/i));
    cambiarCampo(/nombre completo del representante/i, 'PRESENTANTE');

    cambiarCampo(/nis \/ número de cuenta/i, OTRO_NIS);
    expect(screen.getByRole('combobox', { name: /nombre completo del titular/i })).toHaveValue('');
    for (const label of [/^calle$/i, /^número$/i, /^colonia$/i, /nombre de la junta auxiliar/i]) {
      expect(screen.getByLabelText(label)).toHaveValue('');
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    expect(screen.getByLabelText(/^junta auxiliar$/i)).toBeChecked();
    expect(screen.getByRole('combobox', { name: /nombre completo del representante/i })).toHaveValue('PRESENTANTE');
    expect(screen.getByRole('button', { name: /crear trámite/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(OTRO_PADRON.domicilio.calle));
    expect(screen.getByRole('combobox', { name: /nombre completo del titular/i })).toHaveValue(OTRO_PADRON.nombreSugerido);
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(mockPost).toHaveBeenCalledWith('/tramites', expect.objectContaining({ body: expect.objectContaining({ nis: OTRO_NIS, domicilioCalle: OTRO_PADRON.domicilio.calle, domicilioNumero: '20' }) }));
  });

  it('descarta al titular seleccionado al cambiar a un NIS inexistente y permite el alta manual', async () => {
    responderAltas();
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    const usuario = userEvent.setup();
    await usuario.clear(screen.getByRole('combobox', { name: /nombre completo del titular/i }));
    await seleccionarPersona(/nombre completo del titular/i);
    cambiarCampo(/nis \/ número de cuenta/i, '999999');
    await screen.findByText(/no está en el catálogo offline del padrón/i);
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('');
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByRole('combobox')).not.toBeDisabled();
    cambiarCampo(/nombre completo del titular/i, 'NUEVO TITULAR');
    cambiarCampo(/^calle$/i, 'CALLE MANUAL');
    cambiarCampo(/^número$/i, '1');
    cambiarCampo(/^colonia$/i, 'CENTRO');
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(mockPost).toHaveBeenCalledWith('/tramites', expect.objectContaining({ body: expect.objectContaining({ nis: '999999', domicilioCalle: 'CALLE MANUAL', personas: [{ personaId: 'persona-NUEVO TITULAR', rol: 'TITULAR' }] }) }));
  });

  it('limpia al borrar el NIS y vuelve a aplicar A en A → B → A antes del debounce', async () => {
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    cambiarCampo(/^calle$/i, 'CORRECCIÓN');
    cambiarCampo(/nis \/ número de cuenta/i, OTRO_NIS);
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    expect(screen.getByRole('combobox')).toHaveValue(PADRON.nombreSugerido);
    expect(mockGet.mock.calls.filter(([path]) => path === '/padron/{nis}')).toHaveLength(1);
    cambiarCampo(/nis \/ número de cuenta/i, '');
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^calle$/i)).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /crear trámite/i })).toBeDisabled();
  });

  it('conserva correcciones ante espacios exteriores del NIS y refetches posteriores', async () => {
    const { queryClient } = renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    cambiarCampo(/^calle$/i, 'CALLE CORREGIDA');
    cambiarCampo(/nombre completo del titular/i, 'TITULAR CORREGIDO');
    cambiarCampo(/nis \/ número de cuenta/i, ` ${NIS_ENCONTRADO} `);
    expect(screen.getByRole('combobox')).toHaveValue('TITULAR CORREGIDO');
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('CALLE CORREGIDA');
    mockGet.mockImplementation(async (path, options) => path === '/padron/{nis}'
      ? { data: { data: { ...OTRO_PADRON, nis: NIS_ENCONTRADO } } }
      : responderGet(path, options));
    await act(async () => { await queryClient.invalidateQueries({ queryKey: ['padron', NIS_ENCONTRADO] }); });
    expect(screen.getByRole('combobox')).toHaveValue('TITULAR CORREGIDO');
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('CALLE CORREGIDA');
  });

  it('ignora la respuesta tardía de A después de resolver B y permite volver a A cacheado', async () => {
    const pendiente = respuestaPendiente<Awaited<ReturnType<typeof responderGet>>>();
    mockGet.mockImplementation(async (path, options) => path === '/padron/{nis}' && options?.params?.path?.nis === NIS_ENCONTRADO
      ? pendiente.promesa : responderGet(path, options));
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    expect(screen.getByRole('combobox')).toBeDisabled();
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/padron/{nis}', expect.anything()));
    expect(screen.getByLabelText(/^calle$/i)).toBeDisabled();
    cambiarCampo(/nis \/ número de cuenta/i, OTRO_NIS);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(OTRO_PADRON.domicilio.calle));
    await act(async () => { pendiente.resolver({ data: { data: PADRON } }); await pendiente.promesa; });
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue(OTRO_PADRON.domicilio.calle);
    expect(screen.getByRole('combobox')).toHaveValue(OTRO_PADRON.nombreSugerido);
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(screen.getByLabelText(/^calle$/i)).toHaveValue(PADRON.domicilio.calle));
    expect(screen.getByRole('combobox')).toHaveValue(PADRON.nombreSugerido);
  });

  it('no aplica una consulta pendiente después de pasar a No Registro, ni al regresar con el mismo NIS', async () => {
    const pendiente = respuestaPendiente<Awaited<ReturnType<typeof responderGet>>>();
    mockGet.mockImplementation(async (path, options) => path === '/padron/{nis}' ? pendiente.promesa : responderGet(path, options));
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/padron/{nis}', expect.anything()));
    capturarNoRegistro();
    cambiarCampo(/nombre completo del titular/i, 'TITULAR MANUAL');
    await act(async () => { pendiente.resolver({ data: { data: PADRON } }); await pendiente.promesa; });
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('CALLE X');
    expect(screen.getByRole('combobox')).toHaveValue('TITULAR MANUAL');
    fireEvent.click(screen.getByLabelText(/constancia de no adeudo/i));
    expect(screen.getByLabelText(/^calle$/i)).toHaveValue('CALLE X');
    expect(screen.getByRole('combobox')).toHaveValue('TITULAR MANUAL');
  });

  it('distingue un error de consulta de un NIS inexistente y habilita la captura manual', async () => {
    mockGet.mockImplementation(async (path, options) => {
      if (path === '/padron/{nis}') throw new ApiError(503, { error: { code: 'UNAVAILABLE', message: 'Sin conexión' } });
      return responderGet(path, options);
    });
    responderAltas();
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, NIS_ENCONTRADO);
    await screen.findByText(/no se pudo consultar el catálogo offline del padrón/i);
    expect(screen.queryByText(/no está en el catálogo offline del padrón/i)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toBeDisabled();
    expect(screen.getByLabelText(/^calle$/i)).not.toBeDisabled();
    cambiarCampo(/nombre completo del titular/i, 'TITULAR MANUAL');
    cambiarCampo(/^calle$/i, 'CALLE MANUAL');
    cambiarCampo(/^número$/i, '1');
    cambiarCampo(/^colonia$/i, 'CENTRO');
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
  });
});

describe('NuevoTramite — envío y reintentos', () => {
  it('bloquea la edición durante altas y creación, y reutiliza las personas tras un fallo del trámite', async () => {
    const altaTitular = respuestaPendiente<{ data: { data: typeof PERSONA_EXISTENTE } }>();
    const altaPresentante = respuestaPendiente<{ data: { data: typeof PERSONA_EXISTENTE } }>();
    const creacion = respuestaPendiente<void>();
    mockPost.mockImplementation(async (path: string, options?: { body?: { nombreRazonSocial?: string } }) => {
      if (path === '/personas') return options?.body?.nombreRazonSocial === PERSONA_EXISTENTE.nombreRazonSocial ? altaTitular.promesa : altaPresentante.promesa;
      await creacion.promesa;
      throw new Error('No se pudo crear el trámite');
    });
    renderizar();
    cambiarCampo(/nis \/ número de cuenta/i, '999999');
    await screen.findByText(/no está en el catálogo offline del padrón/i);
    cambiarCampo(/^calle$/i, 'CALLE X');
    cambiarCampo(/^número$/i, '10');
    cambiarCampo(/^colonia$/i, 'CENTRO');
    cambiarCampo(/nombre completo del titular/i, PERSONA_EXISTENTE.nombreRazonSocial);
    fireEvent.click(screen.getByLabelText(/^representante$/i));
    cambiarCampo(/nombre completo del representante/i, 'PRESENTANTE');
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    const comprobarBloqueo = () => {
      for (const campo of screen.getAllByRole('combobox')) expect(campo).toBeDisabled();
      for (const campo of screen.getAllByRole('radio')) expect(campo).toBeDisabled();
      expect(screen.getByLabelText(/nis \/ número de cuenta/i)).toBeDisabled();
      expect(screen.getByLabelText(/^calle$/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /crear trámite/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
    };
    comprobarBloqueo();
    await act(async () => { altaTitular.resolver({ data: { data: PERSONA_EXISTENTE } }); await altaTitular.promesa; });
    comprobarBloqueo();
    await act(async () => { altaPresentante.resolver({ data: { data: { ...PERSONA_EXISTENTE, id: 'presentante', nombreRazonSocial: 'PRESENTANTE' } } }); await altaPresentante.promesa; });
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/tramites', expect.anything()));
    comprobarBloqueo();
    await act(async () => { creacion.resolver(undefined); });
    await waitFor(() => expect(screen.getByRole('button', { name: /crear trámite/i })).not.toBeDisabled());
    mockPost.mockImplementation(async () => ({ data: { data: { id: 'tramite-1' } } }));
    fireEvent.click(screen.getByRole('button', { name: /crear trámite/i }));
    await screen.findByText('Expediente creado');
    expect(mockPost.mock.calls.filter(([path]) => path === '/personas')).toHaveLength(2);
    expect(mockPost.mock.calls.filter(([path]) => path === '/tramites')).toHaveLength(2);
  });
});
import { transferableAbortController } from 'node:util';

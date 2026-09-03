import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificar } from '@/store/useNotificar';
import { formatFecha } from '@/api/serializers';
import { Card, ConfirmDialog, EstadoBadge, MsIcon } from '@/shared/components';
import { catalogoActivoOptions, catalogosListaOptions, catalogoVistaPreviaOptions } from '@/features/catalogos/api';
import {
  useCrearCatalogo,
  useDescartarBorrador,
  useEditarDocumento,
  useEditarGrupo,
  useEditarOpcion,
  useEliminarDocumento,
  useEliminarGrupo,
  useEliminarOpcion,
  usePublicarCatalogo,
  useValidarCatalogo,
  type VersionCatalogo,
} from '../../api';
import { AltaDocumentoForm } from './AltaDocumentoForm';
import { AltaGrupoForm } from './AltaGrupoForm';
import { AltaOpcionForm } from './AltaOpcionForm';
import { ArbolCatalogo } from './ArbolCatalogo';
import type { NodoEditando, NodoEliminando } from './catalogoTipos';
import { EditarDocumentoDialog } from './EditarDocumentoDialog';
import { EditarGrupoDialog } from './EditarGrupoDialog';
import { EditarOpcionDialog } from './EditarOpcionDialog';
import { PanelValidarPublicar } from './PanelValidarPublicar';

export function PanelCatalogo() {
  const notificar = useNotificar();
  const queryClient = useQueryClient();
  const activo = useQuery(catalogoActivoOptions);
  const lista = useQuery(catalogosListaOptions);
  const crear = useCrearCatalogo();
  const validar = useValidarCatalogo();
  const publicar = usePublicarCatalogo();
  const [borrador, setBorrador] = useState<VersionCatalogo | null>(null);
  const [errores, setErrores] = useState<string[] | null>(null);
  const vistaPrevia = useQuery({ ...catalogoVistaPreviaOptions(borrador?.id ?? ''), enabled: Boolean(borrador) });

  // La versión es única en toda la tabla (publicada o no) — nunca sólo activa+1,
  // o un borrador abandonado (como el que originó este arreglo) choca con el UNIQUE.
  const siguienteVersion = Math.max(0, ...(lista.data ?? []).map((v) => v.version)) + 1;
  const borradoresPendientes = (lista.data ?? []).filter((v) => !v.publicada);
  const refrescarLista = () => void queryClient.invalidateQueries({ queryKey: ['catalogos', 'lista'] });

  const editarGrupo = useEditarGrupo(borrador?.id ?? '');
  const editarOpcion = useEditarOpcion(borrador?.id ?? '');
  const editarDocumento = useEditarDocumento(borrador?.id ?? '');
  const eliminarGrupo = useEliminarGrupo(borrador?.id ?? '');
  const eliminarOpcion = useEliminarOpcion(borrador?.id ?? '');
  const eliminarDocumento = useEliminarDocumento(borrador?.id ?? '');
  const descartarBorrador = useDescartarBorrador();

  const [editando, setEditando] = useState<NodoEditando | null>(null);
  const [eliminando, setEliminando] = useState<NodoEliminando | null>(null);

  const eliminandoPendiente =
    eliminarGrupo.isPending || eliminarOpcion.isPending || eliminarDocumento.isPending || descartarBorrador.isPending;

  // Tras cambiar la estructura, la validación previa queda obsoleta.
  const trasCambioEstructura = () => { setErrores(null); setEditando(null); };

  const confirmarEliminacion = () => {
    if (!eliminando) return;
    const opciones = { onSuccess: () => { setEliminando(null); setErrores(null); }, onError: (error: unknown) => notificar.error(error) };
    switch (eliminando.nivel) {
      case 'grupo': return eliminarGrupo.mutate(eliminando.id, opciones);
      case 'opcion': return eliminarOpcion.mutate(eliminando.id, opciones);
      case 'documento': return eliminarDocumento.mutate(eliminando.id, opciones);
      case 'borrador':
        return descartarBorrador.mutate(eliminando.id, {
          onSuccess: () => { setEliminando(null); setBorrador(null); setErrores(null); refrescarLista(); notificar.exito('Borrador descartado.'); },
          onError: (error) => notificar.error(error),
        });
    }
  };

  const arbol = vistaPrevia.data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      <Card titulo="Catálogo activo">
        {activo.data ? (
          <Typography sx={{ fontSize: 13 }}>
            Versión <b>{activo.data.version}</b> · {activo.data.grupos.length} grupo(s) · publicado y activo.
          </Typography>
        ) : (
          <Alert severity="warning" icon={<MsIcon name="warning" size={20} />}>
            No hay catálogo activo: ventanilla no puede crear trámites hasta publicar uno.
          </Alert>
        )}
      </Card>

      {!borrador ? (
        <>
          {borradoresPendientes.length > 0 ? (
            <Card titulo="Borradores sin publicar">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {borradoresPendientes.map((v) => (
                  <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125, border: '1px solid', borderColor: 'divider', borderRadius: 0.75 }}>
                    <EstadoBadge label={`v${v.version}`} color="neutral" />
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }}>Creado {formatFecha(v.createdAt)}</Typography>
                    <Button size="small" variant="outlined" onClick={() => setBorrador(v)}>Continuar</Button>
                  </Box>
                ))}
              </Box>
            </Card>
          ) : null}

          <Card titulo="Nuevo borrador de catálogo">
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                variant="contained"
                disabled={crear.isPending || lista.isPending}
                onClick={() =>
                  crear.mutate(
                    { version: siguienteVersion, ...(activo.data ? { clonarDesdeId: activo.data.id } : {}) },
                    {
                      onSuccess: (v) => {
                        setBorrador(v);
                        refrescarLista();
                        notificar.exito(`Borrador v${v.version} creado${activo.data ? ' (clonado del activo)' : ''}.`);
                      },
                      onError: (error) => notificar.error(error),
                    },
                  )
                }
              >
                {activo.data ? `Crear borrador v${siguienteVersion} clonando el activo` : `Crear catálogo v${siguienteVersion}`}
              </Button>
              {activo.data ? (
                <Button
                  variant="outlined"
                  disabled={crear.isPending || lista.isPending}
                  onClick={() =>
                    crear.mutate(
                      { version: siguienteVersion },
                      {
                        onSuccess: (v) => {
                          setBorrador(v);
                          refrescarLista();
                          notificar.exito(`Borrador v${v.version} creado en blanco.`);
                        },
                        onError: (error) => notificar.error(error),
                      },
                    )
                  }
                >
                  {`Crear v${siguienteVersion} desde cero`}
                </Button>
              ) : null}
            </Box>
          </Card>
        </>
      ) : (
        <>
          <Card titulo={`Borrador v${borrador.version} — estructura`}>
            <ArbolCatalogo
              arbol={arbol}
              onEditar={setEditando}
              onEliminar={setEliminando}
            />

            {/* Alta de grupo */}
            <AltaGrupoForm borradorId={borrador.id} arbol={arbol} />

            {/* Alta de opción */}
            <AltaOpcionForm borradorId={borrador.id} arbol={arbol} />

            {/* Alta de documento */}
            <AltaDocumentoForm borradorId={borrador.id} arbol={arbol} />
          </Card>

          <PanelValidarPublicar
            errores={errores}
            validarPendiente={validar.isPending}
            publicarPendiente={publicar.isPending}
            onValidar={() =>
              validar.mutate(borrador.id, {
                onSuccess: (r) => setErrores(r.errors),
                onError: (error) => notificar.error(error),
              })
            }
            onPublicar={() =>
              publicar.mutate(borrador.id, {
                onSuccess: () => { setBorrador(null); setErrores(null); refrescarLista(); notificar.exito('Catálogo publicado y activado.'); },
                onError: (error) => notificar.error(error),
              })
            }
            onDescartarSesion={() => { setBorrador(null); setErrores(null); }}
            onSolicitarDescartarBorrador={() => setEliminando({ nivel: 'borrador', id: borrador.id, titulo: 'Descartar borrador', mensaje: `Se eliminará el borrador v${borrador.version} con toda su estructura. Esta acción no se puede deshacer.` })}
          />

          {editando?.nivel === 'grupo' ? (
            <EditarGrupoDialog
              grupo={editando.nodo}
              pendiente={editarGrupo.isPending}
              onClose={() => setEditando(null)}
              onGuardar={(payload) => editarGrupo.mutate(
                { id: editando.nodo.id, ...payload },
                { onSuccess: trasCambioEstructura, onError: (error) => notificar.error(error) },
              )}
            />
          ) : null}
          {editando?.nivel === 'opcion' ? (
            <EditarOpcionDialog
              opcion={editando.nodo}
              pendiente={editarOpcion.isPending}
              onClose={() => setEditando(null)}
              onGuardar={(payload) => editarOpcion.mutate(
                { id: editando.nodo.id, ...payload },
                { onSuccess: trasCambioEstructura, onError: (error) => notificar.error(error) },
              )}
            />
          ) : null}
          {editando?.nivel === 'documento' ? (
            <EditarDocumentoDialog
              documento={editando.nodo}
              pendiente={editarDocumento.isPending}
              onClose={() => setEditando(null)}
              onGuardar={(payload) => editarDocumento.mutate(
                { id: editando.nodo.id, ...payload },
                { onSuccess: trasCambioEstructura, onError: (error) => notificar.error(error) },
              )}
            />
          ) : null}

          <ConfirmDialog
            open={Boolean(eliminando)}
            titulo={eliminando?.titulo ?? ''}
            mensaje={eliminando?.mensaje ?? ''}
            textoConfirmar={eliminando?.nivel === 'borrador' ? 'Descartar borrador' : 'Eliminar'}
            pendiente={eliminandoPendiente}
            onClose={() => setEliminando(null)}
            onConfirm={confirmarEliminacion}
          />
        </>
      )}
    </Box>
  );
}

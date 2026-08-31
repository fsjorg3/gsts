import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useQuery, type UseMutationResult } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useNotificar } from '@/store/useNotificar';
import { formatBytes } from '@/api/serializers';
import { abrirBlobEnPestana } from '@/shared/descargarArchivo';
import { EstadoBadge, MsIcon } from '@/shared/components';
import { catalogoVistaPreviaOptions, gruposAplicables, type GrupoConArbol } from '@/features/catalogos/api';
import type { TramiteDetalle } from '@/features/tramites/api';
import { MAX_EVIDENCIA_TOTAL_BYTES, MIME_PERMITIDOS, useActualizarEvidencia, useDescargarEvidencia, useSubirEvidencia, type Evidencia } from './api';

// Checklist Y/O/Y del catálogo estampado en el trámite, con carga de evidencias.
// Grupos se combinan con Y; opciones de un grupo con O; documentos de una opción con Y.
// Al adjuntar, la evidencia se sube (CARGADO) y se valida en el acto (VALIDADO):
// en ventanilla el documento se coteja físicamente al recibirlo.

interface DocumentoEstado {
  evidenciaId?: string;
  nombreArchivo?: string;
  estado?: 'CARGADO' | 'VALIDADO' | 'RECHAZADO';
}

type DocumentoRequisito = GrupoConArbol['opciones'][number]['documentos'][number];
type Notificar = ReturnType<typeof useNotificar>;

export function checklistSatisfecho(grupos: GrupoConArbol[], porDocumento: Map<string, DocumentoEstado>): boolean {
  return grupos.every((grupo) =>
    grupo.opciones.some(
      (opcion) =>
        opcion.documentos.length > 0 &&
        opcion.documentos.every((doc) => porDocumento.get(doc.id)?.estado === 'VALIDADO'),
    ),
  );
}

const ACCEPT_EVIDENCIA = {
  'application/pdf': [],
  'image/jpeg': [],
  'image/png': [],
} as const;

/**
 * Preview local del archivo cargado. Persiste toda la sesión —no se limpia al
 * validarse— para que ventanilla pueda seguir cotejando visualmente que subió
 * el documento correcto: un error de dedo o un archivo con nombre engañoso
 * sólo se detecta viendo la imagen, y para corregirlo basta con Reemplazar.
 *
 * Sólo las imágenes generan una URL de blob (revocada al reemplazarla o al
 * desmontar); los PDF sólo guardan el nombre y se muestran con un ícono. Es
 * estado local: tras recargar la página queda el nombre real del archivo, sin
 * miniatura.
 */
interface PreviewArchivo {
  nombre: string;
  url?: string;
}

function DocumentoDropzone({
  doc,
  estadoDoc,
  soloLectura,
  totalBytes,
  subir,
  actualizar,
  descargar,
  notificar,
}: {
  doc: DocumentoRequisito;
  estadoDoc: DocumentoEstado | undefined;
  soloLectura: boolean;
  totalBytes: number;
  subir: UseMutationResult<Evidencia, Error, { opcionDocumentoId: string; archivo: File }>;
  actualizar: UseMutationResult<Evidencia, Error, { evidenciaId: string; estado: 'VALIDADO' | 'RECHAZADO' }>;
  descargar: UseMutationResult<Blob, Error, string>;
  notificar: Notificar;
}) {
  const [preview, setPreview] = useState<PreviewArchivo | null>(null);
  const validado = estadoDoc?.estado === 'VALIDADO';
  const rechazado = estadoDoc?.estado === 'RECHAZADO';
  const cargando = subir.isPending || actualizar.isPending;

  // Revoca la URL de blob del preview anterior al reemplazarlo o al desmontar
  // — mismo cuidado que descargarArchivo.ts con las URLs de descarga.
  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const { getRootProps, getInputProps, open, isDragActive, isDragReject } = useDropzone({
    accept: ACCEPT_EVIDENCIA,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: soloLectura || cargando,
    onDrop: (aceptados, rechazados) => {
      if (rechazados.length > 0) {
        notificar.error(new Error('Formato no permitido'));
        notificar.info('Sólo se aceptan PDF, JPG y PNG.');
        return;
      }
      const archivo = aceptados[0];
      if (!archivo) return;
      if (totalBytes + archivo.size > MAX_EVIDENCIA_TOTAL_BYTES) {
        notificar.info('El archivo excedería el límite de 30 MB acumulados del trámite.');
        return;
      }

      setPreview({ nombre: archivo.name, url: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : undefined });

      subir.mutate(
        { opcionDocumentoId: doc.id, archivo },
        {
          onSuccess: (evidencia) => {
            actualizar.mutate(
              { evidenciaId: evidencia.id, estado: 'VALIDADO' },
              {
                onError: (error) => {
                  setPreview(null);
                  notificar.error(error);
                },
              },
            );
          },
          onError: (error) => {
            setPreview(null);
            notificar.error(error);
          },
        },
      );
    },
  });

  const nombreMostrado = preview?.nombre ?? estadoDoc?.nombreArchivo;

  return (
    <Box
      {...getRootProps()}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.125,
        border: '1px solid',
        borderColor: isDragReject ? '#BA1A1A' : isDragActive ? '#5B132B' : 'divider',
        borderRadius: 0.75,
        bgcolor: isDragActive && !isDragReject ? '#FBEAEF' : validado ? '#E8F5E9' : rechazado ? '#FFEBEE' : 'transparent',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
    >
      <input {...getInputProps()} />
      {/* La miniatura ocupa el lugar del ícono de estado; el color del borde y
          el fondo verde de la fila siguen comunicando que está validado. */}
      {preview?.url ? (
        <Box
          component="img"
          src={preview.url}
          alt={`Vista previa de ${preview.nombre}`}
          sx={{
            width: 40, height: 40, borderRadius: 0.75, objectFit: 'cover', flexShrink: 0,
            border: '1px solid', borderColor: validado ? '#2E7D32' : rechazado ? '#BA1A1A' : '#5B132B',
          }}
        />
      ) : (
        <MsIcon
          name={validado ? 'task_alt' : rechazado ? 'error' : 'description'}
          size={19}
          color={validado ? '#2E7D32' : rechazado ? '#BA1A1A' : preview ? '#5B132B' : '#A7ADB3'}
        />
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{doc.nombre}</Typography>
        {nombreMostrado ? (
          <Typography noWrap sx={{ fontSize: 11, color: validado ? 'success.main' : 'text.disabled', mt: 0.25 }}>
            {nombreMostrado}
          </Typography>
        ) : null}
      </Box>
      {estadoDoc?.evidenciaId ? (
        <Button
          size="small"
          variant="text"
          disabled={descargar.isPending}
          onClick={() =>
            descargar.mutate(estadoDoc.evidenciaId!, {
              onSuccess: (blob) => abrirBlobEnPestana(blob),
              onError: (error) => notificar.error(error),
            })
          }
          startIcon={<MsIcon name="visibility" size={15} />}
        >
          {descargar.isPending ? 'Abriendo…' : 'Ver'}
        </Button>
      ) : null}
      {!soloLectura ? (
        <Button
          size="small"
          variant={validado ? 'text' : 'outlined'}
          disabled={cargando}
          onClick={open}
          startIcon={<MsIcon name={validado ? 'refresh' : 'upload'} size={15} />}
        >
          {validado ? 'Reemplazar' : rechazado ? 'Volver a cargar' : 'Adjuntar'}
        </Button>
      ) : null}
    </Box>
  );
}

export function ChecklistRequisitos({ tramite, soloLectura = false }: { tramite: TramiteDetalle; soloLectura?: boolean }) {
  const notificar = useNotificar();
  const catalogo = useQuery(catalogoVistaPreviaOptions(tramite.versionCatalogoId));
  const subir = useSubirEvidencia(tramite.id);
  const actualizar = useActualizarEvidencia(tramite.id);
  const descargar = useDescargarEvidencia(tramite.id);

  const grupos = useMemo(
    () =>
      catalogo.data
        ? gruposAplicables(catalogo.data, {
            tipoConstancia: tramite.tipoConstancia,
            personalidad: tramite.personalidad,
            representacion: tramite.representacion,
          })
        : [],
    [catalogo.data, tramite],
  );

  // Última evidencia por documento (puede haber recargas tras un rechazo).
  const porDocumento = useMemo(() => {
    const mapa = new Map<string, DocumentoEstado>();
    for (const e of tramite.evidencias) {
      mapa.set(e.opcionDocumentoId, { evidenciaId: e.id, nombreArchivo: e.nombreOriginal, estado: e.estado });
    }
    return mapa;
  }, [tramite.evidencias]);

  const totalBytes = tramite.evidencias.reduce((suma, e) => suma + e.tamanoBytes, 0);

  if (catalogo.isPending) {
    return <Typography variant="body2" sx={{ color: 'text.disabled' }}>Cargando catálogo de requisitos…</Typography>;
  }

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
        <MsIcon name="fact_check" size={20} color="#5B132B" />
        <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Requisitos documentales</Typography>
        <EstadoBadge label={`Catálogo estampado`} color="neutral" />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled', mb: 2 }}>
        Todos los grupos son obligatorios (Y). Dentro de cada grupo basta satisfacer una opción (O). Arrastra el archivo sobre el
        documento o usa el botón — sólo PDF, JPG y PNG ({MIME_PERMITIDOS.join(', ')}).
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {grupos.map((grupo) => {
          const grupoOk = grupo.opciones.some(
            (o) => o.documentos.length > 0 && o.documentos.every((d) => porDocumento.get(d.id)?.estado === 'VALIDADO'),
          );
          return (
            <Box key={grupo.id} sx={{ border: '1px solid', borderColor: grupoOk ? '#C8E6C9' : 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1.375, bgcolor: grupoOk ? '#E8F5E9' : 'grey.50' }}>
                <MsIcon name={grupoOk ? 'check_circle' : 'folder_open'} size={18} color={grupoOk ? '#2E7D32' : '#5B132B'} />
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{grupo.nombre}</Typography>
                <Typography variant="overline" sx={{ color: 'text.disabled' }}>
                  {grupo.opciones.length > 1 ? 'Una opción basta' : 'Obligatorio'}
                </Typography>
              </Box>
              <Box sx={{ px: 1.75, pb: 1.5, pt: 0.75 }}>
                {grupo.opciones.map((opcion, indice) => (
                  <Box key={opcion.id} sx={{ pt: 1.25 }}>
                    {indice > 0 ? (
                      <Typography sx={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'text.disabled', letterSpacing: '0.1em', mb: 1.25 }}>
                        — O —
                      </Typography>
                    ) : null}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {opcion.documentos.map((doc) => (
                        <DocumentoDropzone
                          key={doc.id}
                          doc={doc}
                          estadoDoc={porDocumento.get(doc.id)}
                          soloLectura={soloLectura}
                          totalBytes={totalBytes}
                          subir={subir}
                          actualizar={actualizar}
                          descargar={descargar}
                          notificar={notificar}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
        <MsIcon name="folder_zip" size={16} color="#A7ADB3" />
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'text.disabled' }}>
          {formatBytes(totalBytes)} de 30 MB · PDF, JPG, PNG
        </Typography>
      </Box>
    </Box>
  );
}

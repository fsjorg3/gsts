// Descarga de archivos que llegan como Blob desde la API.
//
// No se puede usar un <a href> apuntando al endpoint: las rutas de archivo
// exigen Authorization y un enlace del navegador no envía el bearer. El archivo
// se pide con el cliente HTTP (que sí lo inyecta) y aquí se entrega al usuario.

/** Dispara la descarga de un blob con el nombre indicado. */
export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } finally {
    // Sin revocar, el blob queda retenido en memoria mientras viva la pestaña.
    URL.revokeObjectURL(url);
  }
}

/**
 * Abre un blob en una pestaña nueva (visor de PDF del navegador, desde donde se
 * imprime). El object URL no se revoca de inmediato: la pestaña aún no terminó
 * de cargarlo y revocarlo la dejaría en blanco.
 */
export function abrirBlobEnPestana(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url, '_blank', 'noopener,noreferrer');
  if (!ventana) {
    URL.revokeObjectURL(url);
    throw new Error('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio.');
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Nombre con el que se entrega el PDF de una constancia. */
export function nombreArchivoConstancia(folioUnico: string): string {
  return `constancia-${folioUnico}.pdf`;
}

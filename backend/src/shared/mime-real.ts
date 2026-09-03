// Verifica el tipo real de un archivo por sus primeros bytes (magic numbers), sin
// depender de una librería externa. Usado por cualquier módulo que reciba un
// archivo en base64 (comprobantes de pago, evidencias de validación): un MIME
// mentido aquí explotaría después, con el trámite ya resuelto.
const FIRMAS: Record<string, number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
};

export function mimeRealCoincide(contenido: Buffer, mimeDeclarado: string): boolean {
  const firma = FIRMAS[mimeDeclarado];
  if (!firma) return false;
  return firma.every((byte, indice) => contenido[indice] === byte);
}

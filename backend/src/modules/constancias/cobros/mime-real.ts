// Verifica el tipo real de un archivo por sus primeros bytes (magic numbers), sin
// depender de una librería externa. El comprobante de pago ahora se reenvía a GAF,
// que sí valida la firma del archivo contra el MIME declarado y lo rechaza si no
// coincide: un dato mentido aquí explotaría después, con la constancia ya emitida.
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

import { randomUUID } from 'node:crypto';
import { prisma } from '../../../infrastructure/database/prisma.js';
import type { ConstanciaVerificable } from './verificacion.js';

// Intento contra un folio que no existe (o cuya credencial no cuadra): no hay
// entidad real que referenciar y bitacora.entidad_id es NOT NULL uuid. Mismo
// recurso que ya usa ConfiguracionPlazos (…0001) para su fila singleton.
export const CENTINELA_FOLIO_DESCONOCIDO = '00000000-0000-0000-0000-000000000002';

/**
 * Trae exactamente lo que una respuesta pública puede exponer. rfc, ids
 * internos, nis y hashes quedan fuera desde el `select`, no sólo del DTO —
 * mismo criterio que SELECT_BITACORA. Comparten esto las dos rutas de
 * verificación (por QR y manual) y los dos canales que las exponen —
 * `/public` (anónimo) y `/portal` (autenticado, portal institucional) —:
 * sólo cambia cómo se valida la credencial y quién llama.
 */
export async function buscarConstanciaVerificable(folio: string): Promise<{ id: string; constancia: ConstanciaVerificable } | null> {
  const fila = await prisma.constancia.findUnique({
    where: { folioUnico: folio },
    select: {
      id: true,
      folioUnico: true,
      vigenciaFin: true,
      anulada: true,
      tramite: {
        select: {
          tipoConstancia: true,
          domicilioCalle: true,
          domicilioNumero: true,
          domicilioColonia: true,
          domicilioPerteneceA: true,
          domicilioPerteneceANombre: true,
          // Sólo el titular: representante, apoderado y receptor fiscal
          // nunca se exponen en una ruta pública.
          personas: { where: { rol: 'TITULAR' }, select: { persona: { select: { nombreRazonSocial: true } } }, take: 1 },
        },
      },
    },
  });

  const titular = fila?.tramite.personas[0]?.persona.nombreRazonSocial;
  if (!fila || !titular) return null;
  return {
    id: fila.id,
    constancia: {
      folioUnico: fila.folioUnico,
      vigenciaFin: fila.vigenciaFin,
      anulada: fila.anulada,
      tipoConstancia: fila.tramite.tipoConstancia,
      titularNombreRazonSocial: titular,
      domicilio: {
        calle: fila.tramite.domicilioCalle,
        numero: fila.tramite.domicilioNumero,
        colonia: fila.tramite.domicilioColonia,
        perteneceA: fila.tramite.domicilioPerteneceA,
        perteneceANombre: fila.tramite.domicilioPerteneceANombre,
      },
    },
  };
}

export type CanalVerificacion = 'DIRECTO' | 'PORTAL_INSTITUCIONAL';

/**
 * Bitácora del intento, para los dos canales por igual. `origen` se queda en
 * `PORTAL` en ambos casos — el trigger `fn_bitacora_protegida` exige que ese
 * origen viaje sin `actor_id`, así que ni el canal autenticado (que sí resolvió
 * un actor de service account vía `bindActor`) lo pasa aquí: usar ese actor
 * violaría la regla y forzaría un `origen` nuevo (migración + SQL
 * complementaria) para algo que no es una acción de una persona. `canal` en
 * `detalle` es lo que distingue, sin tocar el schema, si el intento vino
 * directo del navegador del ciudadano o relayado por el backend del portal.
 */
export async function registrarIntento(
  request: { ip?: string; header(nombre: string): string | undefined },
  args: {
    canal: CanalVerificacion;
    accion: 'VERIFICAR_QR' | 'VERIFICAR_CODIGO';
    folio: string;
    encontrada: { id: string } | null;
    credencialValida: boolean;
    exito: boolean;
  },
): Promise<void> {
  await prisma.bitacora.create({
    data: {
      origen: 'PORTAL',
      entidad: 'constancia',
      entidadId: args.exito && args.encontrada ? args.encontrada.id : CENTINELA_FOLIO_DESCONOCIDO,
      accion: args.accion,
      ipAddress: request.ip ?? '0.0.0.0',
      userAgent: request.header('user-agent') ?? 'unknown',
      requestId: randomUUID(),
      detalle: { canal: args.canal, folioIntentado: args.folio, resultado: args.exito ? 'VALIDO' : args.credencialValida ? 'FOLIO_INEXISTENTE' : 'CREDENCIAL_INVALIDA' },
    },
  });
}

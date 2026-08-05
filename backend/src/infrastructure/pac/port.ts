/** Contrato reservado para el worker de facturación de una fase futura. */
export interface PacPort {
  stamp(input: { facturaId: string; idempotencyKey: string }): Promise<void>;
}

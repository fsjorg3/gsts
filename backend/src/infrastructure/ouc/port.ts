export interface OucPort {
  consultarNoAdeudo(nis: string): Promise<{ sinAdeudo: boolean; referencia: string; monto?: string }>;
}

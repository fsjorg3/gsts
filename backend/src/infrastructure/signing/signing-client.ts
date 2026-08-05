import type { Env } from '../../config/env.js';

export interface SigningResult { signature: string; certificateId: string; certificateChain?: string; }

export class SigningClient {
  public constructor(private readonly env: Env) {}

  public async signSha256(hashSha256: string, requestId: string): Promise<SigningResult> {
    const response = await fetch(`${this.env.SIGNING_SERVICE_URL}/signatures`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.env.SIGNING_SERVICE_AUTH_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ hashSha256, documentType: 'CONSTANCIA', module: 'sicef', requestId }),
      signal: AbortSignal.timeout(this.env.SIGNING_SERVICE_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('El Servicio de Firma no respondió correctamente');
    return response.json() as Promise<SigningResult>;
  }
}

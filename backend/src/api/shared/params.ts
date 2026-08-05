import { AppError } from '../../shared/errors.js';

export function routeParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== 'string') throw new AppError(400, 'INVALID_PATH', `El parámetro ${name} no es válido`);
  return value;
}

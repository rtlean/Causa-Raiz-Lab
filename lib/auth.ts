import { createHmac, timingSafeEqual } from 'crypto';

// Autenticação de uso pessoal: a senha fica em APP_PASSWORD e o cookie guarda
// um HMAC dela, nunca a senha em texto. Trocar APP_PASSWORD invalida as sessões.
export const COOKIE_NAME = 'clr_session';

function secret(): string {
  const pwd = process.env.APP_PASSWORD;
  if (!pwd) throw new Error('APP_PASSWORD não configurada');
  return pwd;
}

export function sessionToken(): string {
  return createHmac('sha256', secret()).update('causa-raiz-lab:v1').digest('hex');
}

export function senhaCorreta(entrada: string): boolean {
  const esperado = Buffer.from(secret());
  const recebido = Buffer.from(entrada);
  if (esperado.length !== recebido.length) return false;
  return timingSafeEqual(esperado, recebido);
}

export function tokenValido(token: string | undefined): boolean {
  if (!token) return false;
  const esperado = Buffer.from(sessionToken());
  const recebido = Buffer.from(token);
  if (esperado.length !== recebido.length) return false;
  return timingSafeEqual(esperado, recebido);
}

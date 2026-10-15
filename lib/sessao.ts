import { cookies } from 'next/headers';
import { COOKIE_NAME, tokenValido } from './auth';

// Usado por Server Components e Route Handlers. O middleware não é usado porque
// roda em edge, sem o módulo crypto do Node.
export async function sessaoAtiva(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(COOKIE_NAME)?.value);
}

export function naoAutorizado() {
  return Response.json({ erro: 'Não autorizado' }, { status: 401 });
}

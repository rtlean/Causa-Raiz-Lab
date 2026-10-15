import { cookies } from 'next/headers';
import { COOKIE_NAME, senhaCorreta, sessionToken } from '@/lib/auth';
import { invalido } from '@/lib/http';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { senha?: unknown } | null;
  if (!body || typeof body.senha !== 'string') return invalido('Informe a senha');
  if (!senhaCorreta(body.senha)) {
    return Response.json({ erro: 'Senha incorreta' }, { status: 401 });
  }

  const store = await cookies();
  store.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}

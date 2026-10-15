// Erros do Postgres viram respostas HTTP legíveis. A trigger acao_exige_causa_validada
// usa errcode check_violation e a mensagem em português — ela chega ao usuário como está.
export function erroBanco(err: unknown) {
  const e = err as { code?: string; message?: string };
  if (e?.code === '23505') return Response.json({ erro: 'Registro duplicado' }, { status: 409 });
  if (e?.code === '23503') return Response.json({ erro: 'Referência inexistente' }, { status: 422 });
  if (e?.code === '23514' || e?.code === 'P0001' || e?.code === '23502') {
    return Response.json({ erro: e.message ?? 'Dado inválido' }, { status: 422 });
  }
  if (e?.code === 'check_violation') {
    return Response.json({ erro: e.message ?? 'Regra do método violada' }, { status: 422 });
  }
  console.error(err);
  return Response.json({ erro: 'Erro interno' }, { status: 500 });
}

export function invalido(msg: string) {
  return Response.json({ erro: msg }, { status: 400 });
}

export function texto(body: Record<string, unknown>, campo: string, min = 1): string | null {
  const v = body[campo];
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length >= min ? t : null;
}

export function inteiro(body: Record<string, unknown>, campo: string, min: number, max: number): number | null {
  const v = Number(body[campo]);
  return Number.isInteger(v) && v >= min && v <= max ? v : null;
}

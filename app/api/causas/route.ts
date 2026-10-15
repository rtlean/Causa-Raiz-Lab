import { query } from '@/lib/db';
import { naoAutorizado, sessaoAtiva } from '@/lib/sessao';
import { erroBanco, invalido, texto } from '@/lib/http';

const DIMENSOES = ['ferramentas', 'processos', 'requisitos', 'pessoas', 'metricas', 'ambiente'];

// POST: cria causa primária (sem parent_id) ou subcausa (com parent_id).
export async function POST(req: Request) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const analiseId = texto(body, 'analise_id', 36);
  const causa = texto(body, 'causa', 5);
  const dimensao = body.dimensao;
  const parentId = typeof body.parent_id === 'string' && body.parent_id ? body.parent_id : null;
  const porques = Array.isArray(body.porques)
    ? body.porques.filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    : [];

  if (!analiseId || !causa) return invalido('Informe análise e causa (mín. 5 caracteres)');
  if (typeof dimensao !== 'string' || !DIMENSOES.includes(dimensao)) {
    return invalido('Dimensão inválida');
  }

  try {
    const [row] = await query(
      `insert into causas (analise_id, dimensao, causa, parent_id, porques)
       values ($1, $2, $3, $4, $5) returning *`,
      [analiseId, dimensao, causa, parentId, porques],
    );
    return Response.json(row, { status: 201 });
  } catch (err) {
    return erroBanco(err);
  }
}

import { query } from '@/lib/db';
import { naoAutorizado, sessaoAtiva } from '@/lib/sessao';
import { erroBanco, invalido, inteiro, texto } from '@/lib/http';

// POST: registra medição antes ou depois. Amostra é obrigatória — sem amostra não entra.
export async function POST(req: Request) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const analiseId = texto(body, 'analise_id', 36);
  const momento = body.momento;
  const dataRef = texto(body, 'data_ref', 10);
  const valor = Number(body.valor);
  const amostra = inteiro(body, 'amostra', 1, 1_000_000_000);
  const p50 = body.p50 === undefined || body.p50 === '' ? null : Number(body.p50);
  const p85 = body.p85 === undefined || body.p85 === '' ? null : Number(body.p85);
  const observacao = typeof body.observacao === 'string' ? body.observacao.trim() || null : null;

  if (!analiseId || !dataRef) return invalido('Informe análise e data de referência');
  if (momento !== 'antes' && momento !== 'depois') return invalido('Momento deve ser antes ou depois');
  if (!Number.isFinite(valor)) return invalido('Valor precisa ser número');
  if (amostra === null) return invalido('Amostra é obrigatória e deve ser inteiro positivo');

  try {
    const [row] = await query(
      `insert into medicoes (analise_id, momento, data_ref, valor, amostra, p50, p85, observacao)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [analiseId, momento, dataRef, valor, amostra, p50, p85, observacao],
    );
    return Response.json(row, { status: 201 });
  } catch (err) {
    return erroBanco(err);
  }
}

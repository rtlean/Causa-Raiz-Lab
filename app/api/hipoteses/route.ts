import { query } from '@/lib/db';
import { naoAutorizado, sessaoAtiva } from '@/lib/sessao';
import { erroBanco, invalido, inteiro, texto } from '@/lib/http';

const ESTADOS = ['hipotese', 'em_teste', 'validada', 'refutada', 'inconclusiva'];

// POST: cria hipótese com as três notas (impacto, força de evidência, viabilidade).
// O score é calculado pelo banco, o app não envia.
export async function POST(req: Request) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const analiseId = texto(body, 'analise_id', 36);
  const causaId = texto(body, 'causa_id', 36);
  const enunciado = texto(body, 'enunciado', 15);
  const evidencia = texto(body, 'evidencia_necessaria', 10);
  const fonte = texto(body, 'fonte_evidencia');
  const impacto = inteiro(body, 'impacto', 1, 5);
  const forca = inteiro(body, 'forca_evidencia', 1, 5);
  const viab = inteiro(body, 'viabilidade', 1, 5);
  const frequencia = inteiro(body, 'frequencia', 0, 1_000_000) ?? 0;

  if (!analiseId || !causaId || !enunciado || !evidencia || !fonte) {
    return invalido('Preencha enunciado (mín. 15), evidência necessária (mín. 10) e fonte');
  }
  if (impacto === null || forca === null || viab === null) {
    return invalido('Impacto, força de evidência e viabilidade vão de 1 a 5');
  }

  try {
    const [row] = await query(
      `insert into hipoteses
         (analise_id, causa_id, enunciado, evidencia_necessaria, fonte_evidencia,
          impacto, forca_evidencia, viabilidade, frequencia)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [analiseId, causaId, enunciado, evidencia, fonte, impacto, forca, viab, frequencia],
    );
    return Response.json(row, { status: 201 });
  } catch (err) {
    return erroBanco(err);
  }
}

// PATCH: registra o teste. Validar ou refutar exige resultado_teste — o banco impõe.
export async function PATCH(req: Request) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const id = texto(body, 'id', 36);
  const estado = body.estado;
  const resultado = typeof body.resultado_teste === 'string' ? body.resultado_teste.trim() : null;

  if (!id) return invalido('Informe a hipótese');
  if (typeof estado !== 'string' || !ESTADOS.includes(estado)) return invalido('Estado inválido');

  try {
    const [row] = await query(
      `update hipoteses
          set estado = $2,
              resultado_teste = coalesce($3, resultado_teste),
              testado_em = case when $3 is not null then now() else testado_em end
        where id = $1
        returning *`,
      [id, estado, resultado || null],
    );
    if (!row) return Response.json({ erro: 'Hipótese não encontrada' }, { status: 404 });
    return Response.json(row);
  } catch (err) {
    return erroBanco(err);
  }
}

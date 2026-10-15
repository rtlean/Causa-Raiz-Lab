import { query } from '@/lib/db';
import { naoAutorizado, sessaoAtiva } from '@/lib/sessao';
import { erroBanco, invalido, texto } from '@/lib/http';

const TIPOS = ['contencao', 'corretiva', 'preventiva'];
const STATUS = ['planejada', 'em_andamento', 'concluida', 'cancelada'];

// POST: cria ação 5W2H. Se a hipótese não estiver validada, o banco recusa com a
// mensagem metodológica (trigger acao_exige_causa_validada). Não há contorno aqui.
export async function POST(req: Request) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const analiseId = texto(body, 'analise_id', 36);
  const hipoteseId = texto(body, 'hipotese_id', 36);
  const oQue = texto(body, 'o_que', 10);
  const porQue = texto(body, 'por_que', 10);
  const quem = texto(body, 'quem');
  const onde = texto(body, 'onde');
  const quando = texto(body, 'quando', 10);
  const como = texto(body, 'como', 10);
  const quanto = texto(body, 'quanto') ?? 'nao estimado';
  const tipo = body.tipo;

  if (!analiseId || !hipoteseId || !oQue || !porQue || !quem || !onde || !quando || !como) {
    return invalido('Preencha o 5W2H completo (o que, por que, quem, onde, quando, como)');
  }
  if (typeof tipo !== 'string' || !TIPOS.includes(tipo)) return invalido('Tipo de ação inválido');

  try {
    const [row] = await query(
      `insert into acoes
         (analise_id, hipotese_id, o_que, por_que, quem, onde, quando, como, quanto, tipo)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
      [analiseId, hipoteseId, oQue, porQue, quem, onde, quando, como, quanto, tipo],
    );
    return Response.json(row, { status: 201 });
  } catch (err) {
    return erroBanco(err);
  }
}

// PATCH: muda status. Concluir exige efeito_observado — a constraint impõe.
export async function PATCH(req: Request) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const id = texto(body, 'id', 36);
  const status = body.status;
  const efeito = typeof body.efeito_observado === 'string' ? body.efeito_observado.trim() : null;

  if (!id) return invalido('Informe a ação');
  if (typeof status !== 'string' || !STATUS.includes(status)) return invalido('Status inválido');

  try {
    const [row] = await query(
      `update acoes
          set status = $2,
              efeito_observado = coalesce($3, efeito_observado),
              concluido_em = case when $2 = 'concluida' then now() else null end
        where id = $1
        returning *`,
      [id, status, efeito || null],
    );
    if (!row) return Response.json({ erro: 'Ação não encontrada' }, { status: 404 });
    return Response.json(row);
  } catch (err) {
    return erroBanco(err);
  }
}

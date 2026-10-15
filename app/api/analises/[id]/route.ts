import { query } from '@/lib/db';
import { naoAutorizado, sessaoAtiva } from '@/lib/sessao';
import { erroBanco } from '@/lib/http';

// GET: tudo de uma análise em uma chamada. Usado pelas abas Diagrama, Riscos e Plano.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await sessaoAtiva())) return naoAutorizado();
  const { id } = await params;

  try {
    const [analise] = await query(
      `select e.*, a.desvio, a.responsavel, t.nome as time_nome
         from v_efeito_analise e
         join analises a on a.id = e.analise_id
         join times t on t.id = e.time_id
        where e.analise_id = $1`,
      [id],
    );
    if (!analise) return Response.json({ erro: 'Análise não encontrada' }, { status: 404 });

    const [causas, hipoteses, riscos, acoes, medicoes, pareto, perfil] = await Promise.all([
      query('select * from causas where analise_id = $1 order by criado_em', [id]),
      query(
        `select h.*, c.dimensao, c.causa from hipoteses h
           join causas c on c.id = h.causa_id
          where h.analise_id = $1 order by h.score desc`,
        [id],
      ),
      query('select * from riscos where analise_id = $1 order by exposicao desc', [id]),
      query('select * from acoes where analise_id = $1 order by criado_em', [id]),
      query('select * from medicoes where analise_id = $1 order by data_ref desc', [id]),
      query('select * from v_pareto_dimensao where analise_id = $1 order by frequencia desc', [id]),
      query('select * from v_perfil_plano where analise_id = $1', [id]),
    ]);

    return Response.json({ analise, causas, hipoteses, riscos, acoes, medicoes, pareto, perfil: perfil[0] ?? null });
  } catch (err) {
    return erroBanco(err);
  }
}

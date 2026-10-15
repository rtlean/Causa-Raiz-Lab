import { query } from '@/lib/db';
import { erroBanco, invalido, texto } from '@/lib/http';

// GET: lista análises com o efeito antes/depois já calculado pela view.
export async function GET() {
  try {
    const rows = await query(
      `select e.*, t.nome as time_nome
         from v_efeito_analise e
         join times t on t.id = e.time_id
        order by e.analise_id`,
    );
    return Response.json(rows);
  } catch (err) {
    return erroBanco(err);
  }
}

// POST: cria análise. O time é criado na primeira vez, pelo nome.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const time = texto(body, 'time', 2);
  const titulo = texto(body, 'titulo', 5);
  const desvio = texto(body, 'desvio', 20);
  const indicador = texto(body, 'indicador');
  const unidade = texto(body, 'unidade');
  const responsavel = texto(body, 'responsavel');
  const baselineValor = Number(body.baseline_valor);
  const metaValor = Number(body.meta_valor);
  const baselineInicio = texto(body, 'baseline_inicio', 10);
  const baselineFim = texto(body, 'baseline_fim', 10);
  const direcao = body.direcao;

  if (!time || !titulo || !desvio || !indicador || !unidade || !responsavel) {
    return invalido('Preencha time, título (mín. 5), desvio (mín. 20 caracteres), indicador, unidade e responsável');
  }
  if (!Number.isFinite(baselineValor) || !Number.isFinite(metaValor)) {
    return invalido('Baseline e meta precisam ser números');
  }
  if (direcao !== 'menor_melhor' && direcao !== 'maior_melhor') {
    return invalido('Direção inválida');
  }
  if (!baselineInicio || !baselineFim) return invalido('Informe o período do baseline');

  try {
    const [t] = await query<{ id: string }>(
      `insert into times (nome) values ($1)
       on conflict (nome) do update set nome = excluded.nome
       returning id`,
      [time],
    );
    const [a] = await query<{ id: string }>(
      `insert into analises
         (time_id, titulo, desvio, indicador, unidade, baseline_valor, baseline_inicio,
          baseline_fim, meta_valor, direcao, responsavel)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning id`,
      [t.id, titulo, desvio, indicador, unidade, baselineValor, baselineInicio,
        baselineFim, metaValor, direcao, responsavel],
    );
    return Response.json(a, { status: 201 });
  } catch (err) {
    return erroBanco(err);
  }
}

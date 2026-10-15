import { query } from '@/lib/db';
import { erroBanco, invalido, inteiro, texto } from '@/lib/http';

const CATEGORIAS = ['seguranca', 'financeiro', 'disponibilidade', 'prazo', 'pessoas', 'conformidade'];
const RESPOSTAS = ['mitigar', 'transferir', 'aceitar', 'evitar'];

// POST: risco com probabilidade e severidade. Exposição é calculada pelo banco.
// Risco aceito exige gatilho escrito — a constraint aceite_exige_gatilho impõe.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return invalido('Corpo inválido');

  const analiseId = texto(body, 'analise_id', 36);
  const descricao = texto(body, 'descricao', 15);
  const dono = texto(body, 'dono');
  const categoria = body.categoria;
  const resposta = body.resposta ?? 'mitigar';
  const hipoteseId = typeof body.hipotese_id === 'string' && body.hipotese_id ? body.hipotese_id : null;
  const gatilho = typeof body.gatilho === 'string' && body.gatilho.trim() ? body.gatilho.trim() : null;
  const prob = inteiro(body, 'probabilidade', 1, 5);
  const sev = inteiro(body, 'severidade', 1, 5);

  if (!analiseId || !descricao || !dono) return invalido('Preencha descrição (mín. 15) e dono');
  if (typeof categoria !== 'string' || !CATEGORIAS.includes(categoria)) return invalido('Categoria inválida');
  if (typeof resposta !== 'string' || !RESPOSTAS.includes(resposta)) return invalido('Resposta inválida');
  if (prob === null || sev === null) return invalido('Probabilidade e severidade vão de 1 a 5');

  try {
    const [row] = await query(
      `insert into riscos
         (analise_id, hipotese_id, descricao, categoria, probabilidade, severidade, resposta, gatilho, dono)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      [analiseId, hipoteseId, descricao, categoria, prob, sev, resposta, gatilho, dono],
    );
    return Response.json(row, { status: 201 });
  } catch (err) {
    return erroBanco(err);
  }
}

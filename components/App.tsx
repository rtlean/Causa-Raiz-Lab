'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

// ── Tipos mínimos das respostas da API ─────────────────────────
type Efeito = {
  analise_id: string; titulo: string; indicador: string; unidade: string;
  direcao: 'menor_melhor' | 'maior_melhor'; status: string; time_nome: string;
  baseline_valor: string; meta_valor: string;
  valor_antes: string | null; valor_depois: string | null;
  melhora_percentual: string | null; amostra_antes: number | null; amostra_depois: number | null;
};
type Causa = { id: string; analise_id: string; dimensao: string; causa: string; parent_id: string | null; porques: string[] };
type Hipotese = {
  id: string; causa_id: string; enunciado: string; evidencia_necessaria: string; fonte_evidencia: string;
  impacto: number; forca_evidencia: number; viabilidade: number; score: number; frequencia: number;
  estado: string; resultado_teste: string | null; dimensao: string; causa: string;
};
type Risco = {
  id: string; descricao: string; categoria: string; probabilidade: number; severidade: number;
  exposicao: number; resposta: string; gatilho: string | null; dono: string; status: string;
};
type Acao = {
  id: string; hipotese_id: string; o_que: string; por_que: string; quem: string; onde: string;
  quando: string; como: string; quanto: string; tipo: string; status: string; efeito_observado: string | null;
};
type Medicao = { id: string; momento: string; data_ref: string; valor: string; amostra: number };
type Detalhe = {
  analise: Efeito & { desvio?: string; responsavel?: string };
  causas: Causa[]; hipoteses: Hipotese[]; riscos: Risco[]; acoes: Acao[]; medicoes: Medicao[];
  pareto: { dimensao: string; frequencia: number; percentual_acumulado: string }[];
  perfil: { contencoes: number; corretivas: number; preventivas: number; total: number } | null;
};

const DIMENSOES: Record<string, string> = {
  ferramentas: 'Ferramentas', processos: 'Processos', requisitos: 'Requisitos',
  pessoas: 'Pessoas', metricas: 'Métricas', ambiente: 'Ambiente',
};
const CATEGORIAS: Record<string, string> = {
  seguranca: 'Segurança', financeiro: 'Financeiro', disponibilidade: 'Disponibilidade',
  prazo: 'Prazo', pessoas: 'Pessoas', conformidade: 'Conformidade',
};
const ESTADOS: Record<string, string> = {
  hipotese: 'Hipótese', em_teste: 'Em teste', validada: 'Validada',
  refutada: 'Refutada', inconclusiva: 'Inconclusiva',
};
const STATUS_ACAO: Record<string, string> = {
  planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
};
const ABAS = ['Dashboard', 'Análises', 'Diagrama', 'Riscos', 'Plano de Ação'] as const;
type Aba = (typeof ABAS)[number];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { erro?: string }).erro ?? 'Falha na operação');
  return data as T;
}

function fmt(v: string | number | null | undefined, unidade = '') {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unidade ? ` ${unidade}` : ''}` : String(v);
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  const [aba, setAba] = useState<Aba>('Dashboard');
  const [analises, setAnalises] = useState<Efeito[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregarLista = useCallback(async () => {
    try {
      setAnalises(await api<Efeito[]>('/api/analises'));
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    try {
      setDetalhe(await api<Detalhe>(`/api/analises/${id}`));
    } catch (e) {
      setErro((e as Error).message);
    }
  }, []);

  useEffect(() => { carregarLista(); }, [carregarLista]);
  useEffect(() => { if (selecionada) carregarDetalhe(selecionada); }, [selecionada, carregarDetalhe]);

  // Recarrega tudo após qualquer escrita.
  const atualizar = useCallback(async () => {
    await carregarLista();
    if (selecionada) await carregarDetalhe(selecionada);
  }, [carregarLista, carregarDetalhe, selecionada]);

  return (
    <>
      <header className="topo">
        <div className="wrap linha">
          <div>
            <div className="dim">Agile Master · Ishikawa + evidência</div>
            <h1>Causa Raiz Lab</h1>
          </div>
        </div>
      </header>

      <nav className="abas" aria-label="Seções">
        <div className="wrap" role="tablist">
          {ABAS.map((a) => (
            <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)}>{a}</button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        {erro && <div className="erro" onClick={() => setErro(null)}>{erro} <small>(clique para fechar)</small></div>}

        {aba === 'Dashboard' && <Dashboard analises={analises} />}

        {aba === 'Análises' && (
          <Analises
            analises={analises}
            selecionada={selecionada}
            detalhe={detalhe}
            onSelecionar={(id) => { setSelecionada(id); setAba('Diagrama'); }}
            onCriada={atualizar}
            onErro={setErro}
          />
        )}

        {aba === 'Diagrama' && (
          <Diagrama
            analises={analises}
            selecionada={selecionada}
            onSelecionar={setSelecionada}
            detalhe={detalhe}
            onAtualizar={atualizar}
            onErro={setErro}
          />
        )}

        {aba === 'Riscos' && (
          <Riscos
            analises={analises}
            selecionada={selecionada}
            onSelecionar={setSelecionada}
            detalhe={detalhe}
            onAtualizar={atualizar}
            onErro={setErro}
          />
        )}

        {aba === 'Plano de Ação' && (
          <Plano
            analises={analises}
            selecionada={selecionada}
            onSelecionar={setSelecionada}
            detalhe={detalhe}
            onAtualizar={atualizar}
            onErro={setErro}
          />
        )}
      </main>
    </>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ analises }: { analises: Efeito[] }) {
  const comMedicao = analises.filter((a) => a.melhora_percentual !== null);
  const melhoraMedia = comMedicao.length
    ? comMedicao.reduce((s, a) => s + Number(a.melhora_percentual), 0) / comMedicao.length
    : null;
  const porStatus = analises.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  if (analises.length === 0) {
    return (
      <div className="card">
        <h2>Nenhuma análise ainda</h2>
        <p>Abra a aba <strong>Análises</strong> e cadastre o primeiro desvio observável.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grade">
        <div className="card kpi"><small>Análises</small><strong>{analises.length}</strong></div>
        <div className={`card kpi ${melhoraMedia !== null && melhoraMedia > 0 ? 'ok' : ''}`}>
          <small>Melhora média medida</small>
          <strong>{melhoraMedia === null ? '—' : `${melhoraMedia.toFixed(1)}%`}</strong>
        </div>
        <div className="card kpi"><small>Com antes e depois</small><strong>{comMedicao.length}</strong></div>
        <div className="card kpi alerta"><small>Em investigação</small><strong>{porStatus['investigando'] ?? 0}</strong></div>
      </div>

      <div className="card">
        <h2>Efeito antes e depois</h2>
        <p className="muted">Variação já respeita a direção da métrica: positivo significa melhora.</p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Análise</th><th>Time</th><th>Indicador</th><th>Baseline</th><th>Meta</th><th>Antes</th><th>Depois</th><th>Melhora</th></tr>
            </thead>
            <tbody>
              {analises.map((a) => (
                <tr key={a.analise_id}>
                  <td>{a.titulo}</td>
                  <td>{a.time_nome}</td>
                  <td>{a.indicador}</td>
                  <td>{fmt(a.baseline_valor, a.unidade)}</td>
                  <td>{fmt(a.meta_valor, a.unidade)}</td>
                  <td>{fmt(a.valor_antes, a.unidade)}</td>
                  <td>{fmt(a.valor_depois, a.unidade)}</td>
                  <td>{a.melhora_percentual === null ? '—' : `${Number(a.melhora_percentual).toFixed(1)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Análises (lista + criação) ─────────────────────────────────
function Analises({
  analises, selecionada, detalhe, onSelecionar, onCriada, onErro,
}: {
  analises: Efeito[]; selecionada: string | null; detalhe: Detalhe | null;
  onSelecionar: (id: string) => void; onCriada: () => Promise<void>; onErro: (m: string) => void;
}) {
  const [form, setForm] = useState({
    time: '', titulo: '', desvio: '', indicador: '', unidade: '%', responsavel: '',
    baseline_valor: '', baseline_inicio: '', baseline_fim: '', meta_valor: '', direcao: 'menor_melhor',
  });
  const [enviando, setEnviando] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api('/api/analises', { method: 'POST', body: JSON.stringify(form) });
      setForm({ ...form, titulo: '', desvio: '', indicador: '', baseline_valor: '', meta_valor: '' });
      await onCriada();
    } catch (err) {
      onErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="card">
        <h2>Nova análise</h2>
        <p>O desvio precisa ser observável: diga o que foi medido, onde e quanto. Uma palavra só não basta.</p>
        <form onSubmit={criar} className="grid">
          <label>Time<input value={form.time} onChange={set('time')} required /></label>
          <label>Responsável<input value={form.responsavel} onChange={set('responsavel')} required /></label>
          <label className="largo">Título<input value={form.titulo} onChange={set('titulo')} required minLength={5} /></label>
          <label className="largo">Desvio observável
            <textarea value={form.desvio} onChange={set('desvio')} required minLength={20} />
          </label>
          <label>Indicador<input value={form.indicador} onChange={set('indicador')} required placeholder="ex.: spillover" /></label>
          <label>Unidade<input value={form.unidade} onChange={set('unidade')} required /></label>
          <label>Direção
            <select value={form.direcao} onChange={set('direcao')}>
              <option value="menor_melhor">Menor é melhor</option>
              <option value="maior_melhor">Maior é melhor</option>
            </select>
          </label>
          <label>Baseline (valor)<input type="number" step="any" value={form.baseline_valor} onChange={set('baseline_valor')} required /></label>
          <label>Baseline início<input type="date" value={form.baseline_inicio} onChange={set('baseline_inicio')} required /></label>
          <label>Baseline fim<input type="date" value={form.baseline_fim} onChange={set('baseline_fim')} required /></label>
          <label>Meta (valor)<input type="number" step="any" value={form.meta_valor} onChange={set('meta_valor')} required /></label>
          <div className="largo"><button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Criar análise'}</button></div>
        </form>
      </div>

      <div className="card">
        <h2>Análises</h2>
        {analises.length === 0 && <p>Nenhuma ainda.</p>}
        {analises.length > 0 && (
          <table>
            <thead><tr><th>Título</th><th>Time</th><th>Indicador</th><th>Status</th></tr></thead>
            <tbody>
              {analises.map((a) => (
                <tr
                  key={a.analise_id}
                  className={`clicavel ${selecionada === a.analise_id ? 'selecionada' : ''}`}
                  onClick={() => onSelecionar(a.analise_id)}
                >
                  <td>{a.titulo}</td>
                  <td>{a.time_nome}</td>
                  <td>{a.indicador}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {detalhe && <p className="muted" style={{ marginTop: '0.7rem' }}>Desvio: {detalhe.analise.desvio}</p>}
      </div>
    </>
  );
}

// ── Diagrama (6 Ms, causas, subcausas, hipóteses) ──────────────
function Diagrama({
  analises, selecionada, onSelecionar, detalhe, onAtualizar, onErro,
}: {
  analises: Efeito[]; selecionada: string | null; onSelecionar: (id: string) => void;
  detalhe: Detalhe | null; onAtualizar: () => Promise<void>; onErro: (m: string) => void;
}) {
  const [causa, setCausa] = useState({ dimensao: 'processos', causa: '', parent_id: '' });
  const [hip, setHip] = useState({
    causa_id: '', enunciado: '', evidencia_necessaria: '', fonte_evidencia: '',
    impacto: '3', forca_evidencia: '3', viabilidade: '3', frequencia: '0',
  });

  const porDimensao = useMemo(() => {
    const m: Record<string, Causa[]> = {};
    detalhe?.causas.forEach((c) => { (m[c.dimensao] ??= []).push(c); });
    return m;
  }, [detalhe]);

  const filhas = (pai: string) => detalhe?.causas.filter((c) => c.parent_id === pai) ?? [];
  const hipotesesDa = (causaId: string) => detalhe?.hipoteses.filter((h) => h.causa_id === causaId) ?? [];

  async function criarCausa(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionada) return;
    try {
      await api('/api/causas', {
        method: 'POST',
        body: JSON.stringify({ analise_id: selecionada, ...causa, parent_id: causa.parent_id || null }),
      });
      setCausa({ ...causa, causa: '', parent_id: '' });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  async function criarHipotese(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionada) return;
    try {
      await api('/api/hipoteses', {
        method: 'POST',
        body: JSON.stringify({
          analise_id: selecionada, ...hip,
          impacto: Number(hip.impacto), forca_evidencia: Number(hip.forca_evidencia),
          viabilidade: Number(hip.viabilidade), frequencia: Number(hip.frequencia),
        }),
      });
      setHip({ ...hip, enunciado: '', evidencia_necessaria: '', fonte_evidencia: '' });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  async function registrarTeste(h: Hipotese, estado: string) {
    const resultado = estado === 'validada' || estado === 'refutada'
      ? window.prompt(`O que o dado mostrou? (mín. 10 caracteres)`) ?? ''
      : null;
    if ((estado === 'validada' || estado === 'refutada') && (!resultado || resultado.trim().length < 10)) return;
    try {
      await api('/api/hipoteses', {
        method: 'PATCH',
        body: JSON.stringify({ id: h.id, estado, resultado_teste: resultado }),
      });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  function renderCausa(c: Causa) {
    const hs = hipotesesDa(c.id);
    const subs = filhas(c.id);
    return (
      <li key={c.id}>
        <div><strong>{c.causa}</strong></div>
        {c.porques.length > 0 && (
          <ol className="muted" style={{ margin: '0.2rem 0 0.3rem 1.1rem', padding: 0 }}>
            {c.porques.map((p, i) => <li key={i} style={{ margin: 0 }}>{p}</li>)}
          </ol>
        )}
        {hs.map((h) => (
          <div key={h.id} className="card" style={{ margin: '0.4rem 0', padding: '0.6rem 0.8rem' }}>
            <div>
              <span className={`badge ${h.estado}`}>{ESTADOS[h.estado]}</span>{' '}
              <span className="muted">score {h.score}</span> — {h.enunciado}
            </div>
            {h.resultado_teste && <small>Resultado: {h.resultado_teste}</small>}
            {!['validada', 'refutada'].includes(h.estado) && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <button className="secundario" onClick={() => registrarTeste(h, 'em_teste')}>Em teste</button>
                <button className="secundario" onClick={() => registrarTeste(h, 'validada')}>Validar</button>
                <button className="secundario perigo" onClick={() => registrarTeste(h, 'refutada')}>Refutar</button>
              </div>
            )}
          </div>
        ))}
        {subs.length > 0 && <ul className="arvore" style={{ paddingLeft: '1.2rem' }}>{subs.map(renderCausa)}</ul>}
      </li>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Diagrama de causa e efeito</h2>
        <p>Dimensões das 6 Ms da Tecnologia. Cada causa pode ter subcausas, e cada hipótese precisa de evidência antes de virar contramedida.</p>
        <label>Análise
          <select value={selecionada ?? ''} onChange={(e) => onSelecionar(e.target.value)}>
            <option value="" disabled>Escolha uma análise</option>
            {analises.map((a) => <option key={a.analise_id} value={a.analise_id}>{a.titulo}</option>)}
          </select>
        </label>
      </div>

      {!selecionada && <div className="aviso">Escolha uma análise para ver o diagrama.</div>}

      {detalhe && (
        <>
          <div className="grade">
            {Object.keys(DIMENSOES).map((d) => (
              <div key={d} className="card">
                <div className="dim">{DIMENSOES[d]}</div>
                {(porDimensao[d] ?? []).length === 0
                  ? <small>Sem causas ainda</small>
                  : <ul className="arvore">{(porDimensao[d] ?? []).filter((c) => !c.parent_id).map(renderCausa)}</ul>}
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Nova causa ou subcausa</h3>
            <form onSubmit={criarCausa} className="grid">
              <label>Dimensão
                <select value={causa.dimensao} onChange={(e) => setCausa({ ...causa, dimensao: e.target.value })}>
                  {Object.entries(DIMENSOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Causa pai (opcional)
                <select value={causa.parent_id} onChange={(e) => setCausa({ ...causa, parent_id: e.target.value })}>
                  <option value="">— causa primária —</option>
                  {detalhe.causas.map((c) => <option key={c.id} value={c.id}>{c.causa}</option>)}
                </select>
              </label>
              <label className="largo">Causa
                <input value={causa.causa} onChange={(e) => setCausa({ ...causa, causa: e.target.value })} required minLength={5} />
              </label>
              <div className="largo"><button className="primario">Adicionar causa</button></div>
            </form>
          </div>

          <div className="card">
            <h3>Nova hipótese</h3>
            <p className="muted">A hipótese nasce como “Hipótese”. Só vira “Validada” depois de um teste com resultado registrado.</p>
            <form onSubmit={criarHipotese} className="grid">
              <label className="largo">Causa
                <select value={hip.causa_id} onChange={(e) => setHip({ ...hip, causa_id: e.target.value })} required>
                  <option value="" disabled>Escolha a causa</option>
                  {detalhe.causas.map((c) => <option key={c.id} value={c.id}>{c.causa}</option>)}
                </select>
              </label>
              <label className="largo">Enunciado
                <input value={hip.enunciado} onChange={(e) => setHip({ ...hip, enunciado: e.target.value })} required minLength={15} />
              </label>
              <label className="largo">Evidência necessária
                <input value={hip.evidencia_necessaria} onChange={(e) => setHip({ ...hip, evidencia_necessaria: e.target.value })} required minLength={10} />
              </label>
              <label>Fonte da evidência<input value={hip.fonte_evidencia} onChange={(e) => setHip({ ...hip, fonte_evidencia: e.target.value })} required /></label>
              <label>Impacto (1–5)<input type="number" min={1} max={5} value={hip.impacto} onChange={(e) => setHip({ ...hip, impacto: e.target.value })} /></label>
              <label>Força da evidência (1–5)<input type="number" min={1} max={5} value={hip.forca_evidencia} onChange={(e) => setHip({ ...hip, forca_evidencia: e.target.value })} /></label>
              <label>Viabilidade (1–5)<input type="number" min={1} max={5} value={hip.viabilidade} onChange={(e) => setHip({ ...hip, viabilidade: e.target.value })} /></label>
              <label>Frequência observada<input type="number" min={0} value={hip.frequencia} onChange={(e) => setHip({ ...hip, frequencia: e.target.value })} /></label>
              <div className="largo"><button className="primario" disabled={!hip.causa_id}>Adicionar hipótese</button></div>
            </form>
          </div>

          {detalhe.pareto.length > 0 && (
            <div className="card">
              <h3>Pareto por dimensão</h3>
              <table>
                <thead><tr><th>Dimensão</th><th>Frequência</th><th>Acumulado</th></tr></thead>
                <tbody>
                  {detalhe.pareto.map((p) => (
                    <tr key={p.dimensao}>
                      <td>{DIMENSOES[p.dimensao] ?? p.dimensao}</td>
                      <td>{p.frequencia}</td>
                      <td>{Number(p.percentual_acumulado).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Riscos ─────────────────────────────────────────────────────
function Riscos({
  analises, selecionada, onSelecionar, detalhe, onAtualizar, onErro,
}: {
  analises: Efeito[]; selecionada: string | null; onSelecionar: (id: string) => void;
  detalhe: Detalhe | null; onAtualizar: () => Promise<void>; onErro: (m: string) => void;
}) {
  const [form, setForm] = useState({
    descricao: '', categoria: 'prazo', probabilidade: '3', severidade: '3',
    resposta: 'mitigar', gatilho: '', dono: '', hipotese_id: '',
  });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionada) return;
    try {
      await api('/api/riscos', {
        method: 'POST',
        body: JSON.stringify({
          analise_id: selecionada, ...form,
          probabilidade: Number(form.probabilidade), severidade: Number(form.severidade),
          hipotese_id: form.hipotese_id || null,
        }),
      });
      setForm({ ...form, descricao: '', gatilho: '', dono: '' });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  return (
    <>
      <div className="card">
        <h2>Riscos</h2>
        <label>Análise
          <select value={selecionada ?? ''} onChange={(e) => onSelecionar(e.target.value)}>
            <option value="" disabled>Escolha uma análise</option>
            {analises.map((a) => <option key={a.analise_id} value={a.analise_id}>{a.titulo}</option>)}
          </select>
        </label>
      </div>

      {!selecionada && <div className="aviso">Escolha uma análise para ver os riscos.</div>}

      {detalhe && (
        <>
          <div className="card">
            <h3>Matriz (exposição = probabilidade × severidade)</h3>
            {detalhe.riscos.length === 0 && <p>Nenhum risco registrado.</p>}
            {detalhe.riscos.length > 0 && (
              <table>
                <thead><tr><th>Risco</th><th>Categoria</th><th>P × S</th><th>Exposição</th><th>Resposta</th><th>Dono</th></tr></thead>
                <tbody>
                  {detalhe.riscos.map((r) => (
                    <tr key={r.id}>
                      <td>{r.descricao}{r.resposta === 'aceitar' && r.gatilho && <small><br />Gatilho: {r.gatilho}</small>}</td>
                      <td>{CATEGORIAS[r.categoria]}</td>
                      <td>{r.probabilidade} × {r.severidade}</td>
                      <td><strong>{r.exposicao}</strong></td>
                      <td>{r.resposta}</td>
                      <td>{r.dono}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3>Novo risco</h3>
            <form onSubmit={criar} className="grid">
              <label className="largo">Descrição<input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required minLength={15} /></label>
              <label>Categoria
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Probabilidade (1–5)<input type="number" min={1} max={5} value={form.probabilidade} onChange={(e) => setForm({ ...form, probabilidade: e.target.value })} /></label>
              <label>Severidade (1–5)<input type="number" min={1} max={5} value={form.severidade} onChange={(e) => setForm({ ...form, severidade: e.target.value })} /></label>
              <label>Resposta
                <select value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })}>
                  <option value="mitigar">Mitigar</option>
                  <option value="transferir">Transferir</option>
                  <option value="aceitar">Aceitar</option>
                  <option value="evitar">Evitar</option>
                </select>
              </label>
              <label>Dono<input value={form.dono} onChange={(e) => setForm({ ...form, dono: e.target.value })} required /></label>
              {form.resposta === 'aceitar' && (
                <label className="largo">Gatilho (obrigatório ao aceitar)
                  <input value={form.gatilho} onChange={(e) => setForm({ ...form, gatilho: e.target.value })} required minLength={10} />
                </label>
              )}
              <label className="largo">Hipótese relacionada (opcional)
                <select value={form.hipotese_id} onChange={(e) => setForm({ ...form, hipotese_id: e.target.value })}>
                  <option value="">—</option>
                  {detalhe.hipoteses.map((h) => <option key={h.id} value={h.id}>{h.enunciado}</option>)}
                </select>
              </label>
              <div className="largo"><button className="primario">Adicionar risco</button></div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

// ── Plano de Ação ──────────────────────────────────────────────
function Plano({
  analises, selecionada, onSelecionar, detalhe, onAtualizar, onErro,
}: {
  analises: Efeito[]; selecionada: string | null; onSelecionar: (id: string) => void;
  detalhe: Detalhe | null; onAtualizar: () => Promise<void>; onErro: (m: string) => void;
}) {
  const validadas = detalhe?.hipoteses.filter((h) => h.estado === 'validada') ?? [];
  const [form, setForm] = useState({
    hipotese_id: '', o_que: '', por_que: '', quem: '', onde: '', quando: '', como: '', quanto: '', tipo: 'corretiva',
  });
  const [medicao, setMedicao] = useState({ momento: 'antes', data_ref: '', valor: '', amostra: '' });

  async function criarAcao(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionada) return;
    try {
      await api('/api/acoes', { method: 'POST', body: JSON.stringify({ analise_id: selecionada, ...form }) });
      setForm({ ...form, o_que: '', por_que: '', quem: '', onde: '', como: '', quanto: '' });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  async function mudarStatus(id: string, status: string) {
    let efeito: string | null = null;
    if (status === 'concluida') {
      efeito = window.prompt('Qual efeito foi observado? (mín. 10 caracteres)') ?? '';
      if (efeito.trim().length < 10) return;
    }
    try {
      await api('/api/acoes', { method: 'PATCH', body: JSON.stringify({ id, status, efeito_observado: efeito }) });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  async function registrarMedicao(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionada) return;
    try {
      await api('/api/medicoes', { method: 'POST', body: JSON.stringify({ analise_id: selecionada, ...medicao }) });
      setMedicao({ ...medicao, valor: '', amostra: '' });
      await onAtualizar();
    } catch (err) { onErro((err as Error).message); }
  }

  return (
    <>
      <div className="card">
        <h2>Plano de Ação</h2>
        <label>Análise
          <select value={selecionada ?? ''} onChange={(e) => onSelecionar(e.target.value)}>
            <option value="" disabled>Escolha uma análise</option>
            {analises.map((a) => <option key={a.analise_id} value={a.analise_id}>{a.titulo}</option>)}
          </select>
        </label>
      </div>

      {!selecionada && <div className="aviso">Escolha uma análise para ver o plano.</div>}

      {detalhe && (
        <>
          {detalhe.perfil && detalhe.perfil.total > 0 && (
            <div className="grade">
              <div className="card kpi"><small>Contenções</small><strong>{detalhe.perfil.contencoes}</strong></div>
              <div className="card kpi"><small>Corretivas</small><strong>{detalhe.perfil.corretivas}</strong></div>
              <div className="card kpi"><small>Preventivas</small><strong>{detalhe.perfil.preventivas}</strong></div>
            </div>
          )}

          <div className="card">
            <h3>Ações</h3>
            {detalhe.acoes.length === 0 && <p>Nenhuma ação ainda. Ações só podem ser criadas sobre hipóteses validadas.</p>}
            {detalhe.acoes.length > 0 && (
              <table>
                <thead><tr><th>O que</th><th>Quem / quando</th><th>Tipo</th><th>Status</th><th>Efeito</th><th></th></tr></thead>
                <tbody>
                  {detalhe.acoes.map((a) => (
                    <tr key={a.id}>
                      <td>{a.o_que}<small><br />Por quê: {a.por_que}</small></td>
                      <td>{a.quem}<br /><small>{a.quando}</small></td>
                      <td>{a.tipo}</td>
                      <td><span className={`badge ${a.status}`}>{STATUS_ACAO[a.status]}</span></td>
                      <td>{a.efeito_observado ?? '—'}</td>
                      <td>
                        {a.status !== 'concluida' && a.status !== 'cancelada' && (
                          <button className="secundario" onClick={() => mudarStatus(a.id, 'concluida')}>Concluir</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3>Nova ação (5W2H)</h3>
            {validadas.length === 0 && (
              <div className="aviso">Nenhuma hipótese validada nesta análise. Valide uma hipótese na aba Diagrama antes de criar ações.</div>
            )}
            <form onSubmit={criarAcao} className="grid">
              <label className="largo">Hipótese validada
                <select value={form.hipotese_id} onChange={(e) => setForm({ ...form, hipotese_id: e.target.value })} required>
                  <option value="" disabled>Escolha</option>
                  {validadas.map((h) => <option key={h.id} value={h.id}>{h.enunciado}</option>)}
                </select>
              </label>
              <label className="largo">O que (what)<input value={form.o_que} onChange={(e) => setForm({ ...form, o_que: e.target.value })} required minLength={10} /></label>
              <label className="largo">Por quê (why)<input value={form.por_que} onChange={(e) => setForm({ ...form, por_que: e.target.value })} required minLength={10} /></label>
              <label>Quem (who)<input value={form.quem} onChange={(e) => setForm({ ...form, quem: e.target.value })} required /></label>
              <label>Onde (where)<input value={form.onde} onChange={(e) => setForm({ ...form, onde: e.target.value })} required /></label>
              <label>Quando (when)<input type="date" value={form.quando} onChange={(e) => setForm({ ...form, quando: e.target.value })} required /></label>
              <label>Quanto (how much)<input value={form.quanto} onChange={(e) => setForm({ ...form, quanto: e.target.value })} /></label>
              <label className="largo">Como (how)<input value={form.como} onChange={(e) => setForm({ ...form, como: e.target.value })} required minLength={10} /></label>
              <label>Tipo
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="contencao">Contenção</option>
                  <option value="corretiva">Corretiva</option>
                  <option value="preventiva">Preventiva</option>
                </select>
              </label>
              <div className="largo"><button className="primario" disabled={!form.hipotese_id}>Criar ação</button></div>
            </form>
          </div>

          <div className="card">
            <h3>Medição (antes e depois)</h3>
            <p className="muted">Sem amostra, a medição não entra no cálculo de efeito.</p>
            <form onSubmit={registrarMedicao} className="grid">
              <label>Momento
                <select value={medicao.momento} onChange={(e) => setMedicao({ ...medicao, momento: e.target.value })}>
                  <option value="antes">Antes</option>
                  <option value="depois">Depois</option>
                </select>
              </label>
              <label>Data de referência<input type="date" value={medicao.data_ref} onChange={(e) => setMedicao({ ...medicao, data_ref: e.target.value })} required /></label>
              <label>Valor<input type="number" step="any" value={medicao.valor} onChange={(e) => setMedicao({ ...medicao, valor: e.target.value })} required /></label>
              <label>Amostra (n)<input type="number" min={1} value={medicao.amostra} onChange={(e) => setMedicao({ ...medicao, amostra: e.target.value })} required /></label>
              <div className="largo"><button className="primario">Registrar medição</button></div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

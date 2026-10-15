-- Causa Raiz Lab — schema inicial (Postgres / Neon)
-- Aplicado no banco principal do projeto "Causa Raiz Lab" (Neon, sa-east-1).

-- ── Tipos ──────────────────────────────────────────────────────
create type dimensao_ishikawa as enum ('ferramentas', 'processos', 'requisitos', 'pessoas', 'metricas', 'ambiente');
create type estado_hipotese as enum ('hipotese', 'em_teste', 'validada', 'refutada', 'inconclusiva');
create type status_analise as enum ('rascunho', 'investigando', 'contramedidas', 'medindo', 'concluida', 'reaberta');
create type tipo_acao as enum ('contencao', 'corretiva', 'preventiva');
create type status_acao as enum ('planejada', 'em_andamento', 'concluida', 'cancelada');
create type direcao_metrica as enum ('menor_melhor', 'maior_melhor');
create type momento_medicao as enum ('antes', 'depois');
create type origem_causa as enum ('workshop', 'retrospectiva', 'incidente', 'dado', 'ia_sugerida');
create type categoria_risco as enum ('seguranca', 'financeiro', 'disponibilidade', 'prazo', 'pessoas', 'conformidade');
create type resposta_risco as enum ('mitigar', 'transferir', 'aceitar', 'evitar');

-- ── Times ──────────────────────────────────────────────────────
create table times (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  criado_em  timestamptz not null default now()
);

-- ── Análises ───────────────────────────────────────────────────
create table analises (
  id               uuid primary key default gen_random_uuid(),
  time_id          uuid not null references times(id) on delete restrict,
  titulo           text not null check (length(trim(titulo)) >= 5),
  desvio           text not null check (length(trim(desvio)) >= 20),
  indicador        text not null,
  unidade          text not null,
  baseline_valor   numeric(12,3) not null,
  baseline_inicio  date not null,
  baseline_fim     date not null,
  meta_valor       numeric(12,3) not null,
  direcao          direcao_metrica not null,
  status           status_analise not null default 'rascunho',
  responsavel      text not null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint periodo_coerente check (baseline_fim >= baseline_inicio),
  constraint meta_difere_baseline check (meta_valor <> baseline_valor)
);
create index on analises (time_id, status);
create index on analises (indicador);

-- ── Causas (árvore com subcausas) ──────────────────────────────
create table causas (
  id         uuid primary key default gen_random_uuid(),
  analise_id uuid not null references analises(id) on delete cascade,
  dimensao   dimensao_ishikawa not null,
  causa      text not null check (length(trim(causa)) >= 5),
  parent_id  uuid references causas(id) on delete cascade,
  porques    text[] not null default '{}',
  origem     origem_causa not null default 'workshop',
  criado_em  timestamptz not null default now(),
  constraint nao_e_pai_de_si check (parent_id is null or parent_id <> id)
);
create index on causas (analise_id, dimensao);
create index on causas (parent_id);

-- ── Hipóteses ──────────────────────────────────────────────────
create table hipoteses (
  id                   uuid primary key default gen_random_uuid(),
  analise_id           uuid not null references analises(id) on delete cascade,
  causa_id             uuid not null references causas(id) on delete cascade,
  enunciado            text not null check (length(trim(enunciado)) >= 15),
  evidencia_necessaria text not null check (length(trim(evidencia_necessaria)) >= 10),
  fonte_evidencia      text not null,
  impacto              smallint not null check (impacto between 1 and 5),
  forca_evidencia      smallint not null check (forca_evidencia between 1 and 5),
  viabilidade          smallint not null check (viabilidade between 1 and 5),
  score                integer generated always as (impacto * forca_evidencia * viabilidade) stored,
  frequencia           integer not null default 0 check (frequencia >= 0),
  estado               estado_hipotese not null default 'hipotese',
  resultado_teste      text,
  testado_em           timestamptz,
  criado_em            timestamptz not null default now(),
  constraint conclusao_exige_resultado check (
    estado not in ('validada', 'refutada')
    or (resultado_teste is not null and length(trim(resultado_teste)) >= 10)
  )
);
create index on hipoteses (analise_id, estado);
create index on hipoteses (causa_id);
create index on hipoteses (score desc);

-- ── Riscos ─────────────────────────────────────────────────────
create table riscos (
  id            uuid primary key default gen_random_uuid(),
  analise_id    uuid not null references analises(id) on delete cascade,
  hipotese_id   uuid references hipoteses(id) on delete set null,
  descricao     text not null check (length(trim(descricao)) >= 15),
  categoria     categoria_risco not null,
  probabilidade smallint not null check (probabilidade between 1 and 5),
  severidade    smallint not null check (severidade between 1 and 5),
  exposicao     integer generated always as (probabilidade * severidade) stored,
  resposta      resposta_risco not null default 'mitigar',
  gatilho       text,
  dono          text not null,
  status        text not null default 'aberto'
                check (status in ('aberto','monitorado','materializado','encerrado')),
  criado_em     timestamptz not null default now(),
  constraint aceite_exige_gatilho check (
    resposta <> 'aceitar' or (gatilho is not null and length(trim(gatilho)) >= 10)
  )
);
create index on riscos (analise_id, exposicao desc);

-- ── Ações (5W2H) ───────────────────────────────────────────────
create table acoes (
  id               uuid primary key default gen_random_uuid(),
  analise_id       uuid not null references analises(id) on delete cascade,
  hipotese_id      uuid not null references hipoteses(id) on delete restrict,
  o_que            text not null check (length(trim(o_que)) >= 10),
  por_que          text not null check (length(trim(por_que)) >= 10),
  quem             text not null,
  onde             text not null,
  quando           date not null,
  como             text not null check (length(trim(como)) >= 10),
  quanto           text not null default 'nao estimado',
  tipo             tipo_acao not null,
  status           status_acao not null default 'planejada',
  efeito_observado text,
  criado_em        timestamptz not null default now(),
  concluido_em     timestamptz,
  constraint conclusao_exige_efeito check (
    status <> 'concluida'
    or (efeito_observado is not null and length(trim(efeito_observado)) >= 10)
  )
);
create index on acoes (analise_id, status);
create index on acoes (quando) where status <> 'concluida';

-- ── Regra central do método: ação só sobre hipótese validada ──
create or replace function exigir_hipotese_validada()
returns trigger
language plpgsql
as $$
declare
  estado_atual estado_hipotese;
begin
  select estado into estado_atual from hipoteses where id = new.hipotese_id;

  if estado_atual is null then
    raise exception 'Hipótese % não existe', new.hipotese_id
      using errcode = 'foreign_key_violation';
  end if;

  if estado_atual <> 'validada' then
    raise exception
      'Esta hipótese ainda não foi validada por evidência (estado atual: %). '
      'Registre o teste e o resultado antes de criar contramedidas.', estado_atual
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger acao_exige_causa_validada
  before insert or update of hipotese_id on acoes
  for each row execute function exigir_hipotese_validada();

-- ── Medições (antes / depois) ──────────────────────────────────
create table medicoes (
  id         uuid primary key default gen_random_uuid(),
  analise_id uuid not null references analises(id) on delete cascade,
  momento    momento_medicao not null,
  data_ref   date not null,
  valor      numeric(12,3) not null,
  amostra    integer not null check (amostra > 0),
  p50        numeric(12,3),
  p85        numeric(12,3),
  observacao text,
  criado_em  timestamptz not null default now(),
  constraint percentis_coerentes check (p50 is null or p85 is null or p85 >= p50)
);
create index on medicoes (analise_id, momento, data_ref desc);

-- ── Views do dashboard ─────────────────────────────────────────
create or replace view v_medicao_atual as
select distinct on (analise_id, momento)
       analise_id, momento, data_ref, valor, amostra, p50, p85
  from medicoes
 order by analise_id, momento, data_ref desc;

create or replace view v_efeito_analise as
select a.id as analise_id, a.time_id, a.titulo, a.indicador, a.unidade,
       a.direcao, a.status, a.baseline_valor, a.meta_valor,
       antes.valor   as valor_antes,
       antes.amostra as amostra_antes,
       depois.valor  as valor_depois,
       depois.amostra as amostra_depois,
       case
         when antes.valor is null or depois.valor is null or antes.valor = 0 then null
         when a.direcao = 'menor_melhor' then (antes.valor - depois.valor) / abs(antes.valor) * 100
         else (depois.valor - antes.valor) / abs(antes.valor) * 100
       end as melhora_percentual
  from analises a
  left join v_medicao_atual antes  on antes.analise_id  = a.id and antes.momento  = 'antes'
  left join v_medicao_atual depois on depois.analise_id = a.id and depois.momento = 'depois';

create or replace view v_pareto_dimensao as
with base as (
  select h.analise_id, c.dimensao, sum(h.frequencia)::integer as frequencia
    from hipoteses h
    join causas c on c.id = h.causa_id
   group by h.analise_id, c.dimensao
)
select analise_id, dimensao, frequencia,
       sum(frequencia) over (partition by analise_id order by frequencia desc, dimensao)
       * 100.0 / nullif(sum(frequencia) over (partition by analise_id), 0) as percentual_acumulado
  from base;

create or replace view v_perfil_plano as
select analise_id,
       count(*) filter (where tipo = 'contencao')  as contencoes,
       count(*) filter (where tipo = 'corretiva')  as corretivas,
       count(*) filter (where tipo = 'preventiva') as preventivas,
       count(*) as total
  from acoes
 group by analise_id;

-- Agent Center token and estimated-cost visibility. Exact invoice totals remain in OpenAI's Costs dashboard.
begin;

alter table public.agent_runs
  add column if not exists model text,
  add column if not exists expert_input_tokens integer not null default 0 check (expert_input_tokens >= 0),
  add column if not exists expert_output_tokens integer not null default 0 check (expert_output_tokens >= 0),
  add column if not exists coordinator_input_tokens integer not null default 0 check (coordinator_input_tokens >= 0),
  add column if not exists coordinator_output_tokens integer not null default 0 check (coordinator_output_tokens >= 0),
  add column if not exists total_input_tokens integer not null default 0 check (total_input_tokens >= 0),
  add column if not exists total_output_tokens integer not null default 0 check (total_output_tokens >= 0),
  add column if not exists estimated_cost_usd numeric(12,8) check (estimated_cost_usd is null or estimated_cost_usd >= 0);

commit;

export function safeNumber(value: unknown): number;
export function campaignMetrics(campaign: { spend?: unknown; impressions?: unknown; clicks?: unknown; results?: unknown; sales_value?: unknown }): { ctr: number; resultCost: number; roas: number };
export function profitability(input: { revenue?: unknown; expenses?: unknown; labor?: unknown }): { cost: number; profit: number; margin: number };

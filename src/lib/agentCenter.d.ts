export interface AgentRoleDefinition { id: string; label: string; area: string; }
export const AGENT_ROLES: AgentRoleDefinition[];
export function isAgentRole(role: unknown): boolean;
export function buildExpertPrompt(role: string): string;
export function buildCoordinatorPrompt(expertLabel: string): string;

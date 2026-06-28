export function accountFocusUrl(runId: string, leadId: string): string {
  return `/run/${runId}/account/${leadId}`;
}

export function runWorkspaceUrl(runId: string): string {
  return `/run/${runId}`;
}

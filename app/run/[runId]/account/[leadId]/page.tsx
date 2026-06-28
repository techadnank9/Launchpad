import { AccountFocusPage } from "@/components/AccountFocusPage";

export default async function Page({
  params,
}: {
  params: Promise<{ runId: string; leadId: string }>;
}) {
  const { runId, leadId } = await params;
  return <AccountFocusPage runId={runId} leadId={leadId} />;
}

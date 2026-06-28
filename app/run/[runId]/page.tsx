import { RunDashboard } from "@/components/RunDashboard";

type Props = {
  params: Promise<{ runId: string }>;
};

export default async function RunPage({ params }: Props) {
  const { runId } = await params;
  return <RunDashboard runId={runId} />;
}

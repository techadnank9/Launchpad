import { PipelinePage } from "@/components/PipelinePage";

type Props = {
  params: Promise<{ runId: string }>;
};

export default async function PipelineRoute({ params }: Props) {
  const { runId } = await params;
  return <PipelinePage runId={runId} />;
}

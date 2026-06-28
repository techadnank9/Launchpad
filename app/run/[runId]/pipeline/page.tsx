import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ runId: string }>;
};

export default async function PipelineRoute({ params }: Props) {
  const { runId } = await params;
  redirect(`/run/${runId}`);
}

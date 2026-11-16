import { notFound } from "next/navigation";
import WorkspacePage from "@/components/apex/workspace";
import { previewData } from "@/lib/apex/preview";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { page } = await searchParams;
  return <WorkspacePage page={page || "dashboard"} preview={previewData()} />;
}

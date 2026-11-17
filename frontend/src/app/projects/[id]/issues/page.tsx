import { redirect } from "next/navigation";

interface IssuesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Findings now live beside the page they belong to. Old links and bookmarks
 * land in the editor with the whole-book scope already open.
 */
export default async function IssuesPage({ params, searchParams }: IssuesPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const issue = typeof query.issue === "string" ? query.issue : undefined;

  redirect(
    `/projects/${id}/editor?scope=book${issue ? `&issue=${encodeURIComponent(issue)}` : ""}`
  );
}

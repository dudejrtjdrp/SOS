import { notFound } from "next/navigation";
import { getDocument } from "@/lib/queries";
import { DocumentDetail } from "@/components/app/document-detail";

export default async function DocumentView({
  params,
}: {
  params: Promise<{ project: string; doc: string }>;
}) {
  const { doc: docId } = await params;
  const docData = await getDocument(docId);
  if (!docData) notFound();

  return (
    <DocumentDetail
      documentId={docId}
      title={docData.title}
      version={docData.version}
      bodyMd={docData.body_md}
      sections={docData.sections}
    />
  );
}

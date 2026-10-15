import { FaqsBoard, NewFaqButton } from "@/components/super-admin/faqs-board";
import { PageHeader } from "@/components/super-admin/ui";
import { getFaqs } from "@/lib/faqs/queries";

export const metadata = { title: "FAQs" };

export default async function FaqsPage() {
  const faqs = await getFaqs();
  const shown = faqs.filter((f) => f.isPublic).length;
  return (
    <>
      <PageHeader title="FAQs" description={`${faqs.length} questions · ${shown} shown on the homepage, in this order`} actions={<NewFaqButton />} />
      <FaqsBoard faqs={faqs} />
    </>
  );
}

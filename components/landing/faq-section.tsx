import { Faq } from "@/components/landing/faq";
import { getPublicFaqs } from "@/lib/faqs/queries";

/** Loads the FAQs shown on the website (cached until one changes). */
export default async function FaqSection() {
  return <Faq faqs={await getPublicFaqs()} />;
}

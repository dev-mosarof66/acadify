import { Pricing } from "@/components/landing/pricing";
import { getPublicPlans } from "@/lib/plans/queries";

/** Loads the plans shown on the website (cached until a plan changes) and renders the pricing cards. */
export default async function PricingSection() {
  const plans = await getPublicPlans();
  return <Pricing plans={plans} />;
}

import Navbar from "@/components/global/navbar";
import SiteFooter from "@/components/landing/site-footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen w-full">
      <Navbar />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

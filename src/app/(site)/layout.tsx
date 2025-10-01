import BackToTop from "@/components/back-to-top";
import TopNav from "@/components/top-nav";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-layout">
      <TopNav />
      {children}
      <BackToTop />
    </div>
  );
}

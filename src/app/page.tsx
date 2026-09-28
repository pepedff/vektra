import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { Faq } from "@/components/landing/faq";
import { Features, StatsStrip } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";
import { Support } from "@/components/landing/support";
import { publicPlans } from "@/server/public-queries";

export const revalidate = 300;

export default async function LandingPage() {
  const plans = await publicPlans();
  return (
    <>
      <SmoothScroll />
      <Navbar />
      <main className="noise relative overflow-x-clip">
        <Hero />
        <StatsStrip />
        <HowItWorks />
        <Features />
        <Pricing plans={plans} />
        <Faq />
        <Support />
      </main>
      <Footer />
    </>
  );
}

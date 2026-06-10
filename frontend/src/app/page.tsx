import PublicNav from "@/components/features/landing/PublicNav";
import Hero from "@/components/features/landing/Hero";
import HowItWorks from "@/components/features/landing/HowItWorks";
import PublicComplaintMap from "@/components/features/landing/PublicComplaintMap";
import FeaturesGrid from "@/components/features/landing/FeaturesGrid";
import LiveComplaints from "@/components/features/landing/LiveComplaints";
import Testimonials from "@/components/features/landing/Testimonials";
import ContactSection from "@/components/features/landing/ContactSection";
import LandingFooter from "@/components/features/landing/LandingFooter";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <PublicNav />
      <Hero />
      <HowItWorks />
      <PublicComplaintMap />
      <FeaturesGrid />
      <LiveComplaints />
      <Testimonials />
      <ContactSection />
      <LandingFooter />
    </main>
  );
}

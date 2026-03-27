// Landing Page - ronansat.com/

import Link from "next/link";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesBento from "@/components/landing/FeaturesBento";
import ExplanationSection from "@/components/landing/ExplanationSection";
import TestimonialsMarquee from "@/components/landing/TestimonialsMarquee";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Landing Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground tracking-tight">Ronan SAT</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/auth" 
                className="text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth"
                className="bg-primary hover:bg-blue-700 text-primary-foreground px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                Sign up free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Landing Page Sections */}
      <main>
        <HeroSection />
        <FeaturesBento />
        <ExplanationSection />
        <TestimonialsMarquee />
        <CTASection />
      </main>
      
      <LandingFooter />
    </div>
  );
}

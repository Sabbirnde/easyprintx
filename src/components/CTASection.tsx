import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Building, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const CTASection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/portal');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="py-24 bg-gradient-cta relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.1),transparent)]"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {/* Main CTA */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Ready to revolutionize your 
            <span className="text-primary"> printing experience?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Join thousands of students and businesses already using EasyPrintX for seamless, 
            efficient printing with real-time tracking and instant booking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="group bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
              onClick={handleGetStarted}
            >
              <Users className="mr-2 h-5 w-5" />
              {user ? 'Go to Print Queue' : 'Get Started Free'}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="group border-primary text-primary hover:bg-primary hover:text-white px-8 py-4 text-lg"
              onClick={() => navigate('/print-queue')}
            >
              <Building className="mr-2 h-5 w-5" />
              Shop Owner Portal
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">10,000+</div>
            <div className="text-muted-foreground">Print Jobs Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
            <div className="text-muted-foreground">Active Print Shops</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-muted-foreground">Uptime Guarantee</div>
          </div>
        </div>

        {/* Features Highlight */}
        <div className="bg-background/50 backdrop-blur rounded-lg p-8 border border-border/50">
          <h3 className="text-2xl font-semibold text-foreground mb-6">What makes EasyPrintX special?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div>
              <h4 className="font-semibold text-foreground mb-2">⚡ Lightning Fast</h4>
              <p className="text-sm text-muted-foreground">Upload, pay, and print in under 2 minutes</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">🔒 Secure</h4>
              <p className="text-sm text-muted-foreground">Bank-level encryption for all your documents</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">📍 Smart Location</h4>
              <p className="text-sm text-muted-foreground">Find the closest shop with real-time availability</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">📱 Mobile First</h4>
              <p className="text-sm text-muted-foreground">Optimized for smartphones and tablets</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
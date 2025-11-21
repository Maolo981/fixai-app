import { Button } from "@/components/ui/button";
import { Camera, Clock, DollarSign, Shield, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Fix It Fast with AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Snap a photo of your repair problem. Get instant AI diagnosis and connect with verified technicians in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/diagnose">
                <Button size="lg" className="text-lg shadow-medium">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Diagnosis
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-lg shadow-soft border border-border">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Photo</h3>
              <p className="text-muted-foreground">
                Take a photo or upload an image of your repair problem
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-soft border border-border">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. AI Diagnosis</h3>
              <p className="text-muted-foreground">
                Get instant analysis with cost estimates and urgency level
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-soft border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Get Matched</h3>
              <p className="text-muted-foreground">
                Connect with verified technicians nearby in seconds
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose AI Repair Finder</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Instant Response</h3>
              <p className="text-sm text-muted-foreground">AI diagnosis in seconds</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Verified Techs</h3>
              <p className="text-sm text-muted-foreground">All technicians verified</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">In-app payment protection</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Guaranteed</h3>
              <p className="text-sm text-muted-foreground">Work quality guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Fix Your Problem?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of homeowners who trust AI Repair Finder for fast, reliable home repairs
          </p>
          <Link to="/diagnose">
            <Button size="lg" variant="secondary" className="text-lg shadow-strong">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
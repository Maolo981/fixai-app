import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Clock, Shield, Users, Zap, Wrench, CheckCircle, ArrowRight, Building2, BarChart3, TrendingUp, Star, Smartphone, Globe, CreditCard, MessageSquare, Play } from "lucide-react";
import { Link } from "react-router-dom";

const LandingEN = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-hero rounded-xl flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                FIXO
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/demo">
                <Button variant="ghost" size="sm" className="font-medium gap-2">
                  <Play className="h-4 w-4" />
                  Demo
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="font-medium bg-gradient-hero border-0">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5"></div>
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-6 animate-bounce-in hover:scale-105 transition-transform">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-gradient font-semibold">AI-Powered Home Repair Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black mb-6 tracking-tight animate-fade-in-up leading-tight">
              Fix Any Home{" "}
              <span className="text-gradient animate-glow">
                Problem
              </span>
              {" "}in 3 Simple Steps
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 animate-fade-in max-w-2xl mx-auto leading-relaxed">
              Snap a photo, get instant AI diagnosis, and connect with verified technicians nearby. 
              Home repairs made simple.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-fade">
              <Link to="/demo" className="w-full sm:w-auto group">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-semibold shadow-strong hover:shadow-glow transition-all hover:scale-105 bg-gradient-hero border-0 hover-lift">
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Watch Demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/diagnose" className="w-full sm:w-auto group">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold transition-all hover:scale-105 border-2">
                  <Camera className="mr-2 h-5 w-5" />
                  Try It Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">The Problem We Solve</h2>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
                Home repairs are stressful. Finding reliable technicians is hard. 
                Getting fair prices is harder. We fix all of that.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 mb-16">
              {/* Before */}
              <Card className="p-8 border-2 border-destructive/20 bg-destructive/5">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-destructive">
                  <span className="text-2xl">😩</span> Without FIXO
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </div>
                    <span className="text-muted-foreground">Call multiple technicians for quotes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </div>
                    <span className="text-muted-foreground">Wait days for someone to show up</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </div>
                    <span className="text-muted-foreground">No idea if the price is fair</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-destructive text-sm">✕</span>
                    </div>
                    <span className="text-muted-foreground">Risk hiring unverified workers</span>
                  </li>
                </ul>
              </Card>

              {/* After */}
              <Card className="p-8 border-2 border-primary/20 bg-primary/5">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                  <span className="text-2xl">🎉</span> With FIXO
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground">Instant AI diagnosis & cost estimate</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground">Book verified technicians instantly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground">Transparent pricing, no surprises</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-muted-foreground">Real-time tracking & secure payments</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in-up">
            <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg sm:text-xl">Simple, fast, effective</p>
          </div>
          <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-3">
            <Card className="p-8 bg-gradient-card border-2 hover:border-primary hover:shadow-strong transition-all group hover-lift animate-fade-in-up relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-hero opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-medium">
                  <Camera className="h-7 w-7 text-white" />
                </div>
                <div className="text-4xl font-display font-black text-gradient mb-3">01</div>
                <h3 className="text-xl font-display font-bold mb-3">Snap a Photo</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Take a picture of your broken appliance or issue
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-card border-2 hover:border-secondary hover:shadow-strong transition-all group hover-lift animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-medium">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <div className="text-4xl font-display font-black text-gradient mb-3">02</div>
                <h3 className="text-xl font-display font-bold mb-3">AI Diagnosis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get instant analysis, problem identification & cost estimate
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-gradient-card border-2 hover:border-accent hover:shadow-strong transition-all group hover-lift animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-medium">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="text-4xl font-display font-black text-gradient mb-3">03</div>
                <h3 className="text-xl font-display font-bold mb-3">Get It Fixed</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connect with verified technicians near you & book instantly
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">Why Choose FIXO</h2>
            <p className="text-muted-foreground text-lg sm:text-xl">The smart solution for home repairs</p>
          </div>
          <div className="grid gap-6 max-w-6xl mx-auto md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 text-center hover:shadow-medium transition-all group">
              <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-soft">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">Diagnosis in seconds, not hours</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-medium transition-all group">
              <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-soft">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Verified Pros</h3>
              <p className="text-sm text-muted-foreground">All technicians are vetted & certified</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-medium transition-all group">
              <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-soft">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Secure Payment</h3>
              <p className="text-sm text-muted-foreground">Pay safely through the app with protection</p>
            </Card>

            <Card className="p-6 text-center hover:shadow-medium transition-all group">
              <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-soft">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Real-Time Chat</h3>
              <p className="text-sm text-muted-foreground">Communicate directly with your technician</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="h-4 w-4" />
                Market Opportunity
              </div>
              <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">A Massive Market</h2>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto">
                The home repair industry is ripe for disruption
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-8 text-center border-2 hover:border-primary transition-all">
                <div className="text-5xl sm:text-6xl font-display font-black text-gradient mb-2">€120B</div>
                <p className="text-muted-foreground font-medium">European Home Repair Market</p>
              </Card>

              <Card className="p-8 text-center border-2 hover:border-secondary transition-all">
                <div className="text-5xl sm:text-6xl font-display font-black text-gradient mb-2">85%</div>
                <p className="text-muted-foreground font-medium">Of Users Prefer Digital Booking</p>
              </Card>

              <Card className="p-8 text-center border-2 hover:border-accent transition-all">
                <div className="text-5xl sm:text-6xl font-display font-black text-gradient mb-2">12%</div>
                <p className="text-muted-foreground font-medium">Annual Market Growth Rate</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Business Model */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-secondary/10 to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <CreditCard className="h-4 w-4" />
                Business Model
              </div>
              <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">
                How FIXO Makes Money
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A transparent, sustainable revenue model
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-8 border-2 hover:border-primary transition-all">
                <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mb-6 shadow-medium">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Service Fee</h3>
                <p className="text-muted-foreground mb-4">
                  A small fixed fee per confirmed booking covers AI analysis, job management, and platform operations.
                </p>
                <div className="text-sm text-primary font-medium">
                  Charged only when a job is confirmed
                </div>
              </Card>

              <Card className="p-8 border-2 hover:border-secondary transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mb-6 shadow-medium">
                  <CreditCard className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Payment Processing (2-3%)</h3>
                <p className="text-muted-foreground mb-4">
                  Optional in-app payments include payment protection, automated invoicing, and secure transactions.
                </p>
                <div className="text-sm text-secondary font-medium">
                  Customers can also pay technicians directly
                </div>
              </Card>
            </div>

            <Card className="p-6 mt-8 bg-primary/5 border-primary/20 text-center">
              <p className="text-lg font-medium">
                💡 FIXO only earns when the service is successfully delivered. 
                <span className="text-muted-foreground ml-2">Our success is aligned with customer satisfaction.</span>
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* For Technicians */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Wrench className="h-4 w-4 text-accent" />
                For Professionals
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Are You a Technician? Join FIXO
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Expand your business, get more clients, and manage everything from one platform
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3 mb-10">
              <Card className="p-6 text-center border-2 hover:border-accent hover:shadow-medium transition-all">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">More Clients</h3>
                <p className="text-sm text-muted-foreground">
                  Receive job requests from customers in your area
                </p>
              </Card>

              <Card className="p-6 text-center border-2 hover:border-accent hover:shadow-medium transition-all">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Easy Management</h3>
                <p className="text-sm text-muted-foreground">
                  Complete dashboard for all your jobs & quotes
                </p>
              </Card>

              <Card className="p-6 text-center border-2 hover:border-accent hover:shadow-medium transition-all">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Build Reputation</h3>
                <p className="text-sm text-muted-foreground">
                  Get reviews and grow your professional profile
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* For Companies */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-accent/10 via-primary/5 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Building2 className="h-4 w-4" />
                FIXO Business
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                For Repair Companies
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Manage your entire team of technicians from a single professional dashboard
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3 mb-10">
              <Card className="p-6 text-center border-2 hover:border-primary hover:shadow-medium transition-all group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Team Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage all technicians from one centralized dashboard
                </p>
              </Card>

              <Card className="p-6 text-center border-2 hover:border-primary hover:shadow-medium transition-all group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Analytics & Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Track performance, revenue, and customer satisfaction in real-time
                </p>
              </Card>

              <Card className="p-6 text-center border-2 hover:border-primary hover:shadow-medium transition-all group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Scale Your Business</h3>
                <p className="text-sm text-muted-foreground">
                  Expand with professional tools and automation
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Ready to See FIXO in Action?
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-8">
              Experience the future of home repairs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/demo">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-medium shadow-strong hover:scale-105 transition-all">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </Link>
              <Link to="/diagnose">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-medium hover:scale-105 transition-all border-white text-white hover:bg-white/10">
                  Try It Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                FIXO
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {currentYear} FIXO. Smart repairs powered by AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingEN;
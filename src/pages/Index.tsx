import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Clock, Shield, Users, Zap, Wrench, CheckCircle, ArrowRight, Building2, BarChart3, TrendingUp, Play, Target, Sparkles, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { useState } from "react";

const translations = {
  it: {
    login: "Accedi",
    badge: "Diagnosi AI Istantanea",
    heroTitle1: "Risolvi qualsiasi",
    heroTitle2: "problema",
    heroTitle3: "in 3 semplici passi",
    heroSubtitle: "Scatta una foto, ricevi una diagnosi AI e trova il tecnico perfetto. Tutto in pochi minuti.",
    startFree: "Inizia Gratis",
    watchDemo: "Guarda Demo",
    howItWorks: "Come funziona",
    howItWorksSubtitle: "Semplice, veloce, efficace",
    step1Title: "Scatta una foto",
    step1Desc: "Carica un'immagine del problema da risolvere",
    step2Title: "Diagnosi AI",
    step2Desc: "Ricevi analisi e stima costi in pochi secondi",
    step3Title: "Trova tecnico",
    step3Desc: "Connettiti con professionisti verificati vicino a te",
    whyChoose: "Perché scegliere FIXO",
    whyChooseSubtitle: "La soluzione smart per le tue riparazioni",
    fast: "Veloce",
    fastDesc: "Diagnosi in secondi, non ore",
    secure: "Sicuro",
    secureDesc: "Tecnici verificati e certificati",
    guaranteed: "Garantito",
    guaranteedDesc: "Qualità del lavoro assicurata",
    smart: "Smart",
    smartDesc: "Powered by AI avanzata",
    forTechnicians: "Per Tecnici Professionisti",
    techTitle: "Sei un tecnico? Unisciti a FIXO",
    techSubtitle: "Espandi il tuo business, gestisci i lavori e ricevi preventivi personalizzati",
    moreClients: "Più Clienti",
    moreClientsDesc: "Ricevi richieste da utenti nella tua area",
    easyManagement: "Gestione Semplice",
    easyManagementDesc: "Dashboard completa per tutti i tuoi lavori",
    smartQuotes: "Preventivi Smart",
    smartQuotesDesc: "Crea e invia preventivi personalizzati",
    registerTech: "Registrati come Tecnico",
    forCompanies: "Per Aziende",
    companyTitle: "Gestisci un'azienda? Scopri FIXO Business",
    companySubtitle: "Porta il tuo team di tecnici su FIXO e gestisci tutto da un'unica piattaforma professionale",
    unifiedTeam: "Team Unificato",
    unifiedTeamDesc: "Gestisci tutti i tuoi tecnici da un'unica dashboard centralizzata",
    analytics: "Report e Analytics",
    analyticsDesc: "Monitora performance, guadagni e soddisfazione clienti in tempo reale",
    scalableGrowth: "Crescita Scalabile",
    scalableGrowthDesc: "Espandi il tuo business con strumenti professionali e automazioni",
    registerCompany: "Registra la tua Azienda",
    ctaTitle: "Pronto a risolvere il tuo problema?",
    ctaSubtitle: "Unisciti a migliaia di utenti soddisfatti",
    startNow: "Inizia Ora",
    footerTagline: "Riparazioni smart, powered by AI",
    // Market & Business Model (for EN presentation)
    problemTitle: "The Problem",
    problemSubtitle: "Traditional home repairs are frustrating",
    problemItems: [
      "Hard to diagnose issues without expertise",
      "Difficult to find reliable technicians",
      "No price transparency",
      "Long wait times and uncertainty"
    ],
    solutionTitle: "Our Solution",
    solutionSubtitle: "FIXO makes repairs simple",
    solutionItems: [
      "Instant AI diagnosis from a photo",
      "Network of verified professionals",
      "Transparent pricing upfront",
      "Quick scheduling and tracking"
    ],
    marketTitle: "Market Opportunity",
    marketSize: "€140B",
    marketSizeLabel: "European Home Repair Market",
    digitalBooking: "73%",
    digitalBookingLabel: "Prefer Digital Booking",
    growthRate: "12%",
    growthRateLabel: "Annual Growth Rate",
    businessModelTitle: "Business Model",
    businessModelSubtitle: "Sustainable revenue streams",
    serviceFee: "Service Fee",
    serviceFeeDesc: "Fixed €5-15 fee per completed job",
    paymentFee: "Payment Processing",
    paymentFeeDesc: "Optional 2-3% for in-app payments",
    tryFree: "Try It Free"
  },
  en: {
    login: "Sign In",
    badge: "Instant AI Diagnosis",
    heroTitle1: "Fix any",
    heroTitle2: "problem",
    heroTitle3: "in 3 simple steps",
    heroSubtitle: "Snap a photo, get an AI diagnosis, and find the perfect technician. All in minutes.",
    startFree: "Start Free",
    watchDemo: "Watch Demo",
    howItWorks: "How It Works",
    howItWorksSubtitle: "Simple, fast, effective",
    step1Title: "Snap a Photo",
    step1Desc: "Upload an image of the problem to solve",
    step2Title: "AI Diagnosis",
    step2Desc: "Get analysis and cost estimate in seconds",
    step3Title: "Find Technician",
    step3Desc: "Connect with verified professionals near you",
    whyChoose: "Why Choose FIXO",
    whyChooseSubtitle: "The smart solution for your repairs",
    fast: "Fast",
    fastDesc: "Diagnosis in seconds, not hours",
    secure: "Secure",
    secureDesc: "Verified and certified technicians",
    guaranteed: "Guaranteed",
    guaranteedDesc: "Work quality assured",
    smart: "Smart",
    smartDesc: "Powered by advanced AI",
    forTechnicians: "For Professional Technicians",
    techTitle: "Are you a technician? Join FIXO",
    techSubtitle: "Expand your business, manage jobs and receive personalized quotes",
    moreClients: "More Clients",
    moreClientsDesc: "Receive requests from users in your area",
    easyManagement: "Easy Management",
    easyManagementDesc: "Complete dashboard for all your jobs",
    smartQuotes: "Smart Quotes",
    smartQuotesDesc: "Create and send personalized quotes",
    registerTech: "Register as Technician",
    forCompanies: "For Companies",
    companyTitle: "Managing a company? Discover FIXO Business",
    companySubtitle: "Bring your team of technicians to FIXO and manage everything from a single professional platform",
    unifiedTeam: "Unified Team",
    unifiedTeamDesc: "Manage all your technicians from a single centralized dashboard",
    analytics: "Reports & Analytics",
    analyticsDesc: "Monitor performance, earnings and customer satisfaction in real-time",
    scalableGrowth: "Scalable Growth",
    scalableGrowthDesc: "Expand your business with professional tools and automation",
    registerCompany: "Register Your Company",
    ctaTitle: "Ready to solve your problem?",
    ctaSubtitle: "Join thousands of satisfied users",
    startNow: "Start Now",
    footerTagline: "Smart repairs, powered by AI",
    // Market & Business Model
    problemTitle: "The Problem",
    problemSubtitle: "Traditional home repairs are frustrating",
    problemItems: [
      "Hard to diagnose issues without expertise",
      "Difficult to find reliable technicians",
      "No price transparency",
      "Long wait times and uncertainty"
    ],
    solutionTitle: "Our Solution",
    solutionSubtitle: "FIXO makes repairs simple",
    solutionItems: [
      "Instant AI diagnosis from a photo",
      "Network of verified professionals",
      "Transparent pricing upfront",
      "Quick scheduling and tracking"
    ],
    marketTitle: "Market Opportunity",
    marketSize: "€140B",
    marketSizeLabel: "European Home Repair Market",
    digitalBooking: "73%",
    digitalBookingLabel: "Prefer Digital Booking",
    growthRate: "12%",
    growthRateLabel: "Annual Growth Rate",
    businessModelTitle: "Business Model",
    businessModelSubtitle: "Sustainable revenue streams",
    serviceFee: "Service Fee",
    serviceFeeDesc: "Fixed €5-15 fee per completed job",
    paymentFee: "Payment Processing",
    paymentFeeDesc: "Optional 2-3% for in-app payments",
    tryFree: "Try It Free"
  }
};

const Index = () => {
  const currentYear = new Date().getFullYear();
  const [lang, setLang] = useState<'it' | 'en'>('it');
  const t = translations[lang];

  return (
    <MobileLayout showBottomNav={false}>
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
                  className="font-medium gap-1"
                >
                  <Globe className="h-4 w-4" />
                  {lang.toUpperCase()}
                </Button>
                <Link to="/demo">
                  <Button variant="outline" size="sm" className="font-medium gap-1">
                    <Play className="h-4 w-4" />
                    Demo
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t.login}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5"></div>
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm font-medium mb-6 animate-bounce-in hover:scale-105 transition-transform">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-gradient font-semibold">{t.badge}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black mb-6 tracking-tight animate-fade-in-up leading-tight">
                {t.heroTitle1}{" "}
                <span className="text-gradient animate-glow">
                  {t.heroTitle2}
                </span>
                {" "}{t.heroTitle3}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 animate-fade-in max-w-2xl mx-auto leading-relaxed">
                {t.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-fade">
                <Link to="/demo" className="w-full sm:w-auto group">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base font-semibold">
                    <Play className="mr-2 h-5 w-5" />
                    {t.watchDemo}
                  </Button>
                </Link>
                <Link to="/diagnose" className="w-full sm:w-auto group">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-semibold shadow-strong hover:shadow-glow transition-all hover:scale-105 bg-gradient-hero border-0 hover-lift">
                    <Camera className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                    {t.startFree}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Problem & Solution - Only show in English */}
        {lang === 'en' && (
          <section className="py-16 sm:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid gap-12 max-w-5xl mx-auto lg:grid-cols-2">
                {/* Problem */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full text-sm font-medium">
                    <Target className="h-4 w-4" />
                    {t.problemTitle}
                  </div>
                  <h3 className="text-2xl font-bold">{t.problemSubtitle}</h3>
                  <ul className="space-y-3">
                    {t.problemItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-destructive mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Solution */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                    <Sparkles className="h-4 w-4" />
                    {t.solutionTitle}
                  </div>
                  <h3 className="text-2xl font-bold">{t.solutionSubtitle}</h3>
                  <ul className="space-y-3">
                    {t.solutionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* How It Works */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in-up">
              <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">{t.howItWorks}</h2>
              <p className="text-muted-foreground text-lg sm:text-xl">{t.howItWorksSubtitle}</p>
            </div>
            <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-3">
              <Card className="p-8 bg-gradient-card border-2 hover:border-primary hover:shadow-strong transition-all group hover-lift animate-fade-in-up relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-hero opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity"></div>
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-hero rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-medium">
                    <Camera className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-4xl font-display font-black text-gradient mb-3">01</div>
                  <h3 className="text-xl font-display font-bold mb-3">{t.step1Title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t.step1Desc}</p>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-card border-2 hover:border-secondary hover:shadow-strong transition-all group hover-lift animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity"></div>
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-medium">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-4xl font-display font-black text-gradient mb-3">02</div>
                  <h3 className="text-xl font-display font-bold mb-3">{t.step2Title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t.step2Desc}</p>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-card border-2 hover:border-accent hover:shadow-strong transition-all group hover-lift animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity"></div>
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-medium">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-4xl font-display font-black text-gradient mb-3">03</div>
                  <h3 className="text-xl font-display font-bold mb-3">{t.step3Title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t.step3Desc}</p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Market Opportunity - Only show in English */}
        {lang === 'en' && (
          <section className="py-16 sm:py-24 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.marketTitle}</h2>
              </div>
              <div className="grid gap-6 max-w-4xl mx-auto sm:grid-cols-3">
                <Card className="p-8 text-center border-2">
                  <div className="text-4xl font-black text-gradient mb-2">{t.marketSize}</div>
                  <p className="text-muted-foreground">{t.marketSizeLabel}</p>
                </Card>
                <Card className="p-8 text-center border-2">
                  <div className="text-4xl font-black text-gradient mb-2">{t.digitalBooking}</div>
                  <p className="text-muted-foreground">{t.digitalBookingLabel}</p>
                </Card>
                <Card className="p-8 text-center border-2">
                  <div className="text-4xl font-black text-gradient mb-2">{t.growthRate}</div>
                  <p className="text-muted-foreground">{t.growthRateLabel}</p>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* Benefits */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.whyChoose}</h2>
              <p className="text-muted-foreground text-lg">{t.whyChooseSubtitle}</p>
            </div>
            <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t.fast}</h3>
                <p className="text-sm text-muted-foreground">{t.fastDesc}</p>
              </div>

              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t.secure}</h3>
                <p className="text-sm text-muted-foreground">{t.secureDesc}</p>
              </div>

              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t.guaranteed}</h3>
                <p className="text-sm text-muted-foreground">{t.guaranteedDesc}</p>
              </div>

              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{t.smart}</h3>
                <p className="text-sm text-muted-foreground">{t.smartDesc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Business Model - Only show in English */}
        {lang === 'en' && (
          <section className="py-16 sm:py-24 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.businessModelTitle}</h2>
                <p className="text-muted-foreground text-lg">{t.businessModelSubtitle}</p>
              </div>
              <div className="grid gap-6 max-w-3xl mx-auto sm:grid-cols-2">
                <Card className="p-8 border-2 hover:border-primary transition-all">
                  <div className="text-3xl font-black text-gradient mb-2">€5-15</div>
                  <h3 className="font-bold mb-2">{t.serviceFee}</h3>
                  <p className="text-muted-foreground">{t.serviceFeeDesc}</p>
                </Card>
                <Card className="p-8 border-2 hover:border-secondary transition-all">
                  <div className="text-3xl font-black text-gradient mb-2">2-3%</div>
                  <h3 className="font-bold mb-2">{t.paymentFee}</h3>
                  <p className="text-muted-foreground">{t.paymentFeeDesc}</p>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* Technician Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-secondary/10 to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Wrench className="h-4 w-4" />
                  {t.forTechnicians}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.techTitle}</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.techSubtitle}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3 mb-10">
                <Card className="p-6 text-center border-2 hover:border-secondary hover:shadow-medium transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.moreClients}</h3>
                  <p className="text-sm text-muted-foreground">{t.moreClientsDesc}</p>
                </Card>

                <Card className="p-6 text-center border-2 hover:border-secondary hover:shadow-medium transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.easyManagement}</h3>
                  <p className="text-sm text-muted-foreground">{t.easyManagementDesc}</p>
                </Card>

                <Card className="p-6 text-center border-2 hover:border-secondary hover:shadow-medium transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.smartQuotes}</h3>
                  <p className="text-sm text-muted-foreground">{t.smartQuotesDesc}</p>
                </Card>
              </div>

              <div className="text-center">
                <Link to="/tech-signup">
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-medium shadow-medium hover:shadow-strong transition-all hover:scale-105">
                    <Wrench className="mr-2 h-5 w-5" />
                    {t.registerTech}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Company Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-accent/10 via-primary/5 to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Building2 className="h-4 w-4 text-accent" />
                  {t.forCompanies}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.companyTitle}</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.companySubtitle}</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3 mb-10">
                <Card className="p-6 text-center border-2 hover:border-accent hover:shadow-medium transition-all group">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.unifiedTeam}</h3>
                  <p className="text-sm text-muted-foreground">{t.unifiedTeamDesc}</p>
                </Card>

                <Card className="p-6 text-center border-2 hover:border-accent hover:shadow-medium transition-all group">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.analytics}</h3>
                  <p className="text-sm text-muted-foreground">{t.analyticsDesc}</p>
                </Card>

                <Card className="p-6 text-center border-2 hover:border-accent hover:shadow-medium transition-all group">
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{t.scalableGrowth}</h3>
                  <p className="text-sm text-muted-foreground">{t.scalableGrowthDesc}</p>
                </Card>
              </div>

              <div className="text-center">
                <Link to="/auth?type=azienda">
                  <Button size="lg" className="h-14 px-8 text-base font-medium shadow-medium hover:shadow-strong transition-all hover:scale-105 bg-gradient-to-r from-accent to-primary border-0">
                    <Building2 className="mr-2 h-5 w-5" />
                    {t.registerCompany}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-95"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.ctaTitle}</h2>
              <p className="text-lg sm:text-xl text-white/90 mb-8">{t.ctaSubtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/demo">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base font-medium bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Play className="mr-2 h-5 w-5" />
                    {t.watchDemo}
                  </Button>
                </Link>
                <Link to="/diagnose">
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-medium shadow-strong hover:scale-105 transition-all">
                    {t.tryFree}
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
                © {currentYear} FIXO. {t.footerTagline}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </MobileLayout>
  );
};

export default Index;
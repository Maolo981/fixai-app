import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Clock, Shield, Users, Zap, Wrench, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";

const Index = () => {
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
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="font-medium">
                  Accedi
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-background"></div>
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
                <Zap className="h-4 w-4" />
                Diagnosi AI Istantanea
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight animate-fade-in">
                Risolvi qualsiasi{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  problema
                </span>
                {" "}in 3 semplici passi
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 animate-fade-in">
                Scatta una foto, ricevi una diagnosi AI e trova il tecnico perfetto. 
                Tutto in pochi minuti.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                <Link to="/diagnose" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-medium shadow-medium hover:shadow-strong transition-all hover:scale-105">
                    <Camera className="mr-2 h-5 w-5" />
                    Inizia Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Come funziona</h2>
              <p className="text-muted-foreground text-lg">Semplice, veloce, efficace</p>
            </div>
            <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-3">
              <Card className="p-8 border-2 hover:border-primary hover:shadow-medium transition-all group">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <Camera className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <div className="text-3xl font-bold text-primary mb-2">01</div>
                <h3 className="text-xl font-semibold mb-3">Scatta una foto</h3>
                <p className="text-muted-foreground">
                  Carica un'immagine del problema da risolvere
                </p>
              </Card>

              <Card className="p-8 border-2 hover:border-secondary hover:shadow-medium transition-all group">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary group-hover:scale-110 transition-all">
                  <Zap className="h-6 w-6 text-secondary group-hover:text-white transition-colors" />
                </div>
                <div className="text-3xl font-bold text-secondary mb-2">02</div>
                <h3 className="text-xl font-semibold mb-3">Diagnosi AI</h3>
                <p className="text-muted-foreground">
                  Ricevi analisi e stima costi in pochi secondi
                </p>
              </Card>

              <Card className="p-8 border-2 hover:border-accent hover:shadow-medium transition-all group">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent group-hover:scale-110 transition-all">
                  <Users className="h-6 w-6 text-accent group-hover:text-white transition-colors" />
                </div>
                <div className="text-3xl font-bold text-accent mb-2">03</div>
                <h3 className="text-xl font-semibold mb-3">Trova tecnico</h3>
                <p className="text-muted-foreground">
                  Connettiti con professionisti verificati vicino a te
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Perché scegliere FIXO</h2>
              <p className="text-muted-foreground text-lg">La soluzione smart per le tue riparazioni</p>
            </div>
            <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Veloce</h3>
                <p className="text-sm text-muted-foreground">Diagnosi in secondi, non ore</p>
              </div>

              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Sicuro</h3>
                <p className="text-sm text-muted-foreground">Tecnici verificati e certificati</p>
              </div>

              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <CheckCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Garantito</h3>
                <p className="text-sm text-muted-foreground">Qualità del lavoro assicurata</p>
              </div>

              <div className="text-center p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-card rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Smart</h3>
                <p className="text-sm text-muted-foreground">Powered by AI avanzata</p>
              </div>
            </div>
          </div>
        </section>

        {/* Technician Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-br from-secondary/10 to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Wrench className="h-4 w-4" />
                  Per Tecnici Professionisti
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Sei un tecnico? Unisciti a FIXO
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Espandi il tuo business, gestisci i lavori e ricevi preventivi personalizzati
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3 mb-10">
                <Card className="p-6 text-center border-2 hover:border-secondary hover:shadow-medium transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">Più Clienti</h3>
                  <p className="text-sm text-muted-foreground">
                    Ricevi richieste da utenti nella tua area
                  </p>
                </Card>

                <Card className="p-6 text-center border-2 hover:border-secondary hover:shadow-medium transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">Gestione Semplice</h3>
                  <p className="text-sm text-muted-foreground">
                    Dashboard completa per tutti i tuoi lavori
                  </p>
                </Card>

                <Card className="p-6 text-center border-2 hover:border-secondary hover:shadow-medium transition-all">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">Preventivi Smart</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea e invia preventivi personalizzati
                  </p>
                </Card>
              </div>

              <div className="text-center">
                <Link to="/tech-signup">
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-medium shadow-medium hover:shadow-strong transition-all hover:scale-105">
                    <Wrench className="mr-2 h-5 w-5" />
                    Registrati come Tecnico
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
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto a risolvere il tuo problema?
              </h2>
              <p className="text-lg sm:text-xl text-white/90 mb-8">
                Unisciti a migliaia di utenti soddisfatti
              </p>
              <Link to="/diagnose">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-medium shadow-strong hover:scale-105 transition-all">
                  Inizia Ora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
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
                © 2024 FIXO. Riparazioni smart con AI.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </MobileLayout>
  );
};

export default Index;
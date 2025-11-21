import { Button } from "@/components/ui/button";
import { Camera, Clock, DollarSign, Shield, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";

const Index = () => {
  return (
    <MobileLayout>
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-12 sm:py-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Riparazioni Veloci con AI
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-8 px-4">
              Scatta una foto del problema. Ottieni una diagnosi AI istantanea e connettiti con tecnici verificati.
            </p>
            <div className="flex flex-col gap-3 sm:gap-4 px-4">
              <Link to="/diagnose" className="w-full">
                <Button size="lg" className="w-full h-14 sm:h-16 text-base sm:text-lg shadow-medium touch-manipulation active:scale-95 transition-transform">
                  <Camera className="mr-2 h-6 w-6 sm:h-7 sm:w-7" />
                  Inizia Diagnosi
                </Button>
              </Link>
              <Link to="/auth" className="w-full">
                <Button size="lg" variant="outline" className="w-full h-14 sm:h-16 text-base sm:text-lg touch-manipulation active:scale-95 transition-transform">
                  Accedi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 sm:mb-12">Come Funziona</h2>
          <div className="grid gap-6 sm:gap-8 max-w-6xl mx-auto sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card p-6 sm:p-8 rounded-xl shadow-soft border border-border touch-manipulation active:scale-95 transition-transform">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-xl flex items-center justify-center mb-4">
                <Camera className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">1. Carica Foto</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Scatta una foto o carica un'immagine del tuo problema di riparazione
              </p>
            </div>
            
            <div className="bg-card p-6 sm:p-8 rounded-xl shadow-soft border border-border touch-manipulation active:scale-95 transition-transform">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-secondary rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">2. Diagnosi AI</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Ottieni un'analisi istantanea con stime di costo e livello di urgenza
              </p>
            </div>
            
            <div className="bg-card p-6 sm:p-8 rounded-xl shadow-soft border border-border touch-manipulation active:scale-95 transition-transform sm:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-accent rounded-xl flex items-center justify-center mb-4">
                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-accent-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">3. Trova Tecnico</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Connettiti con tecnici verificati nelle vicinanze in pochi secondi
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Perché Scegliere AI Repair Finder</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Risposta Immediata</h3>
              <p className="text-sm text-muted-foreground">Diagnosi AI in pochi secondi</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Tecnici Verificati</h3>
              <p className="text-sm text-muted-foreground">Tutti i tecnici sono verificati</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Pagamento Sicuro</h3>
              <p className="text-sm text-muted-foreground">Protezione pagamento in-app</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Garantito</h3>
              <p className="text-sm text-muted-foreground">Qualità del lavoro garantita</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Pronto a Risolvere il Tuo Problema?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Unisciti a migliaia di proprietari di casa che si affidano ad AI Repair Finder
          </p>
          <Link to="/diagnose" className="inline-block w-full max-w-sm px-4">
            <Button size="lg" variant="secondary" className="w-full h-14 sm:h-16 text-base sm:text-lg shadow-strong touch-manipulation active:scale-95 transition-transform">
              Inizia Ora
            </Button>
          </Link>
        </div>
      </section>
    </div>
    </MobileLayout>
  );
};

export default Index;
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
              Riparazioni Veloci con AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Scatta una foto del problema. Ottieni una diagnosi AI istantanea e connettiti con tecnici verificati in pochi minuti.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/diagnose">
                <Button size="lg" className="text-lg shadow-medium">
                  <Camera className="mr-2 h-5 w-5" />
                  Inizia Diagnosi
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg">
                  Accedi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Come Funziona</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-lg shadow-soft border border-border">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Camera className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Carica Foto</h3>
              <p className="text-muted-foreground">
                Scatta una foto o carica un'immagine del tuo problema di riparazione
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-soft border border-border">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Diagnosi AI</h3>
              <p className="text-muted-foreground">
                Ottieni un'analisi istantanea con stime di costo e livello di urgenza
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-lg shadow-soft border border-border">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Trova Tecnico</h3>
              <p className="text-muted-foreground">
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
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto a Risolvere il Tuo Problema?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Unisciti a migliaia di proprietari di casa che si affidano ad AI Repair Finder per riparazioni domestiche veloci e affidabili
          </p>
          <Link to="/diagnose">
            <Button size="lg" variant="secondary" className="text-lg shadow-strong">
              Inizia Ora
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
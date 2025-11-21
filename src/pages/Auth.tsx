import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Accesso Fallito",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Successo",
            description: "Accesso effettuato con successo",
          });
          navigate("/dashboard");
        }
      } else {
        if (!fullName) {
          toast({
            title: "Errore",
            description: "Inserisci il tuo nome completo",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          toast({
            title: "Registrazione Fallita",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Successo",
            description: "Account creato! Ora puoi accedere.",
          });
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore imprevisto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout showBottomNav={false}>
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            {isLogin ? "Bentornato" : "Crea Account"}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {isLogin
              ? "Accedi per accedere alla tua dashboard"
              : "Registrati per iniziare a diagnosticare"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm sm:text-base">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Mario Rossi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="h-11 sm:h-12 text-base"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tua@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 sm:h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 sm:h-12 text-base"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 sm:space-y-4">
            <Button 
              type="submit" 
              className="w-full h-12 sm:h-14 text-base sm:text-lg touch-manipulation active:scale-95 transition-transform" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />}
              {isLogin ? "Accedi" : "Crea Account"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 sm:h-12 text-sm sm:text-base touch-manipulation"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Non hai un account? Registrati"
                : "Hai già un account? Accedi"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
    </MobileLayout>
  );
};

export default Auth;
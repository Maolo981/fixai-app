import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Wrench, ArrowLeft, Upload, FileText, X } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";

type UserType = "user" | "technician" | null;

const Auth = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressDocument, setAddressDocument] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserType(session.user.id);
      }
    });
  }, [navigate]);

  const checkUserType = async (userId: string) => {
    const { data: technician } = await supabase
      .from("technicians")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (technician) {
      navigate("/technician-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const uploadAddressDocument = async (userId: string): Promise<string | null> => {
    if (!addressDocument) return null;

    const fileExt = addressDocument.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, addressDocument);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('identity-documents')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast({
            title: "Accesso Fallito",
            description: error.message,
            variant: "destructive",
          });
        } else if (data.user) {
          if (userType === "technician") {
            const { data: technician } = await supabase
              .from("technicians")
              .select("id")
              .eq("profile_id", data.user.id)
              .maybeSingle();

            if (!technician) {
              toast({
                title: "Accesso Negato",
                description: "Non sei registrato come tecnico. Registrati prima come tecnico.",
                variant: "destructive",
              });
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            navigate("/technician-dashboard");
          } else {
            navigate("/dashboard");
          }
          
          toast({
            title: "Successo",
            description: "Accesso effettuato con successo",
          });
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

        if (!phone) {
          toast({
            title: "Errore",
            description: "Inserisci il tuo numero di telefono",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data: authData, error } = await supabase.auth.signUp({
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
        } else if (authData.user) {
          // Upload document if provided
          let documentUrl = null;
          if (addressDocument) {
            setUploadingDoc(true);
            documentUrl = await uploadAddressDocument(authData.user.id);
            setUploadingDoc(false);
          }

          // Update profile with phone and document
          await supabase
            .from('profiles')
            .update({
              phone: phone,
              address_document_url: documentUrl,
            })
            .eq('id', authData.user.id);

          toast({
            title: "Successo",
            description: "Account creato! Ora puoi accedere.",
          });
          
          if (userType === "technician") {
            navigate("/tech-signup");
          } else {
            navigate("/dashboard");
          }
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
      setUploadingDoc(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Formato non valido",
          description: "Carica un file PDF o immagine (JPG, PNG, WEBP)",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File troppo grande",
          description: "Il file non può superare i 10MB",
          variant: "destructive",
        });
        return;
      }
      setAddressDocument(file);
    }
  };

  // User type selection screen
  if (!userType) {
    return (
      <MobileLayout showBottomNav={false}>
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6">
          <Card className="w-full max-w-md shadow-medium">
            <CardHeader className="text-center">
              <CardTitle className="text-xl sm:text-2xl">Benvenuto</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Come vuoi accedere?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all"
                onClick={() => setUserType("user")}
              >
                <User className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Utente</p>
                  <p className="text-xs text-muted-foreground">Cerca un tecnico per le tue riparazioni</p>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-secondary/50 hover:border-secondary transition-all"
                onClick={() => setUserType("technician")}
              >
                <Wrench className="h-8 w-8 text-secondary-foreground" />
                <div className="text-center">
                  <p className="font-semibold">Tecnico</p>
                  <p className="text-xs text-muted-foreground">Gestisci le tue richieste di lavoro</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav={false}>
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6">
        <Card className="w-full max-w-md shadow-medium">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 mb-2"
              onClick={() => setUserType(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Indietro
            </Button>
            <div className="flex items-center gap-2 mb-2">
              {userType === "user" ? (
                <User className="h-5 w-5 text-primary" />
              ) : (
                <Wrench className="h-5 w-5 text-secondary-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {userType === "user" ? "Area Utente" : "Area Tecnico"}
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl">
              {isLogin ? "Bentornato" : "Crea Account"}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {isLogin
                ? "Accedi per accedere alla tua dashboard"
                : userType === "technician" 
                  ? "Registrati per diventare un tecnico"
                  : "Registrati per iniziare a diagnosticare"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm sm:text-base">Nome Completo *</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm sm:text-base">Numero di Telefono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+39 333 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={!isLogin}
                      className="h-11 sm:h-12 text-base"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Email *</Label>
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
                <Label htmlFor="password" className="text-sm sm:text-base">Password *</Label>
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
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Documento di Residenza</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Carica un documento che attesti il tuo indirizzo (bolletta, documento d'identità, etc.)
                  </p>
                  {addressDocument ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm flex-1 truncate">{addressDocument.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddressDocument(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-sm text-muted-foreground">Clicca per caricare</span>
                      <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 sm:space-y-4">
              <Button 
                type="submit" 
                className="w-full h-12 sm:h-14 text-base sm:text-lg touch-manipulation active:scale-95 transition-transform" 
                disabled={loading || uploadingDoc}
              >
                {(loading || uploadingDoc) && <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />}
                {uploadingDoc ? "Caricamento documento..." : isLogin ? "Accedi" : "Crea Account"}
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

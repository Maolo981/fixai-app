import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Wrench, ArrowLeft, Upload, FileText, X, Building2, Sparkles } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { motion, AnimatePresence } from "framer-motion";

type UserType = "user" | "technician" | "company" | null;

const Auth = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [addressDocument, setAddressDocument] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Only auto-redirect if NOT actively logging in
    if (isLoggingIn) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !userType) {
        // Only auto-detect if no userType selected (returning user)
        checkUserType(session.user.id);
      }
    });
  }, [navigate, isLoggingIn, userType]);

  const checkUserType = async (userId: string) => {
    // Check if user owns a company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (company) {
      navigate("/company-dashboard");
      return;
    }

    const { data: technician } = await supabase
      .from("technicians")
      .select("id, company_id")
      .eq("profile_id", userId)
      .maybeSingle();

    if (technician) {
      if (technician.company_id) {
        navigate("/technician-dashboard");
      } else {
        navigate("/technician-dashboard");
      }
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
    setIsLoggingIn(true);

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
          setIsLoggingIn(false);
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
          } else if (userType === "company") {
            const { data: company } = await supabase
              .from("companies")
              .select("id")
              .eq("owner_id", data.user.id)
              .maybeSingle();

            if (!company) {
              toast({
                title: "Accesso Negato",
                description: "Non sei registrato come azienda. Registrati prima come azienda.",
                variant: "destructive",
              });
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            navigate("/company-dashboard");
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

        if (userType === "company" && !companyName) {
          toast({
            title: "Errore",
            description: "Inserisci il nome dell'azienda",
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
          
          if (userType === "company") {
            // Create the company
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .insert({
                name: companyName,
                owner_id: authData.user.id,
                phone: phone,
                email: email,
                vat_number: vatNumber || null,
              })
              .select()
              .single();

            if (companyError) {
              toast({
                title: "Errore",
                description: "Errore nella creazione dell'azienda",
                variant: "destructive",
              });
            } else {
              navigate("/company-dashboard");
            }
          } else if (userType === "technician") {
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
      setIsLoggingIn(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Formato non valido",
          description: "Carica un file PDF o immagine (JPG, PNG, WEBP)",
          variant: "destructive",
        });
        return;
      }
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  } as const;

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
  } as const;

  const buttonHoverVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  } as const;

  // User type selection screen
  if (!userType) {
    return (
      <MobileLayout showBottomNav={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4 py-6 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key="user-type-selection"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md relative z-10"
            >
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-2">
                  <motion.div variants={itemVariants}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit mx-auto mb-4 hover:bg-primary/10"
                      onClick={() => navigate("/")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Torna alla Home
                    </Button>
                  </motion.div>
                  
                  <motion.div 
                    variants={itemVariants}
                    className="flex justify-center mb-4"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg"
                      >
                        <Sparkles className="h-8 w-8 text-primary-foreground" />
                      </motion.div>
                      <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl" />
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Benvenuto
                    </CardTitle>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <CardDescription className="text-base">
                      Come vuoi accedere?
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                
                <CardContent className="space-y-4 pt-4">
                  <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    {/* Utente */}
                    <motion.div variants={itemVariants} className="mb-4">
                      <motion.div
                        variants={buttonHoverVariants}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          variant="outline"
                          className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all border-2"
                          onClick={() => setUserType("user")}
                        >
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            <User className="h-8 w-8 text-primary" />
                          </motion.div>
                          <div className="text-center">
                            <p className="font-semibold">Utente</p>
                            <p className="text-xs text-muted-foreground">Cerca un tecnico per le tue riparazioni</p>
                          </div>
                        </Button>
                      </motion.div>
                    </motion.div>
                    
                    {/* Tecnico */}
                    <motion.div variants={itemVariants} className="mb-4">
                      <motion.div
                        variants={buttonHoverVariants}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          variant="outline"
                          className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-500/10 hover:border-blue-500 transition-all border-2"
                          onClick={() => {
                            setUserType("technician");
                            setIsLogin(true);
                          }}
                        >
                          <motion.div
                            whileHover={{ rotate: 45 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Wrench className="h-8 w-8 text-blue-500" />
                          </motion.div>
                          <div className="text-center">
                            <p className="font-semibold">Tecnico / Libero Professionista</p>
                            <p className="text-xs text-muted-foreground">Gestisci le tue richieste di lavoro</p>
                          </div>
                        </Button>
                      </motion.div>
                    </motion.div>

                    {/* Azienda */}
                    <motion.div variants={itemVariants}>
                      <motion.div
                        variants={buttonHoverVariants}
                        initial="rest"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          variant="outline"
                          className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-500/10 hover:border-orange-500 transition-all border-2"
                          onClick={() => setUserType("company")}
                        >
                          <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <Building2 className="h-8 w-8 text-orange-500" />
                          </motion.div>
                          <div className="text-center">
                            <p className="font-semibold">Azienda</p>
                            <p className="text-xs text-muted-foreground">Gestisci un team di tecnici</p>
                          </div>
                        </Button>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-4 py-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={`login-form-${userType}-${isLogin}`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md relative z-10"
          >
            <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit -ml-2 mb-2 hover:bg-primary/10"
                    onClick={() => setUserType(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Indietro
                  </Button>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-2 mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    {userType === "user" ? (
                      <User className="h-5 w-5 text-primary" />
                    ) : userType === "company" ? (
                      <Building2 className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Wrench className="h-5 w-5 text-blue-500" />
                    )}
                  </motion.div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {userType === "user" ? "Area Utente" : userType === "company" ? "Area Azienda" : "Area Tecnico"}
                  </span>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <CardTitle className="text-xl sm:text-2xl">
                    {isLogin ? "Bentornato" : "Crea Account"}
                  </CardTitle>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <CardDescription className="text-sm sm:text-base">
                    {isLogin
                      ? "Accedi per accedere alla tua dashboard"
                      : userType === "technician" 
                        ? "Registrati per diventare un tecnico"
                        : userType === "company"
                        ? "Registra la tua azienda"
                        : "Registrati per iniziare a diagnosticare"}
                  </CardDescription>
                </motion.div>
              </CardHeader>
              
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    <AnimatePresence mode="wait">
                      {!isLogin && (
                        <motion.div
                          key="signup-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          {userType === "company" && (
                            <>
                              <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="companyName" className="text-sm sm:text-base">Nome Azienda *</Label>
                                <Input
                                  id="companyName"
                                  type="text"
                                  placeholder="La Mia Azienda S.r.l."
                                  value={companyName}
                                  onChange={(e) => setCompanyName(e.target.value)}
                                  required
                                  className="h-11 sm:h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                                />
                              </motion.div>
                              <motion.div variants={itemVariants} className="space-y-2">
                                <Label htmlFor="vatNumber" className="text-sm sm:text-base">Partita IVA</Label>
                                <Input
                                  id="vatNumber"
                                  type="text"
                                  placeholder="IT12345678901"
                                  value={vatNumber}
                                  onChange={(e) => setVatNumber(e.target.value)}
                                  className="h-11 sm:h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                                />
                              </motion.div>
                            </>
                          )}
                          <motion.div variants={itemVariants} className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm sm:text-base">
                              {userType === "company" ? "Nome Responsabile *" : "Nome Completo *"}
                            </Label>
                            <Input
                              id="fullName"
                              type="text"
                              placeholder="Mario Rossi"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              required={!isLogin}
                              className="h-11 sm:h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                            />
                          </motion.div>
                          <motion.div variants={itemVariants} className="space-y-2">
                            <Label htmlFor="phone" className="text-sm sm:text-base">Numero di Telefono *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="+39 333 1234567"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              required={!isLogin}
                              className="h-11 sm:h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                            />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label htmlFor="email" className="text-sm sm:text-base">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="tua@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 sm:h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </motion.div>
                    
                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label htmlFor="password" className="text-sm sm:text-base">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 sm:h-12 text-base transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </motion.div>
                    
                    <AnimatePresence>
                      {!isLogin && userType !== "company" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <Label className="text-sm sm:text-base">Documento di Residenza</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Carica un documento che attesti il tuo indirizzo (bolletta, documento d'identità, etc.)
                          </p>
                          {addressDocument ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                            >
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
                            </motion.div>
                          ) : (
                            <motion.label 
                              whileHover={{ scale: 1.01, borderColor: "hsl(var(--primary))" }}
                              whileTap={{ scale: 0.99 }}
                              className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                              <span className="text-sm text-muted-foreground">Clicca per caricare</span>
                              <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={handleFileChange}
                              />
                            </motion.label>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </CardContent>
                
                <CardFooter className="flex flex-col space-y-3 sm:space-y-4">
                  <motion.div 
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-12 sm:h-14 text-base sm:text-lg touch-manipulation transition-all shadow-lg hover:shadow-xl" 
                      disabled={loading || uploadingDoc}
                    >
                      {(loading || uploadingDoc) && <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />}
                      {uploadingDoc ? "Caricamento documento..." : isLogin ? "Accedi" : "Crea Account"}
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="w-full"
                  >
                    {userType === "technician" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-11 sm:h-12 text-sm sm:text-base touch-manipulation hover:bg-primary/10"
                        onClick={() => navigate("/tech-signup")}
                      >
                        Non hai un account? Registrati come Tecnico
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-11 sm:h-12 text-sm sm:text-base touch-manipulation hover:bg-primary/10"
                        onClick={() => setIsLogin(!isLogin)}
                      >
                        {isLogin
                          ? "Non hai un account? Registrati"
                          : "Hai già un account? Accedi"}
                      </Button>
                    )}
                  </motion.div>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
};

export default Auth;

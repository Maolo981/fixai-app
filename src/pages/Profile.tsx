import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Mail, Calendar, MapPin, Bell } from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported } = usePushNotifications(user?.id);

  useEffect(() => {
    checkUser();
    loadProfile();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }
    
    setUser(session.user);
    setLoading(false);
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        }
        
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Disconnesso",
      description: "Sei stato disconnesso con successo",
    });
    navigate("/");
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-muted/30 py-6 sm:py-12 px-4">
          <div className="container max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-muted/30 py-6 sm:py-12 px-4">
        <div className="container max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-hero rounded-full flex items-center justify-center mx-auto shadow-medium">
              <User className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Il Tuo Profilo</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestisci le tue informazioni personali
            </p>
          </div>

          {/* User Info */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Informazioni Account</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                I tuoi dati personali e di accesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {profile?.full_name && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Nome Completo</p>
                    <p className="text-base sm:text-lg font-semibold truncate">{profile.full_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base sm:text-lg font-semibold break-all">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Membro dal</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {new Date(user?.created_at).toLocaleDateString('it-IT', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {profile?.latitude && profile?.longitude && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">Posizione</p>
                    <p className="text-sm sm:text-base text-green-600 dark:text-green-400 font-medium">
                      ✓ Posizione salvata
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aggiornata il {new Date(profile.location_updated_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Bell className="h-5 w-5" />
                Notifiche Push
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Ricevi aggiornamenti in tempo reale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSupported ? (
                <p className="text-sm text-muted-foreground">
                  Il tuo browser non supporta le notifiche push
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Ricevi notifiche per aggiornamenti sui tuoi lavori, nuovi messaggi e preventivi
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        Stato: {permission === "granted" ? "✅ Attive" : "❌ Disattivate"}
                      </p>
                    </div>
                    {permission !== "granted" && (
                      <Button onClick={requestPermission} size="sm">
                        Attiva Notifiche
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Technician Dashboard Link */}
          {profile?.is_technician && (
            <Card className="shadow-medium border-primary">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Dashboard Tecnico</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Gestisci i tuoi lavori e preventivi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate("/technician-dashboard")}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg"
                >
                  Apri Dashboard Tecnico
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="shadow-soft bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base sm:text-lg">Zona Pericolosa</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Azioni permanenti sul tuo account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                className="w-full h-12 sm:h-14 text-base sm:text-lg touch-manipulation active:scale-95 transition-transform"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                Disconnetti
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Profile;

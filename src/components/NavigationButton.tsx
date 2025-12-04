import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, ExternalLink, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavigationButtonProps {
  userId: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

interface UserLocation {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function NavigationButton({
  userId,
  className,
  variant = "default",
  size = "default",
}: NavigationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const { toast } = useToast();

  const handleNavigation = async () => {
    setLoading(true);

    try {
      // Get user's profile with address and coordinates
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("address, latitude, longitude")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (!profile?.address && !profile?.latitude) {
        toast({
          title: "Indirizzo non disponibile",
          description: "Il cliente non ha ancora inserito l'indirizzo",
          variant: "destructive",
        });
        return;
      }

      setUserLocation({
        address: profile.address,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
      setShowOptions(true);
    } catch (error: any) {
      console.error("Error fetching user location:", error);
      toast({
        title: "Errore",
        description: "Impossibile recuperare l'indirizzo del cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = () => {
    if (!userLocation) return;

    let url: string;
    if (userLocation.latitude && userLocation.longitude) {
      // Use coordinates for precise navigation
      url = `https://www.google.com/maps/dir/?api=1&destination=${userLocation.latitude},${userLocation.longitude}&travelmode=driving`;
    } else if (userLocation.address) {
      // Fall back to address
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(userLocation.address)}&travelmode=driving`;
    } else {
      return;
    }

    window.open(url, "_blank");
    setShowOptions(false);
  };

  const openAppleMaps = () => {
    if (!userLocation) return;

    let url: string;
    if (userLocation.latitude && userLocation.longitude) {
      url = `maps://maps.apple.com/?daddr=${userLocation.latitude},${userLocation.longitude}&dirflg=d`;
    } else if (userLocation.address) {
      url = `maps://maps.apple.com/?daddr=${encodeURIComponent(userLocation.address)}&dirflg=d`;
    } else {
      return;
    }

    // Try Apple Maps first, fall back to Google Maps URL for non-Apple devices
    const link = document.createElement("a");
    link.href = url;
    link.click();
    setShowOptions(false);
  };

  const openWaze = () => {
    if (!userLocation) return;

    let url: string;
    if (userLocation.latitude && userLocation.longitude) {
      url = `https://waze.com/ul?ll=${userLocation.latitude},${userLocation.longitude}&navigate=yes`;
    } else if (userLocation.address) {
      url = `https://waze.com/ul?q=${encodeURIComponent(userLocation.address)}&navigate=yes`;
    } else {
      return;
    }

    window.open(url, "_blank");
    setShowOptions(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleNavigation}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Navigation className="h-4 w-4 mr-2" />
        )}
        Naviga
      </Button>

      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Scegli App di Navigazione
            </DialogTitle>
            <DialogDescription>
              {userLocation?.address && (
                <span className="block mt-2 text-sm">
                  <strong>Destinazione:</strong> {userLocation.address}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={openGoogleMaps}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <img
                    src="https://maps.google.com/favicon.ico"
                    alt="Google Maps"
                    className="w-6 h-6"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="text-left">
                  <div className="font-medium">Google Maps</div>
                  <div className="text-xs text-muted-foreground">
                    Navigazione con traffico in tempo reale
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={openAppleMaps}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Apple Maps</div>
                  <div className="text-xs text-muted-foreground">
                    Per dispositivi Apple
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-14"
              onClick={openWaze}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Navigation className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Waze</div>
                  <div className="text-xs text-muted-foreground">
                    Community-based navigation
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

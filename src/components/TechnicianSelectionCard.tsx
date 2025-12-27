import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, CheckCircle2 } from "lucide-react";

interface Technician {
  id: string;
  full_name: string;
  specialties: string[];
  hourly_rate: number;
  rating: number;
  total_jobs: number;
  distance_km?: number;
  avatar_url?: string;
  availability_status?: string;
  verified?: boolean;
}

interface TechnicianSelectionCardProps {
  technician: Technician;
  recommendedSpecialty: string;
  onSelect: (technician: Technician) => void;
  onViewReviews: (technician: Technician) => void;
}

const formatDistance = (distance: number | undefined) => {
  if (!distance) return null;
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

const renderStars = (rating: number) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400/50 text-yellow-400" />
      );
    } else {
      stars.push(
        <Star key={i} className="h-3.5 w-3.5 text-muted-foreground/30" />
      );
    }
  }
  return stars;
};

export const TechnicianSelectionCard = ({ 
  technician, 
  recommendedSpecialty,
  onSelect, 
  onViewReviews 
}: TechnicianSelectionCardProps) => {
  return (
    <Card className="bg-card border-border touch-manipulation hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="shrink-0 relative">
            {technician.avatar_url ? (
              <img 
                src={technician.avatar_url} 
                alt={technician.full_name}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
            )}
            {/* Badge verificato */}
            {technician.verified !== false && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base sm:text-lg truncate">{technician.full_name}</CardTitle>
            </div>
            
            {/* Specializzazione principale */}
            <CardDescription className="text-xs sm:text-sm font-medium text-primary mb-1">
              {technician.specialties[0] || 'Tecnico generico'}
            </CardDescription>
            
            {/* Riga informativa neutra */}
            <p className="text-xs text-muted-foreground mb-2">
              Professionista adatto per interventi di {recommendedSpecialty.toLowerCase()}
            </p>
            
            {/* Rating con stelle */}
            <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onViewReviews(technician); }}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-0.5">
                  {renderStars(technician.rating)}
                </div>
                <span className="text-sm font-semibold">{technician.rating.toFixed(1)}</span>
              </button>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{technician.total_jobs} lavori completati</span>
            </div>
            
            {/* Badges info */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Prezzo */}
              <Badge variant="secondary" className="text-xs">
                €{technician.hourly_rate}/ora
              </Badge>
              
              {/* Distanza */}
              {technician.distance_km && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">{formatDistance(technician.distance_km)}</span>
                </Badge>
              )}
              
              {/* Disponibilità */}
              {technician.availability_status === 'available' ? (
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs">Disponibile</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs">Non disponibile</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          className="w-full h-11 touch-manipulation active:scale-95 transition-transform"
          onClick={() => onSelect(technician)}
        >
          Seleziona tecnico
        </Button>
      </CardContent>
    </Card>
  );
};

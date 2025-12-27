import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Star, 
  MapPin, 
  CheckCircle,
  Clock,
  Shield
} from "lucide-react";

const DEMO_TECHNICIANS = [
  {
    id: 1,
    name: "Marco Rossi",
    avatar: null,
    rating: 4.9,
    reviews: 127,
    distance: "2.3 km",
    specialties: ["Caldaie", "Idraulica"],
    hourlyRate: 45,
    verified: true,
    available: true,
  },
  {
    id: 2,
    name: "Luca Bianchi",
    avatar: null,
    rating: 4.7,
    reviews: 89,
    distance: "4.1 km",
    specialties: ["Caldaie", "Climatizzazione"],
    hourlyRate: 50,
    verified: true,
    available: true,
  },
  {
    id: 3,
    name: "Giuseppe Verdi",
    avatar: null,
    rating: 4.5,
    reviews: 56,
    distance: "5.8 km",
    specialties: ["Caldaie", "Gas"],
    hourlyRate: 40,
    verified: false,
    available: false,
  },
];

export function DemoPhase2() {
  return (
    <div className="space-y-4">
      {/* Filter Info */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <MapPin className="h-4 w-4" />
            <span>3 tecnici trovati nel raggio di 10 km</span>
          </div>
        </CardContent>
      </Card>

      {/* Technicians List */}
      {DEMO_TECHNICIANS.map((tech, index) => (
        <Card 
          key={tech.id} 
          className={`transition-all ${
            index === 0 
              ? "border-2 border-primary ring-2 ring-primary/20" 
              : ""
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="h-14 w-14">
                <AvatarImage src={tech.avatar || undefined} />
                <AvatarFallback className="text-lg bg-primary/10">
                  {tech.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{tech.name}</span>
                  {tech.verified && (
                    <Shield className="h-4 w-4 text-green-500" />
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 text-sm mb-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium ml-1">{tech.rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({tech.reviews} recensioni)
                  </span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {tech.specialties.map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {tech.distance}
                  </span>
                  <span>€{tech.hourlyRate}/ora</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-4 flex gap-2">
              {tech.available ? (
                <>
                  <Button 
                    className="flex-1" 
                    variant={index === 0 ? "default" : "outline"}
                    disabled
                  >
                    {index === 0 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Selezionato
                      </>
                    ) : (
                      "Seleziona"
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" disabled>
                    <Star className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button className="flex-1" variant="outline" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Non disponibile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Selection Info */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Marco Rossi selezionato</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        ⬆️ Il cliente confronta i tecnici e ne sceglie uno
      </p>
    </div>
  );
}

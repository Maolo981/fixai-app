import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, DollarSign, Wrench, ArrowLeft, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Diagnosis {
  id: string;
  problem_type: string;
  urgency_level: string;
  possible_cause: string;
  estimated_cost_min: number;
  estimated_cost_max: number;
  estimated_time_hours: number;
  recommended_specialty: string;
  ai_analysis: string;
  image_url: string;
}

interface Technician {
  id: string;
  full_name: string;
  specialties: string[];
  hourly_rate: number;
  rating: number;
  total_jobs: number;
}

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiagnosis();
    loadTechnicians();
  }, [id]);

  const loadDiagnosis = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDiagnosis(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load diagnosis",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('verified', true)
        .limit(3);

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      console.error("Error loading technicians:", error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'bg-urgency-high';
      case 'medium':
        return 'bg-urgency-medium';
      case 'low':
        return 'bg-urgency-low';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="container max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!diagnosis) return null;

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{diagnosis.problem_type}</h1>
          <Badge className={`${getUrgencyColor(diagnosis.urgency_level)} text-white`}>
            {diagnosis.urgency_level.toUpperCase()} URGENCY
          </Badge>
        </div>

        {/* Image */}
        <Card className="overflow-hidden shadow-medium">
          <img 
            src={diagnosis.image_url} 
            alt="Repair issue" 
            className="w-full h-64 object-cover"
          />
        </Card>

        {/* Key Details */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-primary" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${diagnosis.estimated_cost_min} - ${diagnosis.estimated_cost_max}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                Estimated Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {diagnosis.estimated_time_hours} {diagnosis.estimated_time_hours === 1 ? 'hour' : 'hours'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Wrench className="mr-2 h-4 w-4 text-primary" />
                Specialty Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{diagnosis.recommended_specialty}</p>
            </CardContent>
          </Card>
        </div>

        {/* Analysis */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Possible Cause:</h3>
              <p className="text-muted-foreground">{diagnosis.possible_cause}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Detailed Analysis:</h3>
              <p className="text-muted-foreground whitespace-pre-line">{diagnosis.ai_analysis}</p>
            </div>
          </CardContent>
        </Card>

        {/* Matched Technicians */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-secondary" />
              Recommended Technicians
            </CardTitle>
            <CardDescription>
              Top-rated technicians available in your area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {technicians.map((tech) => (
              <Card key={tech.id} className="bg-gradient-card border-border">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tech.full_name}</CardTitle>
                      <CardDescription>
                        {tech.specialties.join(', ')}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">⭐ {tech.rating}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {tech.total_jobs} jobs completed • ${tech.hourly_rate}/hr
                    </div>
                    <Button>Book Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Results;
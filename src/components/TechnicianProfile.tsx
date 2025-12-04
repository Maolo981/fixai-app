import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  Camera, 
  Award, 
  Euro, 
  Plus, 
  X, 
  Save, 
  Loader2,
  Image as ImageIcon,
  Briefcase,
  MapPin,
  Star
} from 'lucide-react';

interface Certification {
  name: string;
  year: string;
}

interface ServicePrice {
  service: string;
  price: number;
}

interface TechnicianProfileProps {
  technicianId: string;
}

export const TechnicianProfile = ({ technicianId }: TechnicianProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Profile data
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [serviceRadius, setServiceRadius] = useState<number>(10);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [totalJobs, setTotalJobs] = useState<number>(0);

  // New item inputs
  const [newCertName, setNewCertName] = useState('');
  const [newCertYear, setNewCertYear] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  const availableSpecialties = [
    'Idraulica', 'Elettricità', 'Climatizzazione', 'Elettrodomestici',
    'Caldaie', 'Serrature', 'Falegnameria', 'Imbiancatura'
  ];

  useEffect(() => {
    fetchProfile();
  }, [technicianId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', technicianId)
        .single();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || '');
        setBio((data as any).bio || '');
        setHourlyRate(data.hourly_rate || 0);
        setServiceRadius(data.service_radius_km || 10);
        setSpecialties(data.specialties || []);
        setPortfolioImages((data as any).portfolio_images || []);
        setCertifications((data as any).certifications || []);
        setServicePrices((data as any).service_prices || []);
        setAvatarUrl(data.avatar_url);
        setRating(data.rating || 0);
        setTotalJobs(data.total_jobs || 0);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Errore nel caricamento del profilo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('technicians')
        .update({
          full_name: fullName,
          bio: bio,
          hourly_rate: hourlyRate,
          service_radius_km: serviceRadius,
          specialties: specialties,
          certifications: certifications,
          service_prices: servicePrices,
        } as any)
        .eq('id', technicianId);

      if (error) throw error;

      toast.success('Profilo aggiornato con successo!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Errore nel salvataggio del profilo');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${technicianId}-avatar-${Date.now()}.${fileExt}`;
      const filePath = `technician-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('repair-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('repair-images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('technicians')
        .update({ avatar_url: publicUrl })
        .eq('id', technicianId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Foto profilo aggiornata!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Errore nel caricamento della foto');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${technicianId}-portfolio-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `technician-portfolio/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('repair-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('repair-images')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      const updatedPortfolio = [...portfolioImages, ...newUrls];
      
      const { error: updateError } = await supabase
        .from('technicians')
        .update({ portfolio_images: updatedPortfolio } as any)
        .eq('id', technicianId);

      if (updateError) throw updateError;

      setPortfolioImages(updatedPortfolio);
      toast.success(`${newUrls.length} foto aggiunte al portfolio!`);
    } catch (error) {
      console.error('Error uploading portfolio:', error);
      toast.error('Errore nel caricamento delle foto');
    } finally {
      setUploadingImage(false);
    }
  };

  const removePortfolioImage = async (index: number) => {
    const updatedPortfolio = portfolioImages.filter((_, i) => i !== index);
    
    try {
      const { error } = await supabase
        .from('technicians')
        .update({ portfolio_images: updatedPortfolio } as any)
        .eq('id', technicianId);

      if (error) throw error;

      setPortfolioImages(updatedPortfolio);
      toast.success('Foto rimossa dal portfolio');
    } catch (error) {
      console.error('Error removing portfolio image:', error);
      toast.error('Errore nella rimozione della foto');
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setSpecialties(prev => 
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const addCertification = () => {
    if (!newCertName.trim() || !newCertYear.trim()) return;
    setCertifications([...certifications, { name: newCertName, year: newCertYear }]);
    setNewCertName('');
    setNewCertYear('');
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const addServicePrice = () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    setServicePrices([...servicePrices, { service: newServiceName, price: parseFloat(newServicePrice) }]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const removeServicePrice = (index: number) => {
    setServicePrices(servicePrices.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Avatar e Stats */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20" />
        <CardContent className="relative pt-0 -mt-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-background bg-muted overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">{fullName}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {totalJobs} lavori
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {serviceRadius} km
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informazioni Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informazioni Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Il tuo nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio e Descrizione Servizi</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descrivi la tua esperienza, i tuoi servizi e cosa ti rende unico..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Tariffa Oraria (€)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                placeholder="35"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceRadius">Raggio Servizio (km)</Label>
              <Input
                id="serviceRadius"
                type="number"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(parseInt(e.target.value) || 10)}
                placeholder="10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specializzazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Specializzazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableSpecialties.map((specialty) => (
              <Badge
                key={specialty}
                variant={specialties.includes(specialty) ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => toggleSpecialty(specialty)}
              >
                {specialty}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Portfolio Lavori
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {portfolioImages.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePortfolioImage(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
              {uploadingImage ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Aggiungi</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePortfolioUpload}
                disabled={uploadingImage}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Carica foto dei tuoi lavori completati per mostrare le tue competenze
          </p>
        </CardContent>
      </Card>

      {/* Certificazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certificazioni e Qualifiche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">{cert.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({cert.year})</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCertification(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Input
              placeholder="Nome certificazione"
              value={newCertName}
              onChange={(e) => setNewCertName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Anno"
              value={newCertYear}
              onChange={(e) => setNewCertYear(e.target.value)}
              className="w-24"
            />
            <Button onClick={addCertification} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prezzi Servizi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Prezzi Indicativi Servizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {servicePrices.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">{item.service}</span>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-semibold">€{item.price}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeServicePrice(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Input
              placeholder="Nome servizio"
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="€"
              type="number"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
              className="w-24"
            />
            <Button onClick={addServicePrice} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            I prezzi indicativi aiutano i clienti a farsi un'idea dei costi
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        className="w-full" 
        size="lg"
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvataggio...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Salva Profilo
          </>
        )}
      </Button>
    </div>
  );
};

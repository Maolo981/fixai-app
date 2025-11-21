import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeolocationState {
  coordinates: Coordinates | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        coordinates: null,
        error: 'La geolocalizzazione non è supportata dal tuo browser',
        loading: false,
      });
      return;
    }

    const successHandler = async (position: GeolocationPosition) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setState({
        coordinates: coords,
        error: null,
        loading: false,
      });

      // Save location to user profile
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({
              latitude: coords.latitude,
              longitude: coords.longitude,
              location_updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error saving location:', error);
      }
    };

    const errorHandler = (error: GeolocationPositionError) => {
      let errorMessage = 'Impossibile ottenere la tua posizione';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permesso di geolocalizzazione negato';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Informazioni sulla posizione non disponibili';
          break;
        case error.TIMEOUT:
          errorMessage = 'Richiesta di posizione scaduta';
          break;
      }

      setState({
        coordinates: null,
        error: errorMessage,
        loading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    });
  }, []);

  const refreshLocation = () => {
    setState(prev => ({ ...prev, loading: true }));
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setState({
          coordinates: coords,
          error: null,
          loading: false,
        });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
                location_updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);
          }
        } catch (error) {
          console.error('Error saving location:', error);
        }
      },
      (error) => {
        let errorMessage = 'Impossibile ottenere la tua posizione';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informazioni sulla posizione non disponibili';
            break;
          case error.TIMEOUT:
            errorMessage = 'Richiesta di posizione scaduta';
            break;
        }

        setState({
          coordinates: null,
          error: errorMessage,
          loading: false,
        });
      }
    );
  };

  return {
    ...state,
    refreshLocation,
  };
};
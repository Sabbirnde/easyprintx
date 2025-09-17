import { useState, useEffect } from 'react';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface GeolocationHookResult {
  userLocation: LocationCoords | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
  calculateDistance: (shopLat: number, shopLng: number) => number;
}

const useGeolocation = (): GeolocationHookResult => {
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  };

  // Calculate distance between user and shop using Haversine formula
  const calculateDistance = (shopLat: number, shopLng: number): number => {
    if (!userLocation) return 0;

    const toRad = (value: number) => (value * Math.PI) / 180;
    
    const R = 6371; // Earth's radius in km
    const dLat = toRad(shopLat - userLocation.latitude);
    const dLng = toRad(shopLng - userLocation.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLocation.latitude)) * 
      Math.cos(toRad(shopLat)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  // Auto-request location on first mount
  useEffect(() => {
    requestLocation();
  }, []);

  return {
    userLocation,
    loading,
    error,
    requestLocation,
    calculateDistance
  };
};

export default useGeolocation;
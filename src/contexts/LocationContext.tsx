import { createContext, useContext, useEffect, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface LocationContextType {
  location: GeolocationCoordinates | null;
  error: string | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation(position.coords);
        setError(null);
        
        // Update user location in Firestore if sharing is enabled
        if (user && profile?.isSharingLocation) {
          const userRef = doc(db, 'users', user.uid);
          
          let lat = position.coords.latitude;
          let lng = position.coords.longitude;

          // Scramble location if Privacy Mode is active
          if (profile?.isPrivacyMode) {
            // Add a random offset (0.001 deg is approx 110m)
            // 0.005 deg offset provides a significant but still relatively local "scramble"
            lat += (Math.random() - 0.5) * 0.01;
            lng += (Math.random() - 0.5) * 0.01;
          }

          updateDoc(userRef, {
            'lastLocation': {
              lat,
              lng,
              timestamp: new Date().toISOString()
            },
            'isOnline': profile?.isPrivacyMode ? false : true,
            'lastSeen': new Date().toISOString()
          }).catch((error) => {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
          });
        }
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user, profile?.isSharingLocation]);

  return (
    <LocationContext.Provider value={{ location, error }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

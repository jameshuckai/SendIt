import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { offlineStorage, checkOnlineStatus, getCurrentPosition } from '@/lib/offline';

const ResortContext = createContext({});

export const useResort = () => useContext(ResortContext);

export function ResortProvider({ children }) {
  const { user, profile, updateProfile } = useAuth();
  const userId = user?.id;

  // Core state
  const [selectedResort, setSelectedResortState] = useState(null);
  const [detectedResort, setDetectedResort] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Resort lists
  const [allResorts, setAllResorts] = useState([]);
  const [recentResorts, setRecentResorts] = useState([]);
  const [myResorts, setMyResorts] = useState([]);

  // Load all resorts from Supabase
  const loadResorts = useCallback(async () => {
    try {
      // Try cache first for instant load
      const cached = await offlineStorage.getCachedResorts();
      if (cached && cached.length > 0) {
        setAllResorts(cached);
      }

      // Fetch fresh data if online
      if (checkOnlineStatus()) {
        const { data, error } = await supabase
          .from('ski_areas')
          .select('*')
          .order('name');

        if (!error && data) {
          setAllResorts(data);
          await offlineStorage.cacheResorts(data);
          return data;
        }
      }
      return cached || [];
    } catch (error) {
      console.error('Error loading resorts:', error);
      return [];
    }
  }, []);

  // Load user's recent resorts from logs
  const loadUserResorts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: recentData } = await supabase
        .from('user_logs')
        .select('ski_area_id, ski_areas(id, name, region, country), logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(50);

      if (recentData) {
        const resortMap = new Map();
        recentData.forEach(log => {
          if (log.ski_areas && !resortMap.has(log.ski_area_id)) {
            resortMap.set(log.ski_area_id, {
              ...log.ski_areas,
              last_visit: log.logged_at,
              visit_count: 0
            });
          }
          if (resortMap.has(log.ski_area_id)) {
            resortMap.get(log.ski_area_id).visit_count++;
          }
        });

        const recent = Array.from(resortMap.values()).slice(0, 5);
        setRecentResorts(recent);
        setMyResorts(Array.from(resortMap.values()));
      }
    } catch (error) {
      console.error('Error loading user resorts:', error);
    }
  }, [userId]);

  // Detect resort via GPS (silent, non-blocking)
  const detectResort = useCallback(async (resorts) => {
    const resortsToSearch = resorts || allResorts;
    if (resortsToSearch.length === 0) return null;

    setIsDetecting(true);
    try {
      const position = await getCurrentPosition();

      const { data, error } = await supabase.rpc('find_resort_by_location', {
        lat: position.lat,
        lng: position.lng
      });

      if (!error && data && data.length > 0 && data[0].distance_km < 50) {
        const detected = resortsToSearch.find(r => r.id === data[0].id);
        if (detected) {
          setDetectedResort(detected);
          return detected;
        }
      }
    } catch (error) {
      console.log('GPS detection failed (non-blocking):', error.message);
    } finally {
      setIsDetecting(false);
    }
    return null;
  }, [allResorts]);

  // Set selected resort with persistence to localStorage AND Supabase
  const setSelectedResort = useCallback(async (resort) => {
    setSelectedResortState(resort);

    if (resort?.id) {
      // Persist to localStorage immediately
      offlineStorage.setLastResort(resort.id);

      // Persist to Supabase profiles.home_resort_id
      if (userId && checkOnlineStatus()) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ home_resort_id: resort.id })
            .eq('id', userId);

          if (error) {
            console.error('Error saving home_resort_id:', error);
          }
        } catch (err) {
          console.error('Error persisting resort to profile:', err);
        }
      }
    }
  }, [userId]);

  // Initialize: load resorts, then restore selection
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      // Load all resorts first
      const resorts = await loadResorts();

      // Try to restore from localStorage first (instant)
      const lastResortId = offlineStorage.getLastResort();
      let restoredResort = null;

      if (lastResortId && resorts.length > 0) {
        restoredResort = resorts.find(r => r.id === lastResortId);
        if (restoredResort) {
          setSelectedResortState(restoredResort);
        }
      }

      // If no localStorage, try profile.home_resort_id
      if (!restoredResort && profile?.home_resort_id && resorts.length > 0) {
        restoredResort = resorts.find(r => r.id === profile.home_resort_id);
        if (restoredResort) {
          setSelectedResortState(restoredResort);
          // Sync to localStorage
          offlineStorage.setLastResort(restoredResort.id);
        }
      }

      // If still no resort and we have resorts, select the first one
      if (!restoredResort && resorts.length > 0) {
        setSelectedResortState(resorts[0]);
        offlineStorage.setLastResort(resorts[0].id);
      }

      setLoading(false);

      // GPS detection in background (non-blocking)
      detectResort(resorts);
    };

    initialize();
  }, [loadResorts, detectResort, profile?.home_resort_id]);

  // Load user resorts when userId changes
  useEffect(() => {
    if (userId) {
      loadUserResorts();
    }
  }, [userId, loadUserResorts]);

  return (
    <ResortContext.Provider value={{
      // Core state
      selectedResort,
      setSelectedResort,
      loading,

      // GPS detection
      detectedResort,
      isDetecting,
      detectResort,

      // Resort lists
      allResorts,
      recentResorts,
      myResorts,

      // Refresh functions
      loadResorts,
      loadUserResorts
    }}>
      {children}
    </ResortContext.Provider>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { offlineStorage, checkOnlineStatus, getCurrentPosition, generateSessionId, isToday, isThisSeason } from './offline';

// Hook for online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(checkOnlineStatus());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for resort detection and selection
export function useResortDetection(userId) {
  const [selectedResort, setSelectedResort] = useState(null);
  const [detectedResort, setDetectedResort] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [allResorts, setAllResorts] = useState([]);
  const [recentResorts, setRecentResorts] = useState([]);
  const [myResorts, setMyResorts] = useState([]);

  // Load all resorts
  const loadResorts = useCallback(async () => {
    try {
      // Try cache first
      const cached = await offlineStorage.getCachedResorts();
      if (cached.length > 0) {
        setAllResorts(cached);
      }

      // Fetch fresh data if online
      if (checkOnlineStatus()) {
        const { data } = await supabase
          .from('ski_areas')
          .select('*')
          .order('name');
        
        if (data) {
          setAllResorts(data);
          await offlineStorage.cacheResorts(data);
        }
      }
    } catch (error) {
      console.error('Error loading resorts:', error);
    }
  }, []);

  // Load user's recent and personal resorts
  const loadUserResorts = useCallback(async () => {
    if (!userId) return;

    try {
      // Get recent resorts from user_logs
      const { data: recentData } = await supabase
        .from('user_logs')
        .select('ski_area_id, ski_areas(id, name, region, country), logged_at')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(50);

      if (recentData) {
        // Get unique resorts with most recent visit
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

  // Detect resort via GPS
  const detectResort = useCallback(async () => {
    setIsDetecting(true);
    try {
      const position = await getCurrentPosition();
      
      // Call Supabase RPC to find nearest resort
      const { data, error } = await supabase.rpc('find_resort_by_location', {
        lat: position.lat,
        lng: position.lng
      });

      if (data && data.length > 0 && data[0].distance_km < 50) {
        // Found a resort within 50km
        const detected = allResorts.find(r => r.id === data[0].id);
        if (detected) {
          setDetectedResort(detected);
          return detected;
        }
      }
    } catch (error) {
      console.log('GPS detection failed:', error.message);
    } finally {
      setIsDetecting(false);
    }
    return null;
  }, [allResorts]);

  // Select a resort
  const selectResort = useCallback((resort) => {
    setSelectedResort(resort);
    if (resort?.id) {
      offlineStorage.setLastResort(resort.id);
    }
  }, []);

  // Initialize resort selection
  useEffect(() => {
    const initResort = async () => {
      await loadResorts();
      await loadUserResorts();

      // Try to load last used resort first
      const lastResortId = offlineStorage.getLastResort();
      if (lastResortId && allResorts.length > 0) {
        const lastResort = allResorts.find(r => r.id === lastResortId);
        if (lastResort) {
          setSelectedResort(lastResort);
        }
      }

      // Try GPS detection in background
      detectResort().then(detected => {
        if (detected && (!selectedResort || selectedResort.id !== detected.id)) {
          setDetectedResort(detected);
        }
      });
    };

    if (allResorts.length === 0) {
      loadResorts();
    }
    if (userId) {
      loadUserResorts();
    }
  }, [userId, loadResorts, loadUserResorts, detectResort, allResorts, selectedResort]);

  return {
    selectedResort,
    setSelectedResort: selectResort,
    detectedResort,
    isDetecting,
    allResorts,
    recentResorts,
    myResorts,
    loadResorts,
    detectResort
  };
}

// Hook for run logging checklist
export function useRunChecklist(userId, resortId) {
  const [runs, setRuns] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [bucketList, setBucketList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'season', 'lifetime', 'never'
  const isOnline = useOnlineStatus();

  // Load runs for resort
  const loadRuns = useCallback(async () => {
    if (!resortId) return;
    
    setIsLoading(true);
    try {
      // Try cache first
      const cached = await offlineStorage.getCachedRuns(resortId);
      if (cached) {
        setRuns(cached);
      }

      // Fetch fresh if online
      if (isOnline) {
        const { data } = await supabase
          .from('runs')
          .select('*')
          .eq('ski_area_id', resortId)
          .order('zone, name');
        
        if (data) {
          setRuns(data);
          await offlineStorage.cacheRuns(resortId, data);
        }
      }
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [resortId, isOnline]);

  // Load user's logs
  const loadUserLogs = useCallback(async () => {
    if (!userId) return;

    try {
      const cached = await offlineStorage.getCachedLogs(userId);
      if (cached.length > 0) {
        setUserLogs(cached);
      }

      if (isOnline) {
        const { data } = await supabase
          .from('user_logs')
          .select('*')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false });
        
        if (data) {
          setUserLogs(data);
          await offlineStorage.cacheLogs(userId, data);
        }
      }
    } catch (error) {
      console.error('Error loading user logs:', error);
    }
  }, [userId, isOnline]);

  // Load bucket list
  const loadBucketList = useCallback(async () => {
    if (!userId) return;

    try {
      const cached = await offlineStorage.getCachedBucketList(userId);
      if (cached.length > 0) {
        setBucketList(cached);
      }

      if (isOnline) {
        const { data } = await supabase
          .from('bucket_list')
          .select('*')
          .eq('user_id', userId)
          .eq('is_completed', false);
        
        if (data) {
          setBucketList(data);
          await offlineStorage.cacheBucketList(userId, data);
        }
      }
    } catch (error) {
      console.error('Error loading bucket list:', error);
    }
  }, [userId, isOnline]);

  // Get run status
  const getRunStatus = useCallback((runId) => {
    const runLogs = userLogs.filter(log => log.run_id === runId);
    
    if (runLogs.length === 0) return 'never';
    
    const hasToday = runLogs.some(log => isToday(log.logged_at));
    if (hasToday) return 'today';
    
    const hasSeason = runLogs.some(log => isThisSeason(log.logged_at));
    if (hasSeason) return 'season';
    
    return 'historical';
  }, [userLogs]);

  // Check if run is in bucket list
  const isInBucketList = useCallback((runId) => {
    return bucketList.some(item => item.run_id === runId);
  }, [bucketList]);

  // Log a run
  const logRun = useCallback(async (runId) => {
    if (!userId || !resortId) return { success: false, error: 'Missing user or resort' };

    const sessionId = generateSessionId(userId);
    const logEntry = {
      id: crypto.randomUUID(),
      user_id: userId,
      run_id: runId,
      ski_area_id: resortId,
      logged_at: new Date().toISOString(),
      session_id: sessionId
    };

    // Optimistic update
    setUserLogs(prev => [logEntry, ...prev]);

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('user_logs')
          .insert([logEntry]);
        
        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error('Error logging run:', error);
        // Add to sync queue for later
        await offlineStorage.addToSyncQueue(logEntry);
        return { success: true, queued: true };
      }
    } else {
      // Offline: add to sync queue
      await offlineStorage.addToSyncQueue(logEntry);
      return { success: true, queued: true };
    }
  }, [userId, resortId, isOnline]);

  // Log last run again
  const logLastRunAgain = useCallback(async () => {
    if (userLogs.length === 0) return { success: false, error: 'No previous runs' };
    const lastLog = userLogs[0];
    return await logRun(lastLog.run_id);
  }, [userLogs, logRun]);

  // Get filtered runs
  const getFilteredRuns = useCallback(() => {
    if (filter === 'all') return runs;

    return runs.filter(run => {
      const status = getRunStatus(run.id);
      switch (filter) {
        case 'today': return status === 'today';
        case 'season': return status === 'today' || status === 'season';
        case 'lifetime': return status !== 'never';
        case 'never': return status === 'never';
        default: return true;
      }
    });
  }, [runs, filter, getRunStatus]);

  // Group runs by zone
  const getGroupedRuns = useCallback(() => {
    const filtered = getFilteredRuns();
    const grouped = {};
    
    filtered.forEach(run => {
      const zone = run.zone || 'Other';
      if (!grouped[zone]) grouped[zone] = [];
      grouped[zone].push(run);
    });
    
    return grouped;
  }, [getFilteredRuns]);

  // Get today's log count for a run
  const getTodayCount = useCallback((runId) => {
    return userLogs.filter(log => 
      log.run_id === runId && isToday(log.logged_at)
    ).length;
  }, [userLogs]);

  useEffect(() => {
    loadRuns();
    loadUserLogs();
    loadBucketList();
  }, [loadRuns, loadUserLogs, loadBucketList]);

  return {
    runs,
    userLogs,
    bucketList,
    isLoading,
    filter,
    setFilter,
    getRunStatus,
    isInBucketList,
    logRun,
    logLastRunAgain,
    getFilteredRuns,
    getGroupedRuns,
    getTodayCount,
    refresh: () => {
      loadRuns();
      loadUserLogs();
      loadBucketList();
    }
  };
}

// Hook for syncing offline data
export function useSyncQueue(userId) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useOnlineStatus();

  const checkPending = useCallback(async () => {
    const queue = await offlineStorage.getSyncQueue();
    setPendingCount(queue.length);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const queue = await offlineStorage.getSyncQueue();
      if (queue.length === 0) return;

      // Batch insert
      const { error } = await supabase
        .from('user_logs')
        .insert(queue.map(item => ({
          user_id: item.user_id,
          run_id: item.run_id,
          ski_area_id: item.ski_area_id,
          logged_at: item.logged_at,
          session_id: item.session_id
        })));

      if (!error) {
        await offlineStorage.clearSyncQueue();
        setPendingCount(0);
        return { synced: queue.length };
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline, syncNow]);

  // Check pending on mount
  useEffect(() => {
    checkPending();
  }, [checkPending]);

  return {
    pendingCount,
    isSyncing,
    syncNow,
    checkPending
  };
}

// Hook for day summary
export function useDaySummary(userId, date = new Date()) {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const dateStr = date.toISOString().split('T')[0];

  const loadDaySummary = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Get logs for the day
      const { data: logsData } = await supabase
        .from('user_logs')
        .select('*, runs(name, difficulty, vertical_ft, zone)')
        .eq('user_id', userId)
        .gte('logged_at', `${dateStr}T00:00:00`)
        .lt('logged_at', `${dateStr}T23:59:59`)
        .order('logged_at');

      if (logsData) {
        setLogs(logsData);

        // Calculate stats
        const totalRuns = logsData.length;
        const totalVertical = logsData.reduce((sum, log) => 
          sum + (log.runs?.vertical_ft || 0), 0
        );
        const timeSpan = logsData.length > 0 ? {
          start: logsData[0].logged_at,
          end: logsData[logsData.length - 1].logged_at
        } : null;

        // Find first-time runs
        const runIds = logsData.map(l => l.run_id);
        const { data: priorLogs } = await supabase
          .from('user_logs')
          .select('run_id')
          .eq('user_id', userId)
          .in('run_id', runIds)
          .lt('logged_at', `${dateStr}T00:00:00`);

        const priorRunIds = new Set(priorLogs?.map(l => l.run_id) || []);
        const firstTimeRuns = logsData.filter(l => !priorRunIds.has(l.run_id));

        setStats({
          totalRuns,
          totalVertical,
          timeSpan,
          firstTimeRuns: firstTimeRuns.length,
          uniqueRuns: new Set(logsData.map(l => l.run_id)).size
        });
      }

      // Get day summary if exists
      const { data: summaryData } = await supabase
        .from('day_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('session_date', dateStr)
        .single();

      if (summaryData) {
        setSummary(summaryData);

        // Get photos
        const { data: photosData } = await supabase
          .from('day_photos')
          .select('*')
          .eq('day_summary_id', summaryData.id)
          .order('created_at');

        if (photosData) setPhotos(photosData);
      }
    } catch (error) {
      console.error('Error loading day summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateStr]);

  const saveSummary = useCallback(async (title, notes) => {
    if (!userId) return { success: false };

    try {
      const { data, error } = await supabase
        .from('day_summaries')
        .upsert({
          user_id: userId,
          session_date: dateStr,
          title,
          notes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,session_date' })
        .select()
        .single();

      if (error) throw error;
      setSummary(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error saving summary:', error);
      return { success: false, error };
    }
  }, [userId, dateStr]);

  const deleteLog = useCallback(async (logId) => {
    try {
      const { error } = await supabase
        .from('user_logs')
        .delete()
        .eq('id', logId);

      if (!error) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        loadDaySummary(); // Refresh stats
        return { success: true };
      }
    } catch (error) {
      console.error('Error deleting log:', error);
    }
    return { success: false };
  }, [loadDaySummary]);

  useEffect(() => {
    loadDaySummary();
  }, [loadDaySummary]);

  return {
    summary,
    logs,
    photos,
    stats,
    isLoading,
    saveSummary,
    deleteLog,
    refresh: loadDaySummary
  };
}

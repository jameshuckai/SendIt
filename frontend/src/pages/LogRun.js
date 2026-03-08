import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { ResortSelector } from '@/components/ResortSelector';
import { RunChecklist } from '@/components/RunChecklist';
import { RunDetailSheet } from '@/components/RunDetailSheet';
import { OfflineBanner } from '@/components/OfflineBanner';
import { supabase } from '@/lib/supabase';
import { useResortDetection, useRunChecklist, useSyncQueue, useOnlineStatus } from '@/lib/hooks';
import { offlineStorage } from '@/lib/offline';
import { MapPin, Mountain, ChevronDown, List, Map as MapIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LogRun() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const isOnline = useOnlineStatus();
  
  // Resort detection
  const {
    selectedResort,
    setSelectedResort,
    detectedResort,
    isDetecting,
    allResorts,
    recentResorts,
    myResorts
  } = useResortDetection(profile?.id);

  // Run checklist
  const {
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
    getGroupedRuns,
    getTodayCount,
    refresh
  } = useRunChecklist(profile?.id, selectedResort?.id);

  // Sync queue
  const { pendingCount, isSyncing, syncNow } = useSyncQueue(profile?.id);

  // UI state
  const [showResortSelector, setShowResortSelector] = useState(false);
  const [showRunDetail, setShowRunDetail] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [viewMode, setViewMode] = useState(() => offlineStorage.getViewPreference());

  // Get last logged run
  const lastLog = userLogs.length > 0 ? userLogs[0] : null;
  const lastRun = lastLog ? { ...lastLog, runs: runs.find(r => r.id === lastLog.run_id) } : null;

  // Handle resort selection
  const handleResortSelect = useCallback((resort) => {
    setSelectedResort(resort);
    setShowResortSelector(false);
  }, [setSelectedResort]);

  // Handle run tap (show detail)
  const handleRunTap = useCallback((run) => {
    setSelectedRun(run);
    setShowRunDetail(true);
  }, []);

  // Handle run log
  const handleLogRun = useCallback(async (runId) => {
    const run = runs.find(r => r.id === runId);
    const result = await logRun(runId);
    
    if (result.success) {
      toast.success(`Logged: ${run?.name || 'Run'} ✓`, {
        style: {
          background: 'rgba(26, 33, 38, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3px solid #00E676',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Manrope, sans-serif',
        },
      });
      
      if (result.queued) {
        // Show offline indicator
        toast.info('Saved offline — will sync when connected', {
          duration: 2000,
          style: {
            background: 'rgba(26, 33, 38, 0.95)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '12px',
            color: '#FF9800',
            fontFamily: 'Manrope, sans-serif',
          },
        });
      }
    }
  }, [runs, logRun]);

  // Handle log last run again
  const handleLogLastAgain = useCallback(async () => {
    const result = await logLastRunAgain();
    if (result.success && lastRun?.runs) {
      toast.success(`Logged: ${lastRun.runs.name} ✓`, {
        style: {
          background: 'rgba(26, 33, 38, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3px solid #00E676',
          borderRadius: '12px',
          color: 'white',
          fontFamily: 'Manrope, sans-serif',
        },
      });
    }
  }, [logLastRunAgain, lastRun]);

  // Handle bucket list toggle
  const handleToggleBucket = useCallback(async (runId) => {
    if (!profile?.id) return;
    
    const isIn = isInBucketList(runId);
    
    if (isIn) {
      await supabase
        .from('bucket_list')
        .delete()
        .eq('user_id', profile.id)
        .eq('run_id', runId);
      
      toast.success('Removed from bucket list');
    } else {
      await supabase
        .from('bucket_list')
        .insert([{ user_id: profile.id, run_id: runId }]);
      
      toast.success('Added to bucket list!');
    }
    
    refresh();
  }, [profile?.id, isInBucketList, refresh]);

  // Get user log count for a run
  const getUserLogCount = useCallback((runId) => {
    return userLogs.filter(log => log.run_id === runId).length;
  }, [userLogs]);

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    const newMode = viewMode === 'list' ? 'map' : 'list';
    setViewMode(newMode);
    offlineStorage.setViewPreference(newMode);
  }, [viewMode]);

  // Show resort selector if no resort selected and no recent resort
  useEffect(() => {
    if (!selectedResort && !offlineStorage.getLastResort() && allResorts.length > 0) {
      setShowResortSelector(true);
    }
  }, [selectedResort, allResorts]);

  // Auto-select first resort if none selected
  useEffect(() => {
    if (!selectedResort && allResorts.length > 0) {
      const lastResortId = offlineStorage.getLastResort();
      const lastResort = allResorts.find(r => r.id === lastResortId);
      if (lastResort) {
        setSelectedResort(lastResort);
      } else {
        setSelectedResort(allResorts[0]);
      }
    }
  }, [selectedResort, allResorts, setSelectedResort]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="log-run-page">
      <Header />
      
      {/* Offline Banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onSync={syncNow}
      />
      
      <div className="p-6">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Log a Run
        </h1>

        {/* Resort Selector Header */}
        <div className="mb-6">
          {/* Detected Resort Chip */}
          {detectedResort && selectedResort?.id !== detectedResort.id && (
            <button
              onClick={() => handleResortSelect(detectedResort)}
              className="flex items-center gap-2 px-3 py-2 rounded-full mb-3 transition-all hover:bg-white/10"
              style={{
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                border: '1px solid rgba(0, 180, 216, 0.3)'
              }}
            >
              <MapPin size={14} style={{ color: '#00B4D8' }} />
              <span className="text-xs" style={{ color: '#00B4D8', fontFamily: 'Manrope, sans-serif' }}>
                Detected: {detectedResort.name}
              </span>
              <span className="text-xs underline" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Switch
              </span>
            </button>
          )}

          {/* Selected Resort Card */}
          <GlassCard
            className="p-4 cursor-pointer transition-all hover:bg-white/10"
            onClick={() => setShowResortSelector(true)}
            data-testid="resort-selector-trigger"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 180, 216, 0.15)' }}
                >
                  {isDetecting ? (
                    <Loader2 size={24} className="animate-spin" style={{ color: '#00B4D8' }} />
                  ) : (
                    <Mountain size={24} style={{ color: '#00B4D8' }} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {selectedResort?.name || 'Select Resort'}
                  </h3>
                  {selectedResort && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {[selectedResort.region, selectedResort.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <ChevronDown size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </div>
          </GlassCard>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {runs.length} runs available
          </p>
          <div className="flex gap-1 p-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-full transition-all"
              style={{
                backgroundColor: viewMode === 'list' ? '#00B4D8' : 'transparent'
              }}
            >
              <List size={16} style={{ color: viewMode === 'list' ? '#000' : 'rgba(255,255,255,0.6)' }} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className="p-2 rounded-full transition-all"
              style={{
                backgroundColor: viewMode === 'map' ? '#00B4D8' : 'transparent'
              }}
            >
              <MapIcon size={16} style={{ color: viewMode === 'map' ? '#000' : 'rgba(255,255,255,0.6)' }} />
            </button>
          </div>
        </div>

        {/* Run Checklist */}
        {selectedResort && viewMode === 'list' && (
          <RunChecklist
            groupedRuns={getGroupedRuns()}
            getRunStatus={getRunStatus}
            isInBucketList={isInBucketList}
            getTodayCount={getTodayCount}
            onLogRun={handleLogRun}
            onRunTap={handleRunTap}
            filter={filter}
            setFilter={setFilter}
            onLogLastAgain={handleLogLastAgain}
            lastRun={lastRun}
            region={profile?.difficulty_region}
            isLoading={isLoading}
          />
        )}

        {/* Map View Placeholder */}
        {selectedResort && viewMode === 'map' && (
          <GlassCard className="p-8 text-center">
            <MapIcon size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Map View Coming Soon
            </h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Trail map with run geometries will be available when GeoJSON data is added
            </p>
          </GlassCard>
        )}

        {/* No Resort Selected */}
        {!selectedResort && !isLoading && (
          <GlassCard className="p-8 text-center">
            <Mountain size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Select a Resort
            </h3>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Choose a resort to start logging runs
            </p>
            <button
              onClick={() => setShowResortSelector(true)}
              className="px-6 py-3 rounded-full font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
                color: '#000',
                fontFamily: 'Manrope, sans-serif'
              }}
            >
              Browse Resorts
            </button>
          </GlassCard>
        )}
      </div>

      {/* Resort Selector Bottom Sheet */}
      <ResortSelector
        isOpen={showResortSelector}
        onClose={() => setShowResortSelector(false)}
        onSelect={handleResortSelect}
        allResorts={allResorts}
        recentResorts={recentResorts}
        myResorts={myResorts}
        selectedResort={selectedResort}
        detectedResort={detectedResort}
      />

      {/* Run Detail Sheet */}
      <RunDetailSheet
        run={selectedRun}
        isOpen={showRunDetail}
        onClose={() => setShowRunDetail(false)}
        onLog={handleLogRun}
        onToggleBucket={handleToggleBucket}
        isInBucket={selectedRun ? isInBucketList(selectedRun.id) : false}
        userLogCount={selectedRun ? getUserLogCount(selectedRun.id) : 0}
        status={selectedRun ? getRunStatus(selectedRun.id) : 'never'}
        region={profile?.difficulty_region}
      />

      <BottomNav />
    </div>
  );
}

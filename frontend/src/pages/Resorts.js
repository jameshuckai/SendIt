import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { supabase } from '@/lib/supabase';
import { Search, Heart, Mountain, Check } from 'lucide-react';

export default function Resorts() {
  const { profile } = useAuth();
  const { selectedResort, allResorts } = useResort();
  const navigate = useNavigate();
  
  // View mode state
  const [viewMode, setViewMode] = useState('runs'); // 'runs' or 'lifts'
  
  // Runs state
  const [runs, setRuns] = useState([]);
  const [filteredRuns, setFilteredRuns] = useState([]);
  const [bucketListIds, setBucketListIds] = useState([]);
  const [completedRunIds, setCompletedRunIds] = useState([]);
  
  // Lifts state
  const [lifts, setLifts] = useState([]);
  const [filteredLifts, setFilteredLifts] = useState([]);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [mountainFilter, setMountainFilter] = useState('');
  const [runTypeFilter, setRunTypeFilter] = useState('');
  
  // Refs to prevent duplicate fetches
  const runsLoadedForRef = useRef(null);
  const liftsLoadedForRef = useRef(null);
  const bucketLoadedRef = useRef(false);
  const completedLoadedRef = useRef(false);

  const loadRuns = useCallback(async () => {
    if (!selectedResort?.id) return;
    if (runsLoadedForRef.current === selectedResort.id) return;
    
    const { data } = await supabase
      .from('runs')
      .select('*')
      .eq('ski_area_id', selectedResort.id)
      .order('name');
    
    if (data) {
      setRuns(data);
      runsLoadedForRef.current = selectedResort.id;
    }
  }, [selectedResort?.id]);

  const loadLifts = useCallback(async () => {
    if (!selectedResort?.id) return;
    if (liftsLoadedForRef.current === selectedResort.id) return;
    
    const { data } = await supabase
      .from('lifts')
      .select('*')
      .eq('ski_area_id', selectedResort.id)
      .order('name');
    
    if (data) {
      setLifts(data);
      liftsLoadedForRef.current = selectedResort.id;
    }
  }, [selectedResort?.id]);

  const loadBucketList = useCallback(async () => {
    if (!profile?.id) return;
    if (bucketLoadedRef.current) return;
    
    const { data } = await supabase
      .from('bucket_list')
      .select('run_id')
      .eq('user_id', profile.id);
    
    if (data) {
      setBucketListIds(data.map(item => item.run_id));
      bucketLoadedRef.current = true;
    }
  }, [profile?.id]);

  const loadCompletedRuns = useCallback(async () => {
    if (!profile?.id) return;
    if (completedLoadedRef.current) return;
    
    const { data } = await supabase
      .from('user_logs')
      .select('run_id')
      .eq('user_id', profile.id);
    
    if (data) {
      // Get unique run IDs
      const uniqueRunIds = [...new Set(data.map(item => item.run_id))];
      setCompletedRunIds(uniqueRunIds);
      completedLoadedRef.current = true;
    }
  }, [profile?.id]);

  // Load data when selected resort changes
  useEffect(() => {
    if (selectedResort?.id) {
      // Reset refs if resort changed
      if (runsLoadedForRef.current !== selectedResort.id) {
        runsLoadedForRef.current = null;
        liftsLoadedForRef.current = null;
      }
      loadRuns();
      loadLifts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResort?.id]); // Only depend on selectedResort.id primitive

  // Load user data when profile becomes available
  useEffect(() => {
    if (profile?.id) {
      loadBucketList();
      loadCompletedRuns();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]); // Only depend on profile.id primitive

  // Filter when criteria change
  useEffect(() => {
    if (viewMode === 'runs') {
      filterRuns();
    } else {
      filterLifts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, lifts, searchQuery, difficultyFilter, mountainFilter, runTypeFilter, viewMode]);

  const filterRuns = () => {
    let filtered = runs;

    if (searchQuery) {
      filtered = filtered.filter(run => 
        run.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (difficultyFilter) {
      filtered = filtered.filter(run => run.difficulty === difficultyFilter);
    }

    if (runTypeFilter) {
      filtered = filtered.filter(run => run.run_type === runTypeFilter);
    }

    if (mountainFilter) {
      // Check both zone field and ski_area_id for mountain
      // Since all runs are from Whistler Blackcomb, filter by zone names
      const whistlerZones = ['Peak', 'Harmony'];
      const blackcombZones = ['Glacier', '7th Heaven', 'Showcase', 'Crystal', 'Garbanzo'];
      
      if (mountainFilter === 'Whistler') {
        filtered = filtered.filter(run => 
          run.zone && whistlerZones.some(z => run.zone.includes(z))
        );
      } else if (mountainFilter === 'Blackcomb') {
        filtered = filtered.filter(run => 
          run.zone && blackcombZones.some(z => run.zone.includes(z))
        );
      }
    }

    setFilteredRuns(filtered);
  };

  const filterLifts = () => {
    let filtered = lifts;

    if (searchQuery) {
      filtered = filtered.filter(lift => 
        lift.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLifts(filtered);
  };

  const toggleBucketList = async (runId) => {
    if (!profile) return;

    try {
      if (bucketListIds.includes(runId)) {
        // Use proper { data, error } destructuring
        // NEVER call .json() or .text() on Supabase responses
        const { error } = await supabase
          .from('bucket_list')
          .delete()
          .eq('user_id', profile.id)
          .eq('run_id', runId);
        
        if (error) {
          console.error('Error removing from bucket list:', error);
          return;
        }
        setBucketListIds(bucketListIds.filter(id => id !== runId));
      } else {
        // Use proper { data, error } destructuring
        const { error } = await supabase
          .from('bucket_list')
          .insert({ user_id: profile.id, run_id: runId });
        
        if (error) {
          console.error('Error adding to bucket list:', error);
          return;
        }
        setBucketListIds([...bucketListIds, runId]);
      }
    } catch (err) {
      console.error('Error toggling bucket list:', err);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="run-directory-page">
      <Header />
      
      {/* Header */}
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Resorts
        </h1>

        {/* Resort Info Display - Now controlled by header chip */}
        {selectedResort && (
          <div className="mb-4">
            <GlassCard className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Mountain size={24} style={{ color: '#00B4D8' }} />
                <div>
                  <div className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {selectedResort.name}
                  </div>
                  {selectedResort.region && (
                    <div className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {selectedResort.region}, {selectedResort.country}
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {!selectedResort && (
          <div className="mb-4 text-center py-8">
            <p className="text-white/60" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Tap the resort chip in the header to select a resort
            </p>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="mb-4">
          <div className="flex gap-2">
            <button
              data-testid="view-runs"
              onClick={() => setViewMode('runs')}
              className="flex-1 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'runs' ? '#00B4D8' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'runs' ? '#000000' : 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'Manrope, sans-serif'
              }}
            >
              Runs ({runs.length})
            </button>
            <button
              data-testid="view-lifts"
              onClick={() => setViewMode('lifts')}
              className="flex-1 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: viewMode === 'lifts' ? '#00B4D8' : 'rgba(255,255,255,0.05)',
                color: viewMode === 'lifts' ? '#000000' : 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontFamily: 'Manrope, sans-serif'
              }}
            >
              Lifts ({lifts.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <input
            data-testid="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${viewMode}...`}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#1A2126',
              color: 'white',
              focusRing: '#00B4D8'
            }}
          />
        </div>

        {/* Filters (only for runs view) */}
        {viewMode === 'runs' && (
        <div className="space-y-3">
          {/* Difficulty Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['easy', 'intermediate', 'advanced', 'expert', 'park'].map((diff) => (
              <button
                key={diff}
                data-testid={`filter-difficulty-${diff}`}
                onClick={() => setDifficultyFilter(difficultyFilter === diff ? '' : diff)}
                className={difficultyFilter === diff ? 'ring-2 ring-white' : ''}
              >
                <DifficultyBadge difficulty={diff} region={profile?.difficulty_region || 'NA'} />
              </button>
            ))}
          </div>

          {/* Mountain & Run Type Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['Whistler', 'Blackcomb'].map((mountain) => (
              <button
                key={mountain}
                data-testid={`filter-mountain-${mountain.toLowerCase()}`}
                onClick={() => setMountainFilter(mountainFilter === mountain ? '' : mountain)}
                className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  backgroundColor: mountainFilter === mountain ? '#00B4D8' : 'rgba(255,255,255,0.05)',
                  color: mountainFilter === mountain ? '#000000' : 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'Manrope, sans-serif'
                }}
              >
                {mountain}
              </button>
            ))}
            {['groomed', 'moguls', 'trees'].map((type) => (
              <button
                key={type}
                onClick={() => setRunTypeFilter(runTypeFilter === type ? '' : type)}
                className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
                style={{
                  backgroundColor: runTypeFilter === type ? '#00B4D8' : 'rgba(255,255,255,0.05)',
                  color: runTypeFilter === type ? '#000000' : 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'Manrope, sans-serif'
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Content List */}
      <div className="px-6 space-y-3">
        {viewMode === 'runs' ? (
          // Runs List
          filteredRuns.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              No runs found. Try adjusting your filters.
            </p>
          </GlassCard>
        ) : (
          filteredRuns.map((run) => (
            <GlassCard 
              key={run.id} 
              className="p-4 cursor-pointer transition-all hover:bg-white/10"
              onClick={() => navigate(`/runs/${run.id}`)}
              data-testid={`run-card-${run.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {run.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {run.difficulty && (
                      <DifficultyBadge difficulty={run.difficulty} region={profile?.difficulty_region} />
                    )}
                    {run.zone && (
                      <span className="px-2 py-1 rounded text-[10px]" style={{ 
                        backgroundColor: 'rgba(255,255,255,0.1)', 
                        color: 'rgba(255,255,255,0.7)' 
                      }}>
                        {run.zone}
                      </span>
                    )}
                  </div>
                  {run.vertical_ft && (
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {run.vertical_ft.toLocaleString()} ft vertical
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Completed checkmark */}
                  {completedRunIds.includes(run.id) && (
                    <div 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: 'rgba(0, 230, 118, 0.2)' }}
                      data-testid={`completed-${run.id}`}
                    >
                      <Check 
                        size={20} 
                        style={{ color: '#00E676' }}
                      />
                    </div>
                  )}
                  {/* Bucket list heart */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBucketList(run.id);
                    }}
                    className="p-2"
                    data-testid={`bucket-list-toggle-${run.id}`}
                  >
                    <Heart 
                      size={20} 
                      style={{ color: bucketListIds.includes(run.id) ? '#FF1744' : 'rgba(255,255,255,0.3)' }}
                      fill={bucketListIds.includes(run.id) ? '#FF1744' : 'none'}
                    />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))
        )
        ) : (
          // Lifts List
          filteredLifts.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                No lifts found.
              </p>
            </GlassCard>
          ) : (
            filteredLifts.map((lift) => (
              <GlassCard 
                key={lift.id} 
                className="p-4"
                data-testid={`lift-card-${lift.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {lift.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {lift.lift_type && (
                        <span className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                          {lift.lift_type.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                      {lift.capacity && (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          Capacity: {lift.capacity}/hr
                        </span>
                      )}
                      {lift.occupancy && (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {lift.occupancy} seats
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: lift.is_open ? '#00E676' : '#FF1744' }}
                      />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {lift.is_open ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}

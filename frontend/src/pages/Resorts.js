import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { supabase } from '@/lib/supabase';
import { Search, Heart } from 'lucide-react';

export default function RunDirectory() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [filteredRuns, setFilteredRuns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [mountainFilter, setMountainFilter] = useState('');
  const [runTypeFilter, setRunTypeFilter] = useState('');
  const [bucketListIds, setBucketListIds] = useState([]);

  useEffect(() => {
    loadRuns();
    loadBucketList();
  }, []);

  useEffect(() => {
    filterRuns();
  }, [runs, searchQuery, difficultyFilter, mountainFilter, runTypeFilter]);

  const loadRuns = async () => {
    const { data } = await supabase
      .from('runs')
      .select('*')
      .order('name');
    
    if (data) setRuns(data);
  };

  const loadBucketList = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('bucket_list')
      .select('run_id')
      .eq('user_id', profile.id);
    
    if (data) setBucketListIds(data.map(item => item.run_id));
  };

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

  const toggleBucketList = async (runId) => {
    if (!profile) return;

    if (bucketListIds.includes(runId)) {
      await supabase
        .from('bucket_list')
        .delete()
        .eq('user_id', profile.id)
        .eq('run_id', runId);
      
      setBucketListIds(bucketListIds.filter(id => id !== runId));
    } else {
      await supabase
        .from('bucket_list')
        .insert([{ user_id: profile.id, run_id: runId }]);
      
      setBucketListIds([...bucketListIds, runId]);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="run-directory-page">
      <Header />
      
      {/* Header */}
      <div className="p-6 pb-4">
        <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Run Directory
        </h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
          <input
            data-testid="run-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search runs..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#1A2126',
              color: 'white',
              focusRing: '#00B4D8'
            }}
          />
        </div>

        {/* Filters */}
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
      </div>

      {/* Run List */}
      <div className="px-6 space-y-3">
        {filteredRuns.length === 0 ? (
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
            </GlassCard>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

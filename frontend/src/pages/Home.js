import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { SnowStake } from '@/components/SnowStake';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Heart } from 'lucide-react';

export default function Home() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ daysLogged: 0, verticalLogged: 0, completionPercent: 0 });
  const [bucketList, setBucketList] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (profile) {
      loadStats();
      loadBucketList();
      loadRecentActivity();
    }
  }, [profile]);

  const loadStats = async () => {
    const { data: logs } = await supabase
      .from('user_logs')
      .select('run_id, runs(vertical_ft)')
      .eq('user_id', profile.id);

    if (logs) {
      const uniqueDays = new Set(logs.map(l => l.run_id)).size;
      const totalVertical = logs.reduce((sum, log) => sum + (log.runs?.vertical_ft || 0), 0);
      
      setStats({
        daysLogged: uniqueDays,
        verticalLogged: totalVertical,
        completionPercent: 0 // TODO: Calculate based on total runs at resort
      });
    }
  };

  const loadBucketList = async () => {
    const { data } = await supabase
      .from('bucket_list')
      .select('*, runs(*)')
      .eq('user_id', profile.id)
      .eq('is_completed', false)
      .limit(5);

    if (data) setBucketList(data);
  };

  const loadRecentActivity = async () => {
    const { data } = await supabase
      .from('user_logs')
      .select('*, runs(name, difficulty)')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(5);

    if (data) setRecentActivity(data);
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="home-page">
      {/* Header */}
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Ready to send it, {profile?.username || 'rider'}? 🏂
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Snow Stake */}
      <div className="px-6 py-4">
        <SnowStake
          daysLogged={stats.daysLogged}
          goalDays={profile?.season_goal_days || 0}
          verticalLogged={stats.verticalLogged}
          goalVertical={profile?.season_goal_vertical_ft || 0}
        />
      </div>

      {/* Stats Row */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.daysLogged}
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Manrope, sans-serif' }}>
              Runs This Season
            </div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.verticalLogged.toLocaleString()}
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Manrope, sans-serif' }}>
              Vertical ft
            </div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {stats.completionPercent}%
            </div>
            <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Manrope, sans-serif' }}>
              Resort Complete
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Bucket List */}
      {bucketList.length > 0 && (
        <div className="px-6 py-4">
          <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Bucket List
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {bucketList.map((item) => (
              <GlassCard
                key={item.id}
                className="flex-shrink-0 px-4 py-3 flex items-center gap-2"
                style={{ borderLeft: `3px solid ${item.runs?.difficulty ? '#00B4D8' : 'rgba(255,255,255,0.1)'}` }}
              >
                <Heart size={14} style={{ color: '#FF1744' }} fill="#FF1744" />
                <span className="text-sm text-white whitespace-nowrap" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {item.runs?.name}
                </span>
                {item.runs?.difficulty && (
                  <DifficultyBadge difficulty={item.runs.difficulty} region={profile?.difficulty_region} />
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              No runs logged yet. Get out there! ⛷️
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((log) => (
              <GlassCard key={log.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {log.runs?.name || 'Unknown Run'}
                    </h3>
                    <div className="flex items-center gap-2">
                      {log.runs?.difficulty && (
                        <DifficultyBadge difficulty={log.runs.difficulty} region={profile?.difficulty_region} />
                      )}
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {format(new Date(log.logged_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {log.snow_condition && (
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {log.snow_condition}
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

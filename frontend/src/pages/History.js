import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function History() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ totalDays: 0, totalVertical: 0, totalRuns: 0 });

  useEffect(() => {
    if (profile) {
      loadLogs();
      calculateStats();
    }
  }, [profile]);

  const loadLogs = async () => {
    const { data } = await supabase
      .from('user_logs')
      .select('*, runs(name, difficulty, vertical_ft)')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false });
    
    if (data) setLogs(data);
  };

  const calculateStats = async () => {
    const { data } = await supabase
      .from('user_logs')
      .select('run_id, runs(vertical_ft)')
      .eq('user_id', profile.id);

    if (data) {
      const uniqueDays = new Set(data.map(l => format(new Date(l.logged_at || new Date()), 'yyyy-MM-dd'))).size;
      const totalVertical = data.reduce((sum, log) => sum + (log.runs?.vertical_ft || 0), 0);
      
      setStats({
        totalDays: uniqueDays,
        totalVertical,
        totalRuns: data.length
      });
    }
  };

  const deleteLog = async (logId) => {
    if (!window.confirm('Delete this log?')) return;

    const { error } = await supabase
      .from('user_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      toast.error('Failed to delete log');
    } else {
      toast.success('Log deleted');
      loadLogs();
      calculateStats();
    }
  };

  const isPremiumLocked = logs.length > 20 && !profile?.is_premium;
  const visibleLogs = isPremiumLocked ? logs.slice(0, 20) : logs;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="history-page">
      <Header />
      
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          History
        </h1>

        {/* Season Summary */}
        <GlassCard className="p-6 mb-6" style={{ backgroundColor: '#1A2126' }}>
          <h2 className="text-sm font-medium mb-4 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Season Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.totalRuns}
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Total Logs
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.totalDays}
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Days Out
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {stats.totalVertical.toLocaleString()}
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Vertical ft
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Logs */}
        {visibleLogs.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              No runs logged yet. Get out there! ⛷️
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {visibleLogs.map((log) => (
              <GlassCard key={log.id} className="p-4" data-testid={`log-entry-${log.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {log.runs?.name || 'Unknown Run'}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      {log.runs?.difficulty && (
                        <DifficultyBadge difficulty={log.runs.difficulty} region={profile?.difficulty_region} />
                      )}
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {format(new Date(log.logged_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    {log.snow_condition && (
                      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600 }}>Conditions:</span> {log.snow_condition}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {log.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="p-2 transition-all"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    data-testid={`delete-log-${log.id}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Premium Lock */}
        {isPremiumLocked && (
          <GlassCard 
            className="mt-6 p-6 text-center"
            style={{ 
              border: '2px solid #FFD700',
              background: 'rgba(255, 215, 0, 0.05)'
            }}
          >
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              You're on a roll!
            </h3>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Sendit Pro unlocks your full history.
            </p>
            <button
              className="px-6 py-2 rounded-full font-semibold"
              style={{
                backgroundColor: '#FFD700',
                color: '#000000',
                fontFamily: 'Manrope, sans-serif'
              }}
            >
              Upgrade to Pro
            </button>
          </GlassCard>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

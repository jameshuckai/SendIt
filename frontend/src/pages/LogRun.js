import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { supabase } from '@/lib/supabase';
import { Search, Snowflake, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SNOW_CONDITIONS = [
  { value: 'powder', label: 'Powder', icon: '❄️' },
  { value: 'groomed', label: 'Groomed', icon: '⛷️' },
  { value: 'crud', label: 'Crud', icon: '💩' },
  { value: 'ice', label: 'Ice', icon: '🧊' },
  { value: 'slush', label: 'Slush', icon: '🌊' },
  { value: 'corn', label: 'Corn', icon: '🌽' },
];

export default function LogRun() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [runs, setRuns] = useState([]);
  const [filteredRuns, setFilteredRuns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRun, setSelectedRun] = useState(location.state?.selectedRun || null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [snowCondition, setSnowCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredRuns(
        runs.filter(run => 
          run.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredRuns([]);
    }
  }, [searchQuery, runs]);

  const loadRuns = async () => {
    const { data } = await supabase
      .from('runs')
      .select('*')
      .order('name');
    
    if (data) setRuns(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRun) {
      toast.error('Please select a run');
      return;
    }

    if (!snowCondition) {
      toast.error('Please select snow conditions');
      return;
    }

    setSaving(true);

    const logData = {
      user_id: profile.id,
      run_id: selectedRun.id,
      logged_at: new Date(`${date}T${time}`).toISOString(),
      snow_condition: snowCondition,
      notes: notes || null,
    };

    const { error } = await supabase
      .from('user_logs')
      .insert([logData]);

    setSaving(false);

    if (error) {
      toast.error('Failed to log run');
      console.error(error);
    } else {
      const toastCard = document.createElement('div');
      toastCard.style.cssText = `
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 3px solid #00E676;
        border-radius: 12px;
        padding: 12px 16px;
        color: white;
        font-family: Manrope, sans-serif;
      `;
      toastCard.textContent = 'Logged! Nice run 🤙';
      
      toast.custom((t) => toastCard);
      
      // Reset form
      setSelectedRun(null);
      setSearchQuery('');
      setSnowCondition('');
      setNotes('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime(format(new Date(), 'HH:mm'));
      
      setTimeout(() => navigate('/home'), 1500);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="log-run-page">
      <Header />
      
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Log a Run
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Run Selector */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Which run?
            </label>
            
            {selectedRun ? (
              <GlassCard className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {selectedRun.name}
                    </h3>
                    {selectedRun.difficulty && (
                      <DifficultyBadge difficulty={selectedRun.difficulty} region={profile?.difficulty_region} />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRun(null)}
                    className="text-sm"
                    style={{ color: '#00B4D8', fontFamily: 'Manrope, sans-serif' }}
                  >
                    Change
                  </button>
                </div>
              </GlassCard>
            ) : (
              <div>
                <div className="relative mb-3">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    data-testid="run-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a run..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: '#1A2126',
                      color: 'white'
                    }}
                  />
                </div>
                
                {filteredRuns.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredRuns.map((run) => (
                      <GlassCard
                        key={run.id}
                        onClick={() => {
                          setSelectedRun(run);
                          setSearchQuery('');
                        }}
                        className="p-3 cursor-pointer hover:bg-white/10 transition-all"
                        data-testid={`run-option-${run.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {run.name}
                          </span>
                          {run.difficulty && (
                            <DifficultyBadge difficulty={run.difficulty} region={profile?.difficulty_region} />
                          )}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Date
              </label>
              <input
                data-testid="log-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#1A2126',
                  color: 'white'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Time
              </label>
              <input
                data-testid="log-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#1A2126',
                  color: 'white'
                }}
              />
            </div>
          </div>

          {/* Snow Condition */}
          <div>
            <label className="block text-sm font-medium mb-3 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Snow Condition
            </label>
            <div className="grid grid-cols-3 gap-3">
              {SNOW_CONDITIONS.map((condition) => (
                <GlassCard
                  key={condition.value}
                  data-testid={`snow-condition-${condition.value}`}
                  onClick={() => setSnowCondition(condition.value)}
                  className="p-4 cursor-pointer text-center transition-all"
                  style={{
                    border: snowCondition === condition.value ? '2px solid #00B4D8' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div className="text-2xl mb-1">{condition.icon}</div>
                  <div className="text-xs text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {condition.label}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Notes (optional)
            </label>
            <textarea
              data-testid="log-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How was it?"
              className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2 resize-none"
              style={{
                backgroundColor: '#1A2126',
                color: 'white'
              }}
            />
          </div>

          {/* Submit */}
          <button
            data-testid="log-submit"
            type="submit"
            disabled={saving || !selectedRun || !snowCondition}
            className="w-full py-3 rounded-full font-semibold transition-all"
            style={{
              backgroundColor: '#00B4D8',
              color: '#000000',
              fontFamily: 'Manrope, sans-serif',
              opacity: (saving || !selectedRun || !snowCondition) ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Run'}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}

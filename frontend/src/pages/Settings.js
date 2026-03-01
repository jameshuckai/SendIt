import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { GlassCard } from '@/components/GlassCard';
import { SnowStake } from '@/components/SnowStake';
import { supabase } from '@/lib/supabase';
import { Minus, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username || '');
  const [goalDays, setGoalDays] = useState(profile?.season_goal_days || 0);
  const [goalVertical, setGoalVertical] = useState(profile?.season_goal_vertical_ft || 0);
  const [region, setRegion] = useState(profile?.difficulty_region || 'NA');
  const [saving, setSaving] = useState(false);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setGoalDays(profile.season_goal_days || 0);
      setGoalVertical(profile.season_goal_vertical_ft || 0);
      setRegion(profile.difficulty_region || 'NA');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await updateProfile({
      username,
      season_goal_days: goalDays,
      season_goal_vertical_ft: goalVertical,
      difficulty_region: region,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to update settings');
    } else {
      toast.success('Settings saved!');
    }
  };

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('waitlist')
      .insert([{ email: waitlistEmail }]);

    if (error) {
      if (error.code === '23505') {
        toast.success('You\'re already on the waitlist!');
      } else {
        toast.error('Failed to join waitlist');
      }
    } else {
      toast.success('Added to waitlist! We\'ll notify you soon.');
      setShowWaitlistModal(false);
      setWaitlistEmail('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#12181B' }} data-testid="settings-page">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Settings
        </h1>

        <div className="space-y-6">
          {/* Profile */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Username
                </label>
                <input
                  data-testid="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#1A2126',
                    color: 'white'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Sport
                </label>
                <div className="text-base text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {profile?.sport ? profile.sport.charAt(0).toUpperCase() + profile.sport.slice(1) : 'Not set'}
                </div>
                <button
                  onClick={() => navigate('/onboarding')}
                  className="text-sm mt-1"
                  style={{ color: '#00B4D8' }}
                >
                  Update preferences
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Season Goals */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Season Goals
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Days This Season
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setGoalDays(Math.max(0, goalDays - 1))}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Minus size={20} style={{ color: 'white' }} />
                  </button>
                  <input
                    type="number"
                    value={goalDays}
                    onChange={(e) => setGoalDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 text-center text-2xl font-bold bg-transparent border-b-2 focus:outline-none focus:border-blue-500"
                    style={{ 
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.2)'
                    }}
                  />
                  <button
                    onClick={() => setGoalDays(goalDays + 1)}
                    className="p-2 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Plus size={20} style={{ color: 'white' }} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Vertical Feet Goal
                </label>
                <input
                  data-testid="vertical-goal-input"
                  type="number"
                  value={goalVertical}
                  onChange={(e) => setGoalVertical(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: '#1A2126',
                    color: 'white',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                />
              </div>
              
              {/* Mini Snow Stake Preview */}
              <div className="pt-2">
                <SnowStake
                  daysLogged={0}
                  goalDays={goalDays}
                  verticalLogged={0}
                  goalVertical={goalVertical}
                />
              </div>
            </div>
          </GlassCard>

          {/* Difficulty Region */}
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Difficulty Region
            </h2>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Difficulty colors match the convention used at resorts in your region.
            </p>
            <div className="flex gap-2">
              {['NA', 'EU', 'JP', 'AU'].map((r) => (
                <button
                  key={r}
                  data-testid={`region-${r}`}
                  onClick={() => setRegion(r)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: region === r ? '#00B4D8' : 'rgba(255,255,255,0.05)',
                    color: region === r ? '#000000' : 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: 'Manrope, sans-serif'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Save Button */}
          <button
            data-testid="save-settings"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-full font-semibold transition-all"
            style={{
              backgroundColor: '#00B4D8',
              color: '#000000',
              fontFamily: 'Manrope, sans-serif',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Sendit Pro */}
          <GlassCard 
            className="p-6"
            style={{ border: '2px solid #FFD700' }}
          >
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Sendit Pro 🏔️
            </h2>
            <ul className="space-y-2 mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <li>✓ Unlimited history</li>
              <li>✓ Advanced stats & insights</li>
              <li>✓ Priority support</li>
            </ul>
            <p className="text-lg font-bold mb-4" style={{ color: '#FFD700', fontFamily: 'JetBrains Mono, monospace' }}>
              $9.99 / season
            </p>
            <button
              data-testid="upgrade-pro"
              onClick={() => setShowWaitlistModal(true)}
              className="w-full py-3 rounded-full font-semibold"
              style={{
                backgroundColor: '#FFD700',
                color: '#000000',
                fontFamily: 'Manrope, sans-serif'
              }}
            >
              Upgrade Now
            </button>
          </GlassCard>

          {/* Sign Out */}
          <button
            data-testid="sign-out"
            onClick={handleSignOut}
            className="w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'Manrope, sans-serif'
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(18, 24, 27, 0.9)' }}
          onClick={() => setShowWaitlistModal(false)}
        >
          <GlassCard 
            className="p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Join Pro Waitlist
            </h2>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
              We'll notify you when Sendit Pro launches!
            </p>
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border-0 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: '#1A2126',
                  color: 'white'
                }}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWaitlistModal(false)}
                  className="flex-1 py-3 rounded-full font-semibold"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: 'Manrope, sans-serif'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-full font-semibold"
                  style={{
                    backgroundColor: '#00B4D8',
                    color: '#000000',
                    fontFamily: 'Manrope, sans-serif'
                  }}
                >
                  Join Waitlist
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

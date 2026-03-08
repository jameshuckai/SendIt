import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, LogOut, ChevronDown, Mountain } from 'lucide-react';
import { GlassCard } from './GlassCard';

// Consistent logo URL used across the app
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_blackcomb-beta/artifacts/za2ypiek_SendItLogo.png';

export function Header({ 
  showResortSelector = false, 
  selectedResort = null, 
  onResortClick = null 
}) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = () => {
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header 
      className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
      style={{ 
        backgroundColor: '#12181B',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}
      data-testid="app-header"
    >
      {/* Left side - Logo and Resort Selector */}
      <div className="flex items-center gap-3">
        <Link 
          to="/home" 
          className="transition-opacity hover:opacity-85"
          style={{ textDecoration: 'none', border: 'none' }}
        >
          <img 
            src={LOGO_URL}
            alt="Sendit Logo"
            className="h-12 w-12 object-contain"
          />
        </Link>
        
        {showResortSelector && onResortClick ? (
          <button
            onClick={onResortClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-white/10"
            style={{ 
              backgroundColor: 'rgba(0, 180, 216, 0.1)',
              border: '1px solid rgba(0, 180, 216, 0.3)'
            }}
            data-testid="header-resort-selector"
          >
            <Mountain size={16} style={{ color: '#00B4D8' }} />
            <span 
              className="text-sm font-medium max-w-[120px] truncate"
              style={{ color: '#00B4D8', fontFamily: 'Manrope, sans-serif' }}
            >
              {selectedResort?.name || 'Select Resort'}
            </span>
            <ChevronDown size={14} style={{ color: '#00B4D8' }} />
          </button>
        ) : (
          <Link 
            to="/home"
            className="text-xl font-bold text-white transition-opacity hover:opacity-85"
            style={{ fontFamily: 'Manrope, sans-serif', textDecoration: 'none' }}
          >
            Sendit
          </Link>
        )}
      </div>

      {/* User Profile Menu */}
      <div className="relative" ref={menuRef}>
        <button
          data-testid="user-menu-button"
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 p-2 rounded-full transition-all"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          {/* Avatar */}
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ 
              backgroundColor: '#00B4D8',
              color: '#000000',
              fontFamily: 'Manrope, sans-serif'
            }}
          >
            {getInitials()}
          </div>
          <ChevronDown size={16} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-64">
            <GlassCard className="p-4">
              {/* User Info */}
              <div className="pb-3 mb-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ 
                      backgroundColor: '#00B4D8',
                      color: '#000000',
                      fontFamily: 'Manrope, sans-serif'
                    }}
                  >
                    {getInitials()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {profile?.username || 'User'}
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
                {profile?.sport && (
                  <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {profile.sport === 'skier' ? '⛷️ Skier' : profile.sport === 'snowboarder' ? '🏂 Snowboarder' : '♿ Adaptive'}
                  </div>
                )}
              </div>

              {/* Menu Items */}
              <div className="space-y-1">
                <button
                  data-testid="menu-settings"
                  onClick={() => {
                    setShowMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <Settings size={18} />
                  <span style={{ fontFamily: 'Manrope, sans-serif' }}>Settings</span>
                </button>

                <button
                  data-testid="menu-logout"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={18} />
                  <span style={{ fontFamily: 'Manrope, sans-serif' }}>Sign Out</span>
                </button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </header>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { Home, Mountain, Plus, History, Settings } from 'lucide-react';

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label, isLog = false }) => {
    const active = isActive(to);
    
    if (isLog) {
      return (
        <Link to={to} data-testid="nav-log" className="flex flex-col items-center justify-center -mt-6">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: '#00B4D8' }}
          >
            <Icon size={24} style={{ color: '#000000' }} />
          </div>
          <span className="text-[10px] mt-1" style={{ 
            fontFamily: 'Manrope, sans-serif',
            color: 'rgba(255,255,255,0.7)'
          }}>
            {label}
          </span>
        </Link>
      );
    }

    return (
      <Link to={to} data-testid={`nav-${label.toLowerCase()}`} className="flex flex-col items-center justify-center gap-1">
        <Icon size={20} style={{ color: active ? '#00E676' : 'rgba(255,255,255,0.35)' }} />
        <span className="text-[10px]" style={{ 
          fontFamily: 'Manrope, sans-serif',
          color: active ? '#00E676' : 'rgba(255,255,255,0.35)'
        }}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around px-4"
      style={{
        backgroundColor: '#1A2126',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
      }}
      data-testid="bottom-nav"
    >
      <NavItem to="/home" icon={Home} label="Home" />
      <NavItem to="/runs" icon={Mountain} label="Runs" />
      <NavItem to="/log" icon={Plus} label="Log" isLog />
      <NavItem to="/history" icon={History} label="History" />
      <NavItem to="/settings" icon={Settings} label="Settings" />
    </nav>
  );
}

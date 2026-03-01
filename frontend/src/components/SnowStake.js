export function SnowStake({ daysLogged = 0, goalDays = 0, verticalLogged = 0, goalVertical = 0 }) {
  const percentage = goalDays > 0 ? Math.min((daysLogged / goalDays) * 100, 100) : 0;
  const isGoalCrushed = percentage >= 100;
  
  const getMessage = () => {
    if (goalDays === 0) return 'Set your season goals to unlock the Snow Stake';
    if (percentage === 0) return 'Get out there — season starts now';
    if (isGoalCrushed) return 'Goal Crushed 🏔️';
    return `${Math.round(percentage)}% to goal`;
  };

  return (
    <div data-testid="snow-stake" className="flex flex-col items-center gap-4 py-6">
      {/* Stake */}
      <div className="relative w-16 h-48 rounded-full overflow-hidden"
        style={{
          backgroundColor: '#1A2126',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 20px rgba(0, 180, 216, 0.1)'
        }}
      >
        {/* Tick marks */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 px-1">
          {[100, 75, 50, 25].map((tick) => (
            <div key={tick} className="flex items-center justify-end">
              <div className="w-3 h-px bg-white/30" />
              <span className="text-[8px] text-white/50 ml-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {tick}
              </span>
            </div>
          ))}
        </div>

        {/* Fill */}
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
          style={{
            height: `${percentage}%`,
            background: isGoalCrushed 
              ? '#FFD700'
              : 'linear-gradient(to top, #0077B6, #2979FF, #00B4D8)',
            animation: isGoalCrushed ? 'pulse 2s ease-in-out infinite' : 'none'
          }}
        />
      </div>

      {/* Stats */}
      <div className="text-center space-y-1">
        <p className="text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.7)' }}>
          {daysLogged.toLocaleString()} / {goalDays.toLocaleString()} days
        </p>
        <p className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.5)' }}>
          {verticalLogged.toLocaleString()} / {goalVertical.toLocaleString()} ft
        </p>
        <p className="text-xs mt-2" style={{ 
          fontFamily: 'Manrope, sans-serif', 
          color: isGoalCrushed ? '#FFD700' : 'rgba(255,255,255,0.6)',
          fontWeight: goalDays === 0 ? 400 : 600
        }}>
          {getMessage()}
        </p>
      </div>
    </div>
  );
}

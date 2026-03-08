import { useState, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, X, RotateCcw, Map } from 'lucide-react';
import { GlassCard } from './GlassCard';

// Default trail map images
const RESORT_MAPS = {
  'whistler': 'https://www.skicentral.com/trailmaps/images/500/bc0002-500.jpg',
  'blackcomb': 'https://www.skicentral.com/trailmaps/images/500/bc0002-500.jpg',
  'default': 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80'
};

export function TrailMap({ 
  resort, 
  className = '', 
  height = 'h-[45vh]',
  mobileHeight = 'h-[40vh]',
  showLabel = true,
  labelText = 'Trail Map',
  focusZone = null, // e.g., "Peak Zone" - for highlighting last run area
  onZoneClick = null,
  scoutableMode = false // For LogRun - allows exploration before selection
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);
  const transformRef = useRef(null);

  // Get map URL based on resort name or map_url field
  const getMapUrl = useCallback(() => {
    // First check if resort has a custom map_url in the database
    if (resort?.map_url) return resort.map_url;
    
    if (!resort?.name) return RESORT_MAPS.default;
    
    const name = resort.name.toLowerCase();
    if (name.includes('whistler') || name.includes('blackcomb')) {
      return RESORT_MAPS.whistler;
    }
    
    return RESORT_MAPS.default;
  }, [resort]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleTransform = useCallback((ref) => {
    setCurrentScale(ref.state.scale);
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.zoomIn(0.5);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.zoomOut(0.5);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  }, []);

  // Zoom Controls Component
  const ZoomControls = ({ fullscreen = false }) => (
    <div 
      className="absolute bottom-3 right-3 flex items-center gap-1 p-1.5 rounded-xl z-10"
      style={{ 
        backgroundColor: 'rgba(18, 24, 27, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <button
        onClick={handleZoomOut}
        className="p-2.5 rounded-lg transition-all active:scale-95 hover:bg-white/10"
        disabled={currentScale <= 1}
        style={{ opacity: currentScale <= 1 ? 0.4 : 1 }}
        aria-label="Zoom out"
      >
        <ZoomOut size={20} style={{ color: '#00B4D8' }} />
      </button>
      
      <span 
        className="px-3 py-1 text-xs font-medium min-w-[52px] text-center rounded"
        style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontFamily: 'JetBrains Mono, monospace',
          backgroundColor: 'rgba(255,255,255,0.05)'
        }}
      >
        {Math.round(currentScale * 100)}%
      </span>
      
      <button
        onClick={handleZoomIn}
        className="p-2.5 rounded-lg transition-all active:scale-95 hover:bg-white/10"
        disabled={currentScale >= 4}
        style={{ opacity: currentScale >= 4 ? 0.4 : 1 }}
        aria-label="Zoom in"
      >
        <ZoomIn size={20} style={{ color: '#00B4D8' }} />
      </button>
      
      {currentScale > 1 && (
        <button
          onClick={handleReset}
          className="p-2.5 rounded-lg transition-all active:scale-95 hover:bg-white/10 ml-1"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
          aria-label="Reset view"
        >
          <RotateCcw size={18} style={{ color: '#00B4D8' }} />
        </button>
      )}
      
      {!fullscreen && (
        <button
          onClick={() => setIsFullscreen(true)}
          className="p-2.5 rounded-lg transition-all active:scale-95 hover:bg-white/10 ml-1"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
          aria-label="Fullscreen"
        >
          <Maximize2 size={18} style={{ color: '#00B4D8' }} />
        </button>
      )}
    </div>
  );

  // Map Label Component
  const MapLabel = () => (
    showLabel && (
      <div 
        className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 z-10"
        style={{ 
          backgroundColor: 'rgba(18, 24, 27, 0.95)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.9)',
          fontFamily: 'Manrope, sans-serif',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <Map size={14} style={{ color: '#00B4D8' }} />
        {labelText}
      </div>
    )
  );

  // Focus Zone Indicator (for Home page - last run zone)
  const FocusZoneIndicator = () => (
    focusZone && (
      <div 
        className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 z-10"
        style={{ 
          backgroundColor: 'rgba(0, 180, 216, 0.2)',
          backdropFilter: 'blur(8px)',
          color: '#00B4D8',
          fontFamily: 'Manrope, sans-serif',
          border: '1px solid rgba(0, 180, 216, 0.3)'
        }}
      >
        <span className="w-2 h-2 rounded-full bg-[#00B4D8] animate-pulse" />
        {focusZone}
      </div>
    )
  );

  // Scoutable Mode Hint (for LogRun page)
  const ScoutHint = () => (
    scoutableMode && currentScale === 1 && (
      <div 
        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-xs font-medium z-10 animate-pulse"
        style={{ 
          backgroundColor: 'rgba(18, 24, 27, 0.95)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.7)',
          fontFamily: 'Manrope, sans-serif',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        Pinch or scroll to scout the mountain
      </div>
    )
  );

  // Error Placeholder
  const ErrorPlaceholder = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-6">
      <Map size={48} style={{ color: 'rgba(255,255,255,0.2)' }} className="mb-4" />
      <p className="text-sm text-center font-medium" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Manrope, sans-serif' }}>
        Trail map not available
      </p>
      <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {resort?.name || 'This resort'} map coming soon
      </p>
    </div>
  );

  // Main Map Content
  const MapContent = ({ fullscreen = false }) => (
    <div 
      className={`relative overflow-hidden ${fullscreen ? 'w-full h-full' : `${mobileHeight} md:${height}`}`}
      style={{ 
        backgroundColor: '#12181B',
        touchAction: 'none' // Prevents browser gestures interfering
      }}
    >
      {imageError ? (
        <ErrorPlaceholder />
      ) : (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={4}
          centerOnInit={true}
          wheel={{ step: 0.2 }}
          pinch={{ step: 5 }}
          doubleClick={{ mode: 'zoomIn', step: 0.7 }}
          onTransformed={handleTransform}
          limitToBounds={true}
          panning={{ 
            velocityDisabled: false,
            lockAxisX: false,
            lockAxisY: false
          }}
        >
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%'
            }}
            contentStyle={{
              width: '100%',
              height: '100%'
            }}
          >
            <img
              src={getMapUrl()}
              alt={`${resort?.name || 'Resort'} Trail Map`}
              className="w-full h-full object-cover select-none"
              draggable={false}
              onError={handleImageError}
              style={{ 
                minHeight: fullscreen ? '100%' : undefined,
                objectPosition: 'center'
              }}
            />
          </TransformComponent>
        </TransformWrapper>
      )}

      {/* Overlays */}
      {!imageError && (
        <>
          <MapLabel />
          <FocusZoneIndicator />
          <ScoutHint />
          <ZoomControls fullscreen={fullscreen} />
        </>
      )}
    </div>
  );

  return (
    <>
      <GlassCard 
        className={`overflow-hidden ${className}`} 
        data-testid="trail-map"
      >
        <MapContent />
      </GlassCard>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.98)' }}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              setIsFullscreen(false);
              handleReset();
            }}
            className="absolute top-4 right-4 p-3 rounded-full transition-all active:scale-95 hover:bg-white/20 z-20"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
            aria-label="Close fullscreen"
          >
            <X size={24} style={{ color: 'white' }} />
          </button>
          
          {/* Resort Name in Fullscreen */}
          <div 
            className="absolute top-4 left-4 px-4 py-2 rounded-full z-20"
            style={{ 
              backgroundColor: 'rgba(18, 24, 27, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span 
              className="text-sm font-semibold"
              style={{ color: 'white', fontFamily: 'Manrope, sans-serif' }}
            >
              {resort?.name || 'Trail Map'}
            </span>
          </div>
          
          {/* Fullscreen Map */}
          <div className="w-full h-full">
            <MapContent fullscreen />
          </div>
        </div>
      )}
    </>
  );
}

// Compact version for smaller spaces
export function TrailMapCompact({ resort, className = '', onExpand }) {
  const [imageError, setImageError] = useState(false);

  const getMapUrl = () => {
    if (resort?.map_url) return resort.map_url;
    if (!resort?.name) return RESORT_MAPS.default;
    const name = resort.name.toLowerCase();
    if (name.includes('whistler') || name.includes('blackcomb')) {
      return RESORT_MAPS.whistler;
    }
    return RESORT_MAPS.default;
  };

  return (
    <GlassCard 
      className={`overflow-hidden cursor-pointer transition-transform active:scale-[0.98] ${className}`}
      onClick={onExpand}
    >
      <div className="relative h-32">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#12181B' }}>
            <Map size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        ) : (
          <img
            src={getMapUrl()}
            alt={`${resort?.name || 'Resort'} Trail Map`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
        
        {/* Overlay gradient */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(to top, rgba(18,24,27,0.9) 0%, transparent 50%)'
          }}
        />
        
        {/* Expand hint */}
        <div 
          className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
          style={{ 
            backgroundColor: 'rgba(0, 180, 216, 0.2)',
            color: '#00B4D8',
            fontFamily: 'Manrope, sans-serif'
          }}
        >
          <Maximize2 size={12} />
          View Map
        </div>
      </div>
    </GlassCard>
  );
}

export default TrailMap;

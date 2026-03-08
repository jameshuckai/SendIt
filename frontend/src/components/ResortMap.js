import { useEffect, useRef, useState, useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { DifficultyBadge } from './DifficultyBadge';
import { Check, TrendingUp, Target, X, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Status colors
const STATUS_COLORS = {
  today: '#00E676',
  season: '#FFD700', 
  historical: '#6B7280',
  never: '#FFFFFF'
};

// Difficulty colors
const DIFFICULTY_COLORS = {
  'green': '#22C55E',
  'blue': '#3B82F6', 
  'black': '#1F2937',
  'double_black': '#000000',
  'novice': '#22C55E',
  'easy': '#22C55E',
  'intermediate': '#3B82F6',
  'advanced': '#1F2937',
  'expert': '#000000'
};

export function ResortMap({
  runs = [],
  lifts = [],
  resort,
  getRunStatus,
  isInBucketList,
  onLogRun,
  region
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Memoize center coordinates
  const center = useMemo(() => {
    if (resort?.boundary?.lat && resort?.boundary?.lng) {
      return [resort.boundary.lat, resort.boundary.lng];
    }
    return [50.1163, -122.9574]; // Default to Whistler
  }, [resort?.boundary?.lat, resort?.boundary?.lng]);

  // Initialize map only once
  useEffect(() => {
    // Don't initialize if container doesn't exist or map already exists
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // Create markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setMapReady(true);

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        setMapReady(false);
      }
    };
  }, []); // Empty deps - only run once

  // Update center when resort changes
  useEffect(() => {
    if (mapRef.current && mapReady) {
      mapRef.current.setView(center, 13);
    }
  }, [center, mapReady]);

  // Add markers when runs/lifts change
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !mapReady) {
      return;
    }

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    // Add run markers
    runs.forEach((run, index) => {
      const status = getRunStatus ? getRunStatus(run.id) : 'never';
      const color = STATUS_COLORS[status] || '#FFFFFF';
      const diffColor = DIFFICULTY_COLORS[run.difficulty] || '#3B82F6';

      // Calculate position - grid pattern around center
      const offsetLat = (index % 10) * 0.002 - 0.01;
      const offsetLng = Math.floor(index / 10) * 0.003 - 0.015;
      const lat = center[0] + offsetLat;
      const lng = center[1] + offsetLng;

      // Create circle marker
      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: color,
        color: diffColor,
        weight: 3,
        opacity: 1,
        fillOpacity: status === 'today' ? 1 : 0.7
      });

      marker.on('click', () => setSelectedRun(run));
      
      marker.bindTooltip(run.name, {
        permanent: false,
        direction: 'top',
        className: 'run-tooltip'
      });

      markersLayerRef.current.addLayer(marker);
      bounds.extend([lat, lng]);
      hasPoints = true;
    });

    // Add lift markers
    lifts.forEach((lift, index) => {
      const offsetLat = (index % 5) * 0.003 - 0.0075 + 0.025;
      const offsetLng = Math.floor(index / 5) * 0.004 - 0.01;
      const lat = center[0] + offsetLat;
      const lng = center[1] + offsetLng;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'lift-marker',
          html: `<div style="
            width: 28px; 
            height: 28px; 
            background: linear-gradient(135deg, #00B4D8 0%, #0077B6 100%); 
            border-radius: 6px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 14px;
            color: #000;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,180,216,0.4);
          ">▲</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      });

      marker.bindTooltip(lift.name, {
        permanent: false,
        direction: 'top',
        className: 'run-tooltip'
      });

      markersLayerRef.current.addLayer(marker);
      bounds.extend([lat, lng]);
      hasPoints = true;
    });

    // Fit bounds with padding
    if (hasPoints && bounds.isValid() && mapRef.current) {
      try {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        console.log('Could not fit bounds:', e);
      }
    }
  }, [runs, lifts, center, getRunStatus, mapReady]);

  const handleLogRun = () => {
    if (selectedRun && onLogRun) {
      onLogRun(selectedRun.id);
      setSelectedRun(null);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height: '500px' }} data-testid="resort-map">
      {/* Map Container */}
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%', background: '#12181B' }}
      />

      {/* Legend */}
      {showLegend && (
        <div 
          className="absolute top-3 left-3 p-3 rounded-xl"
          style={{ 
            backgroundColor: 'rgba(26, 33, 38, 0.95)', 
            backdropFilter: 'blur(8px)',
            zIndex: 1000 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white">Legend</span>
            <button 
              onClick={() => setShowLegend(false)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00E676', boxShadow: '0 0 6px #00E676' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFD700' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>This Season</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6B7280' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>Past</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'transparent' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>Not Logged</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00B4D8' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>Lift</span>
            </div>
          </div>
        </div>
      )}

      {/* Show Legend Button */}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute top-3 left-3 p-2.5 rounded-xl"
          style={{ 
            backgroundColor: 'rgba(26, 33, 38, 0.95)',
            zIndex: 1000 
          }}
        >
          <Layers size={18} style={{ color: '#00B4D8' }} />
        </button>
      )}

      {/* Run Detail Popup */}
      {selectedRun && (
        <div 
          className="absolute bottom-3 left-3 right-3 p-4 rounded-xl"
          style={{ 
            backgroundColor: 'rgba(26, 33, 38, 0.98)', 
            backdropFilter: 'blur(12px)',
            zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <button 
            onClick={() => setSelectedRun(null)}
            className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </button>
          
          <div className="pr-8">
            <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {selectedRun.name}
            </h3>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {selectedRun.difficulty && (
                <DifficultyBadge difficulty={selectedRun.difficulty} region={region} />
              )}
              {isInBucketList && isInBucketList(selectedRun.id) && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{
                  backgroundColor: 'rgba(255, 23, 68, 0.15)',
                  color: '#FF1744'
                }}>
                  <Target size={12} />
                  Bucket List
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {selectedRun.vertical_ft && (
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} style={{ color: '#00B4D8' }} />
                  {selectedRun.vertical_ft.toLocaleString()} ft
                </span>
              )}
              {selectedRun.zone && (
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  {selectedRun.zone}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={handleLogRun}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold transition-all active:scale-98"
            style={{
              background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
              color: '#000',
              fontFamily: 'Manrope, sans-serif',
              boxShadow: '0 4px 20px rgba(0, 180, 216, 0.3)'
            }}
          >
            <Check size={20} />
            Log This Run
          </button>
        </div>
      )}

      {/* Custom CSS */}
      <style>{`
        .run-tooltip {
          background: rgba(26, 33, 38, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 8px !important;
          color: white !important;
          font-family: 'Manrope', sans-serif !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 6px 10px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        }
        .run-tooltip::before {
          display: none !important;
        }
        .leaflet-container {
          background: #12181B !important;
          font-family: 'Manrope', sans-serif !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(26, 33, 38, 0.95) !important;
          color: white !important;
          border: none !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(0, 180, 216, 0.3) !important;
          color: #00B4D8 !important;
        }
        .lift-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}

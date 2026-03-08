import { useEffect, useRef, useState } from 'react';
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

// Difficulty colors for map
const DIFFICULTY_COLORS = {
  'green': '#22C55E',
  'blue': '#3B82F6', 
  'black': '#1F2937',
  'double_black': '#000000',
  'orange': '#F97316',
  'red': '#EF4444',
  'novice': '#22C55E',
  'easy': '#22C55E',
  'intermediate': '#3B82F6',
  'advanced': '#1F2937',
  'expert': '#000000'
};

// Status colors
const STATUS_COLORS = {
  today: '#00E676',
  season: '#FFD700', 
  historical: '#6B7280',
  never: '#FFFFFF'
};

export function ResortMap({
  runs,
  lifts,
  resort,
  getRunStatus,
  isInBucketList,
  onLogRun,
  region
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showLegend, setShowLegend] = useState(true);

  // Default center (Whistler area)
  const defaultCenter = resort?.boundary 
    ? [resort.boundary.lat || 50.1163, resort.boundary.lng || -122.9574]
    : [50.1163, -122.9574];

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [defaultCenter]);

  // Add runs and lifts to map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Add runs as markers (since we may not have geom data)
    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    runs.forEach((run, index) => {
      // Check if run has geometry
      if (run.geom && run.geom.coordinates) {
        // Has GeoJSON - draw polyline
        try {
          const coords = run.geom.coordinates.map(c => [c[1], c[0]]);
          const status = getRunStatus(run.id);
          
          const polyline = L.polyline(coords, {
            color: STATUS_COLORS[status] || DIFFICULTY_COLORS[run.difficulty] || '#FFFFFF',
            weight: 4,
            opacity: 0.8
          }).addTo(map);

          polyline.on('click', () => setSelectedRun(run));
          bounds.extend(polyline.getBounds());
          hasPoints = true;
        } catch (e) {
          console.log('Invalid geom for run:', run.name);
        }
      } else {
        // No geom - place markers in a grid pattern around resort center
        const offsetLat = (index % 10) * 0.002 - 0.01;
        const offsetLng = Math.floor(index / 10) * 0.003 - 0.015;
        const lat = defaultCenter[0] + offsetLat;
        const lng = defaultCenter[1] + offsetLng;

        const status = getRunStatus(run.id);
        const color = STATUS_COLORS[status] || '#FFFFFF';
        const diffColor = DIFFICULTY_COLORS[run.difficulty] || '#3B82F6';

        // Create custom icon
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: diffColor,
          weight: 3,
          opacity: 1,
          fillOpacity: status === 'today' ? 1 : 0.6
        }).addTo(map);

        marker.on('click', () => setSelectedRun(run));
        marker.bindTooltip(run.name, {
          permanent: false,
          direction: 'top',
          className: 'run-tooltip'
        });

        bounds.extend([lat, lng]);
        hasPoints = true;
      }
    });

    // Add lifts
    lifts.forEach((lift, index) => {
      if (lift.geom && lift.geom.coordinates) {
        try {
          const coords = lift.geom.coordinates.map(c => [c[1], c[0]]);
          const polyline = L.polyline(coords, {
            color: '#00B4D8',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5'
          }).addTo(map);

          polyline.bindTooltip(lift.name, {
            permanent: false,
            direction: 'top'
          });

          bounds.extend(polyline.getBounds());
          hasPoints = true;
        } catch (e) {
          console.log('Invalid geom for lift:', lift.name);
        }
      } else {
        // No geom - place lift markers
        const offsetLat = (index % 5) * 0.003 - 0.0075 + 0.02;
        const offsetLng = Math.floor(index / 5) * 0.004 - 0.01;
        const lat = defaultCenter[0] + offsetLat;
        const lng = defaultCenter[1] + offsetLng;

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'lift-icon',
            html: `<div style="
              width: 24px; 
              height: 24px; 
              background: #00B4D8; 
              border-radius: 4px; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              font-size: 12px;
              color: #000;
              font-weight: bold;
            ">⬆</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map);

        marker.bindTooltip(lift.name, {
          permanent: false,
          direction: 'top'
        });

        bounds.extend([lat, lng]);
        hasPoints = true;
      }
    });

    // Fit bounds if we have points
    if (hasPoints && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [runs, lifts, getRunStatus, defaultCenter]);

  const handleLogRun = () => {
    if (selectedRun) {
      onLogRun(selectedRun.id);
      setSelectedRun(null);
    }
  };

  return (
    <div className="relative h-[500px] rounded-2xl overflow-hidden" data-testid="resort-map">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      {showLegend && (
        <div 
          className="absolute top-3 left-3 p-3 rounded-xl z-[1000]"
          style={{ backgroundColor: 'rgba(26, 33, 38, 0.95)', backdropFilter: 'blur(8px)' }}
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00E676' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Logged Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFD700' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>This Season</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6B7280' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Past Season</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: '#00B4D8' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>Never Logged</span>
            </div>
          </div>
        </div>
      )}

      {/* Show Legend Button */}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute top-3 left-3 p-2 rounded-xl z-[1000]"
          style={{ backgroundColor: 'rgba(26, 33, 38, 0.95)' }}
        >
          <Layers size={18} style={{ color: '#00B4D8' }} />
        </button>
      )}

      {/* Run Detail Popup */}
      {selectedRun && (
        <div 
          className="absolute bottom-3 left-3 right-3 p-4 rounded-xl z-[1000]"
          style={{ backgroundColor: 'rgba(26, 33, 38, 0.95)', backdropFilter: 'blur(12px)' }}
        >
          <button 
            onClick={() => setSelectedRun(null)}
            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded"
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
          
          <div className="flex items-start justify-between pr-6">
            <div>
              <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {selectedRun.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                {selectedRun.difficulty && (
                  <DifficultyBadge difficulty={selectedRun.difficulty} region={region} />
                )}
                {isInBucketList(selectedRun.id) && (
                  <Target size={14} style={{ color: '#FF1744' }} />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {selectedRun.vertical_ft && (
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {selectedRun.vertical_ft.toLocaleString()} ft
                  </span>
                )}
                {selectedRun.zone && (
                  <span>{selectedRun.zone}</span>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogRun}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-full font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
              color: '#000',
              fontFamily: 'Manrope, sans-serif'
            }}
          >
            <Check size={18} />
            Log This Run
          </button>
        </div>
      )}

      {/* Custom CSS for tooltips */}
      <style>{`
        .run-tooltip {
          background: rgba(26, 33, 38, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px !important;
          color: white !important;
          font-family: 'Manrope', sans-serif !important;
          font-size: 12px !important;
          padding: 4px 8px !important;
        }
        .run-tooltip::before {
          border-top-color: rgba(26, 33, 38, 0.95) !important;
        }
        .leaflet-container {
          background: #12181B !important;
        }
      `}</style>
    </div>
  );
}

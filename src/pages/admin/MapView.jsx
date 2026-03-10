import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapView() {
    const [pins, setPins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [popupInfo, setPopupInfo] = useState(null);
    const [viewState, setViewState] = useState({
        latitude: 28.4595,
        longitude: 77.0266,
        zoom: 11
    });

    useEffect(() => {
        const fetchPins = async () => {
            try {
                const { data } = await api.get('/tickets/master');
                setPins(data.filter(t => t.lat && t.lng));
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchPins();
    }, []);

    return (
        <DashboardLayout title="Live Incident Map" subtitle="City-wide heatmap and clustering of active deduplicated tickets">
            <div className="card p-0 h-[70vh] relative animate-fadeInUp overflow-hidden">
                {loading && <div className="absolute inset-0 bg-[var(--color-surface)]/80 flex items-center justify-center z-10"><div className="spinner" /></div>}

                <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                >
                    <NavigationControl position="top-right" />

                    {pins.map(pin => (
                        <Marker
                            key={pin.id}
                            longitude={pin.lng}
                            latitude={pin.lat}
                            onClick={e => { e.originalEvent.stopPropagation(); setPopupInfo(pin); }}
                        >
                            <div className={`w-4 h-4 rounded-full cursor-pointer border-2 border-[var(--color-card)] ${pin.severity === "Critical" ? "bg-[#ef4444]" :
                                pin.severity === "High" ? "bg-[#f59e0b]" :
                                    pin.severity === "Medium" ? "bg-[#3b82f6]" : "bg-[#22c55e]"
                                } ${pin.status === "Closed" ? 'opacity-40 grayscale' : 'animate-pulse-slow'}`} />
                        </Marker>
                    ))}

                    {popupInfo && (
                        <Popup
                            anchor="bottom"
                            longitude={popupInfo.lng}
                            latitude={popupInfo.lat}
                            onClose={() => setPopupInfo(null)}
                            closeButton={true}
                            closeOnClick={false}
                            className="ui-popup"
                        >
                            <div className="text-[var(--color-text)] p-2">
                                <h4 className="font-bold text-sm mb-1">{popupInfo.intentCategory?.replace(/_/g, " ")}</h4>
                                <div className="flex gap-2 mb-2">
                                    <span className={`badge severity-${(popupInfo.severity || "low").toLowerCase()}`}>{popupInfo.severity}</span>
                                    <span className={`badge status-${(popupInfo.status || "open").toLowerCase()}`}>{popupInfo.status}</span>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mb-1">Count: {popupInfo.complaintCount} raw reports</p>
                                <p className="text-xs mb-2 truncate max-w-[200px]">{popupInfo.landmark}</p>
                            </div>
                        </Popup>
                    )}
                </Map>
            </div>

            <style>{`
        .mapboxgl-popup-content {
           background: var(--color-card) !important;
           border: 1px solid var(--color-border) !important;
           border-radius: 12px !important;
           color: var(--color-text) !important;
        }
        .mapboxgl-popup-tip {
           border-top-color: var(--color-card) !important;
           border-bottom-color: var(--color-card) !important;
        }
        .mapboxgl-popup-close-button {
           color: var(--color-text-muted);
           right: 8px; top: 8px;
        }
      `}</style>
        </DashboardLayout>
    );
}

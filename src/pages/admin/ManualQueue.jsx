import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import Map, { Marker, NavigationControl } from "react-map-gl";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function ManualQueue() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);

    const [viewState, setViewState] = useState({
        latitude: 28.4595, longitude: 77.0266, zoom: 12
    });
    const [pinDrop, setPinDrop] = useState(null);

    const fetchQueue = async () => {
        try {
            const { data } = await api.get('/tickets/master?needsManualGeo=true');
            setQueue(data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { fetchQueue(); }, []);

    const handleMapClick = (e) => {
        if (!selectedTicket) return toast("Select a ticket from the left first!");
        setPinDrop({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    const submitGeoFix = async () => {
        if (!pinDrop || !selectedTicket) return;
        try {
            await api.put(`/tickets/master/${selectedTicket.id}`, {
                lat: pinDrop.lat,
                lng: pinDrop.lng,
                needsManualGeo: false
            });
            toast.success("Coordinates appended! Ticket formally injected into deduplication map.");

            setPinDrop(null);
            setSelectedTicket(null);
            fetchQueue();
        } catch (err) {
            toast.error("Failed to update coordinates");
        }
    };

    return (
        <DashboardLayout title="Manual Intervention Queue" subtitle="Resolve NLP geocoding failures by manually dropping coordinates">
            <div className="grid md:grid-cols-3 gap-6 animate-fadeInUp">
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-semibold text-lg flex items-center justify-between">
                        Pending Resolution <span className="badge bg-[#f59e0b]/20 text-[#f59e0b]">{queue.length} Queue</span>
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-10"><div className="spinner" /></div>
                    ) : queue.length === 0 ? (
                        <div className="card text-center p-8">
                            <p className="text-3xl mb-2">🎉</p>
                            <p className="text-sm text-[var(--color-text-muted)]">Zero NLP failure fallback queue. AI is handling everything perfectly.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {queue.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => { setSelectedTicket(t); setPinDrop(null); }}
                                    className={`card p-4 cursor-pointer transition-all border-l-4 ${selectedTicket?.id === t.id ? 'border-[var(--color-primary)] bg-[var(--color-card-hover)]' : 'border-transparent hover:border-[var(--color-text-muted)]'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-sm">{t.intentCategory?.replace(/_/g, " ")}</span>
                                        <span className="text-xs text-[var(--color-text-muted)]">ID: {t.id.slice(0, 5)}</span>
                                    </div>
                                    <p className="text-sm text-[#f87171] mb-2 font-medium bg-[#ef4444]/10 p-2 rounded-md">
                                        📍 Vague Landmark Extracted:<br />
                                        <span className="text-[var(--color-text)]">"{t.landmark}"</span>
                                    </p>

                                    {t.audioUrl && (
                                        <audio src={t.audioUrl} controls className="w-full h-8 mt-2" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="md:col-span-2">
                    <div className="card p-0 flex flex-col h-[70vh] border-[var(--color-border)] relative overflow-hidden">
                        {/* Toolbar Header */}
                        <div className="bg-[var(--color-surface)] p-4 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-4 z-10">
                            <div>
                                {selectedTicket ? (
                                    <div className="flex items-center gap-2">
                                        <span className="animate-pulse w-3 h-3 bg-[#f59e0b] rounded-full"></span>
                                        <span className="text-sm font-medium">Click on map location for: <strong className="text-white">Ticket #{selectedTicket.id.slice(0, 5)}</strong></span>
                                    </div>
                                ) : (
                                    <span className="text-[var(--color-text-muted)] text-sm">Select ticket from sidebar to begin fixing vague locations.</span>
                                )}
                            </div>
                            {pinDrop && selectedTicket && (
                                <button onClick={submitGeoFix} className="btn-primary py-1.5 px-4 animate-fadeIn">
                                    Confirm Coordinates Fix ✅
                                </button>
                            )}
                        </div>

                        {/* Mapbox Area */}
                        <div className="flex-1 w-full bg-[#111] relative">
                            <Map
                                {...viewState}
                                onMove={evt => setViewState(evt.viewState)}
                                onClick={handleMapClick}
                                mapStyle="mapbox://styles/mapbox/dark-v11"
                                mapboxAccessToken={MAPBOX_TOKEN}
                                cursor={selectedTicket ? "crosshair" : "grab"}
                            >
                                <NavigationControl position="bottom-right" />
                                {pinDrop && (
                                    <Marker longitude={pinDrop.lng} latitude={pinDrop.lat}>
                                        <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] border-2 border-white shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-bounce" />
                                    </Marker>
                                )}
                            </Map>

                            {!selectedTicket && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
                                    <span className="badge bg-[#0f172a] text-lg border border-[var(--color-border)] shadow-2xl px-6 py-3">
                                        Awaiting Ticket Selection
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../utils/api";
import { getCurrentLocation } from "../../utils/geolocation";
import DEPARTMENTS, { getCategoryDepartment } from "../../data/departments";
import toast from "react-hot-toast";
import { HiOutlineLocationMarker, HiOutlinePhotograph, HiOutlineMicrophone } from "react-icons/hi";
import { MdStop } from "react-icons/md";
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRef } from "react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function SubmitComplaint() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [locating, setLocating] = useState(true);
    const [viewState, setViewState] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        zoom: 4,
    });

    const [form, setForm] = useState({
        category: "",
        description: "",
        landmark: "",
        lat: null,
        lng: null,
        accuracy: null,
        department: "",
        zone: "",
        wardNumber: "",
        locality: "",
        pincode: "",
    });

    const [imagePreviews, setImagePreviews] = useState([]);
    
    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const timerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        if (!navigator.geolocation) {
            const timer = setTimeout(() => setLocating(false), 0);
            return () => clearTimeout(timer);
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const live = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                };
                setForm((prev) => ({
                    ...prev,
                    lat: prev.lat ?? live.lat,
                    lng: prev.lng ?? live.lng,
                    accuracy: prev.accuracy ?? live.accuracy,
                }));
                setViewState((prev) => ({
                    ...prev,
                    latitude: live.lat,
                    longitude: live.lng,
                    zoom: prev.zoom < 14 ? 14 : prev.zoom,
                }));
                setLocating(false);
            },
            () => {
                setLocating(false);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "category") {
            const dept = getCategoryDepartment(value);
            setForm({ ...form, category: value, department: dept?.id || "" });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + imagePreviews.length > 5) {
            return toast.error("Maximum 5 images allowed");
        }
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews((prev) => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const captureLocation = async () => {
        setGeoLoading(true);
        try {
            const loc = await getCurrentLocation();
            setForm({ ...form, lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy });
            toast.success(`Location captured! Accuracy: ${Math.round(loc.accuracy)}m`);
        } catch (err) {
            toast.error(err.message);
        }
        setGeoLoading(false);
    };

    // --- Voice Recording Functions ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await processVoiceCommand(audioBlob);
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            toast("Recording started... Speak your complaint clearly.", { icon: "🎙️" });
        } catch (err) {
            console.error("Microphone access error:", err);
            toast.error("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsProcessingVoice(true);
            clearInterval(timerRef.current);
        }
    };

    const processVoiceCommand = async (blob) => {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
            const { data } = await api.post('/ai/voice-form-fill', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success) {
                setForm(prev => ({
                    ...prev,
                    category: data.primaryCategory || prev.category,
                    department: data.department || prev.department,
                    description: data.description || prev.description,
                    landmark: data.landmark || prev.landmark,
                    zone: data.zone || prev.zone,
                    wardNumber: data.wardNumber || prev.wardNumber,
                    locality: data.locality || prev.locality,
                    pincode: data.pincode || prev.pincode,
                }));
                toast.success("Form auto-filled from your voice command!");
            }
        } catch (err) {
            console.error("Voice processing error:", err);
            toast.error(err.response?.data?.message || "Failed to process voice command.");
        } finally {
            setIsProcessingVoice(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.category) return toast.error("Please select a category");
        if (!form.description) return toast.error("Please describe the issue");
        setLoading(true);

        try {
            const { data } = await api.post('/tickets/complaint', {
                primaryCategory: form.category,
                description: form.description,
                landmark: form.landmark,
                lat: form.lat,
                lng: form.lng,
                accuracy: form.accuracy,
                department: form.department,
                zone: form.zone,
                wardNumber: form.wardNumber,
                locality: form.locality,
                pincode: form.pincode,
                citizenImages: imagePreviews,
            });

            if (data.isNew) {
                toast.success("Complaint submitted! A new ticket has been created.");
            } else {
                toast.success(`Complaint linked to existing ticket. Severity increased to ${data.ticket.severity}.`);
            }

            if (data.needsManualGeo) {
                toast("📌 Location unclear — ticket sent to manual review queue.", { icon: "⚠️" });
            }

            navigate("/citizen/complaints");
        } catch (err) {
            console.error("Submit error:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to submit complaint.");
        }
        setLoading(false);
    };

    return (
        <DashboardLayout title="Submit Complaint" subtitle="Report a civic issue in your area">
            <div className="grid lg:grid-cols-5 gap-6 items-start">
                <form onSubmit={handleSubmit} className="space-y-6 animate-fadeInUp lg:col-span-3">
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-primary-light)]">1</span>
                                What's the issue?
                            </h3>
                            
                            <button
                                type="button"
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isProcessingVoice}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                                    isRecording 
                                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' 
                                        : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 hover:scale-105 active:scale-95'
                                }`}
                            >
                                {isProcessingVoice ? (
                                    <><div className="spinner w-3.5 h-3.5 border-2 border-current" /> Auto-filling Form...</>
                                ) : isRecording ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-white animate-ping mr-1" />
                                        <span className="font-mono">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                                        <MdStop className="text-lg" />
                                        <span>Stop Recording</span>
                                    </>
                                ) : (
                                    <><HiOutlineMicrophone className="text-lg" /> Speak Complaint</>
                                )}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Category</label>
                                <select name="category" value={form.category} onChange={handleChange} className="input-field" required>
                                    <option value="">Select a category</option>
                                    {DEPARTMENTS.map((dept) => (
                                        <optgroup key={dept.id} label={`${dept.icon} ${dept.name}`}>
                                            {dept.categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            {form.department && (
                                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-3">
                                    <span>🏛️</span>
                                    <span>Auto-routed to: <strong className="text-[var(--color-text)]">{DEPARTMENTS.find(d => d.id === form.department)?.name}</strong></span>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Describe the issue</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    className="input-field min-h-[120px]"
                                    placeholder="E.g., Large pothole on MG Road near the chai stall..."
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Evidence: Photo Upload */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center text-sm font-bold text-[#f59e0b]">2</span>
                            Upload Evidence Photos
                        </h3>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors border-[var(--color-border)] hover:border-[var(--color-primary)]">
                            <div className="w-12 h-12 rounded-full bg-[var(--color-card)] flex items-center justify-center mb-3 shadow-lg">
                                <HiOutlinePhotograph className="text-2xl text-[var(--color-primary)]" />
                            </div>
                            <p className="text-sm font-medium">Tap to Upload Photos (max 5)</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">JPG, PNG — helps verify the complaint</p>
                            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                        </label>
                        {imagePreviews.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-4">
                                {imagePreviews.map((src, i) => (
                                    <div key={i} className="relative group">
                                        <img src={src} alt={`Evidence ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-[var(--color-border)]" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(i)}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Location */}
                    <div className="card">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--color-accent-light)]">3</span>
                            Where is it?
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Landmark / Address</label>
                                <input
                                    name="landmark"
                                    type="text"
                                    value={form.landmark}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="E.g., Near Mother Dairy Booth, Sector 14"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Zone</label>
                                    <input name="zone" type="text" value={form.zone} onChange={handleChange} className="input-field" placeholder="E.g., South Zone" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Ward Number</label>
                                    <input name="wardNumber" type="text" value={form.wardNumber} onChange={handleChange} className="input-field" placeholder="E.g., Ward 54" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Locality</label>
                                    <input name="locality" type="text" value={form.locality} onChange={handleChange} className="input-field" placeholder="E.g., Lajpat Nagar" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-[var(--color-text-muted)]">Pincode</label>
                                    <input name="pincode" type="text" value={form.pincode} onChange={handleChange} className="input-field" placeholder="E.g., 110024" maxLength={6} />
                                </div>
                            </div>

                            <div>
                                <button type="button" onClick={captureLocation} disabled={geoLoading} className="btn-secondary w-full justify-center">
                                    {geoLoading ? (
                                        <><div className="spinner w-4 h-4 border-2" /> Detecting location...</>
                                    ) : form.lat ? (
                                        <><HiOutlineLocationMarker className="text-[#22c55e]" /> Location Captured ✓</>
                                    ) : (
                                        <><HiOutlineLocationMarker /> Capture My Live Location</>
                                    )}
                                </button>
                                {form.lat && (
                                    <div className="mt-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg p-3">
                                        📍 Lat: {form.lat.toFixed(6)}, Lng: {form.lng.toFixed(6)} (±{Math.round(form.accuracy)}m)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center py-3.5 text-base" disabled={loading}>
                        {loading ? <div className="spinner w-5 h-5 border-2" /> : "Submit Complaint"}
                    </button>
                </form>

                <div className="lg:col-span-2 card p-0 overflow-hidden animate-fadeInUp lg:sticky lg:top-6" style={{ animationDelay: "100ms" }}>
                    <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                        <h3 className="font-semibold">Your Live Location</h3>
                        <p className="text-xs text-[var(--color-text-muted)]">Map auto-follows your current position for better complaint accuracy.</p>
                    </div>

                    <div className="h-[360px] relative">
                        <Map
                            {...viewState}
                            onMove={(evt) => setViewState(evt.viewState)}
                            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                            mapboxAccessToken={MAPBOX_TOKEN}
                        >
                            <NavigationControl position="top-right" />

                            {Number.isFinite(form.lat) && Number.isFinite(form.lng) && (
                                <Marker longitude={form.lng} latitude={form.lat} anchor="bottom">
                                    <div className="w-4 h-4 rounded-full bg-[#2563eb] border-2 border-white shadow-[0_0_10px_rgba(37,99,235,0.7)]" />
                                </Marker>
                            )}
                        </Map>

                        {locating && (
                            <div className="absolute inset-0 bg-white/85 flex items-center justify-center text-sm font-semibold text-[var(--color-text-muted)]">
                                Detecting live location...
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-3 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                        {Number.isFinite(form.lat) && Number.isFinite(form.lng)
                            ? `Lat ${form.lat.toFixed(6)}, Lng ${form.lng.toFixed(6)} (±${Math.round(form.accuracy || 0)}m)`
                            : "Location not available yet. Please allow location access."}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

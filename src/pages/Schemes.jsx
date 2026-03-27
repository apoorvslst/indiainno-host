import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiOutlineMicrophone, HiMicrophone, HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineExternalLink } from 'react-icons/hi';
import DashboardLayout from '../components/DashboardLayout';
import api from '../utils/api';
import './Schemes.css';

const SECTORS = [
    {
        key: 'farming',
        label: 'Farming',
        emoji: '',
        color: '#004B87',
        bg: '#ffffff',
        border: '#cccccc',
        desc: 'PM-KISAN, crop insurance, irrigation & farmer welfare schemes',
    },
    {
        key: 'education',
        label: 'Education',
        emoji: '',
        color: '#004B87',
        bg: '#ffffff',
        border: '#cccccc',
        desc: 'Scholarships, skill development, digital & higher education',
    },
    {
        key: 'financial',
        label: 'Financial',
        emoji: '',
        color: '#004B87',
        bg: '#ffffff',
        border: '#cccccc',
        desc: 'Jan Dhan, MUDRA loans, startup India & MSME support',
    },
    {
        key: 'development',
        label: 'Development',
        emoji: '',
        color: '#004B87',
        bg: '#ffffff',
        border: '#cccccc',
        desc: 'Rural infra, smart cities, roads, housing & water supply',
    },
    {
        key: 'health',
        label: 'Health',
        emoji: '',
        color: '#004B87',
        bg: '#ffffff',
        border: '#cccccc',
        desc: 'Ayushman Bharat, nutrition, wellness & hospital programs',
    },
    {
        key: 'women',
        label: 'Women',
        emoji: '',
        color: '#004B87',
        bg: '#ffffff',
        border: '#cccccc',
        desc: 'Mahila empowerment, Beti Bachao, Ujjwala & SHG schemes',
    },
];

export default function Schemes() {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [allData, setAllData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeSector, setActiveSector] = useState(null);

    // Voice Search State
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState('');
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchSchemes();
    }, [user]);

    const fetchSchemes = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/schemes');
            if (res.data.success) {
                setAllData(res.data.data);
            } else {
                setError(res.data.message || 'Failed to load schemes');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Could not connect to server.');
        }
        setLoading(false);
    };

    const currentSector = SECTORS.find(s => s.key === activeSector);
    const sectorSchemes = allData[activeSector] || [];

    // --- VOICE SEARCH HANDLING ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = processVoiceSearch;

            mediaRecorder.current.start();
            setIsRecording(true);
            setVoiceFeedback('Listening... Speak now.');
        } catch (err) {
            console.error("Mic access denied:", err);
            setVoiceFeedback('Microphone access denied.');
            setTimeout(() => setVoiceFeedback(''), 3000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setVoiceFeedback('Processing your voice...');
        }
    };

    const processVoiceSearch = async () => {
        setIsProcessingVoice(true);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
            const res = await api.post('/ai/voice-scheme-search', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success && res.data.query) {
                setVoiceFeedback(`Found: "${res.data.query}"`);

                // Set fake search result sector
                const searchQuery = res.data.query;
                setAllData(prev => ({
                    ...prev,
                    searchResult: [
                        {
                            title: searchQuery,
                            description: `Search result retrieved via Voice (${res.data.language || 'en'})`,
                            pubDate: new Date().toISOString(),
                            link: '#',
                            isSearchResult: true
                        }
                    ]
                }));
                setActiveSector('searchResult');

            } else if (!res.data.success) {
                // Safely handle the empty-recording payload returned by our API
                setVoiceFeedback(res.data.message || 'Could not understand audio.');
            } else {
                setVoiceFeedback(`Heard: "${res.data.transcript}" but couldn't identify a scheme.`);
            }
        } catch (err) {
            setVoiceFeedback('Failed to process voice. Try again.');
        }

        setIsProcessingVoice(false);
        setTimeout(() => setVoiceFeedback(''), 5000);
    };

    let displaySector = currentSector;
    let displaySchemes = sectorSchemes;
    if (activeSector === 'searchResult') {
        displaySector = { label: 'Voice Search Results', key: 'searchResult', desc: 'Schemes matched from voice' };
        displaySchemes = allData['searchResult'] || [];
    }

    return (
        <DashboardLayout title="Government Schemes" subtitle="Discover and track official government announcements">
            <div className="schemes-page w-full pb-10">
                <div className="schemes-header flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-[var(--color-text)]">Latest Government Schemes</h1>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">
                            Official announcements & schemes for <strong>{userProfile?.city || 'your area'}</strong>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Voice Search Widget */}
                        <div className="flex items-center gap-3 bg-[var(--color-surface)] p-2 rounded-full border border-[var(--color-border)] shadow-sm">
                            <button
                                onMouseDown={startRecording}
                                onMouseUp={stopRecording}
                                onTouchStart={startRecording}
                                onTouchEnd={stopRecording}
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}
                                title="Hold to speak (e.g., 'MP scholar scheme')"
                            >
                                {isRecording ? <HiMicrophone className="text-2xl" /> : <HiOutlineMicrophone className="text-2xl" />}
                            </button>
                            <div className="px-3 min-w-[150px]">
                                {isProcessingVoice ? (
                                    <p className="text-xs font-semibold text-blue-600 animate-pulse">Processing AI...</p>
                                ) : voiceFeedback ? (
                                    <p className="text-xs font-medium text-green-600">{voiceFeedback}</p>
                                ) : (
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--color-text)]">Voice Search</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Hold mic & speak in any lang</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={fetchSchemes} className="btn-secondary whitespace-nowrap hidden md:block">Refresh PIB</button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state h-64 flex flex-col items-center justify-center">
                        <div className="spinner"></div>
                        <p className="text-[var(--color-text-muted)] mt-4">Fetching schemes...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>{error}</p>
                        <button onClick={fetchSchemes} className="btn-primary mt-4">Try Again</button>
                    </div>
                ) : activeSector === null ? (
                    <div className="sector-grid-view mt-6">
                        <p className="text-[var(--color-text-muted)] mb-4 font-medium">Browse Categories</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {SECTORS.map(s => (
                                <div
                                    key={s.key}
                                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
                                    onClick={() => setActiveSector(s.key)}
                                >
                                    <h2 className="text-xl font-bold text-blue-900 group-hover:text-blue-600 mb-2">{s.label}</h2>
                                    <p className="text-sm text-[var(--color-text-muted)] h-12">{s.desc}</p>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--color-border)]">
                                        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                                            {allData[s.key]?.length || 0} schemes
                                        </span>
                                        <span className="text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform">View →</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="drilldown-view mt-6">
                        <div className="flex items-center justify-between mb-8">
                            <button
                                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                onClick={() => setActiveSector(null)}
                            >
                                ← Back
                            </button>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold text-[var(--color-text)]">{displaySector?.label} Schemes</h2>
                                <p className="text-sm text-[var(--color-text-muted)]">{displaySchemes.length} results found</p>
                            </div>
                        </div>

                        {displaySchemes.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                                <p className="text-gray-500 font-medium">No recent {displaySector?.label} announcements found.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {displaySchemes.map((scheme, idx) => (
                                    <SchemeCard key={idx} scheme={scheme} sector={displaySector} forceExpand={scheme.isSearchResult} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function SchemeCard({ scheme, sector, forceExpand = false }) {
    const [expanded, setExpanded] = useState(forceExpand);
    const [loadingAI, setLoadingAI] = useState(false);
    const [aiDetails, setAiDetails] = useState(null);

    const date = scheme.pubDate
        ? new Date(scheme.pubDate).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
        : 'Recent';

    // Fetch AI details only when expanded for the first time
    useEffect(() => {
        if (expanded && !aiDetails && !loadingAI) {
            fetchAIDetails();
        }
    }, [expanded]);

    const fetchAIDetails = async () => {
        setLoadingAI(true);
        try {
            const res = await api.post('/ai/scheme-details', { schemeName: scheme.title });
            if (res.data.success) {
                setAiDetails({
                    overview: res.data.overview,
                    importantInfo: res.data.importantInfo,
                    deadline: res.data.deadline,
                    safeLink: res.data.safeLink
                });
            }
        } catch (err) {
            console.error("Failed to fetch AI scheme details", err);
        }
        setLoadingAI(false);
    };

    return (
        <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {sector.label}
                    </span>
                    <span className="text-xs text-slate-400 font-medium px-2">{date}</span>
                </div>

                <h3 className="text-lg font-bold text-[#0f172a] pr-8">{scheme.title}</h3>

                {!expanded && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {scheme.description}
                    </p>
                )}

                <div className="flex justify-between items-center mt-4">
                    <button className="text-sm font-semibold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors">
                        {expanded ? (
                            <>Collapse <HiOutlineChevronUp /></>
                        ) : (
                            <>Read Full Details <HiOutlineChevronDown /></>
                        )}
                    </button>
                    {!expanded && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">AI Summary Available</span>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="bg-slate-50 border-t border-slate-100 p-5">
                    {loadingAI ? (
                        <div className="animate-pulse flex flex-col gap-3">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                        </div>
                    ) : aiDetails ? (
                        <div className="animate-fadeInUp space-y-4">
                            <div>
                                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">AI Overview</h4>
                                <p className="text-sm text-slate-700 leading-relaxed">{aiDetails.overview}</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Important Information</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {aiDetails.importantInfo?.map((info, i) => (
                                            <li key={i} className="text-sm text-slate-700">{info}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Application Deadline</h4>
                                        <p className="text-sm font-medium text-amber-700">{aiDetails.deadline}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <a
                                            href={aiDetails.safeLink !== '#' ? aiDetails.safeLink : scheme.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full btn-primary flex justify-center items-center gap-2 py-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Official Portal <HiOutlineExternalLink />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-600">
                            <p className="mb-3">{scheme.description}</p>
                            <a href={scheme.link} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline">
                                View Original Content on PIB
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import { supabase } from '../../utils/supabaseClient';
import {
    Search,
    Bell,
    MessageSquare,
    ChevronDown,
    AlertTriangle,
    Droplet,
    Thermometer,
    Trash2,
    Send,
    CheckCircle,
    Sparkles
} from 'lucide-react';
import { analyzeIncidentImage, classifyIncidentText, checkDuplicateIncident } from '../../utils/aiService';
import DashboardHeader from '../../components/common/DashboardHeader';
import { useTranslation } from '../../utils/translations';
import { usePreferences } from '../../context/PreferencesContext';
import { sendIncidentAcknowledgment } from '../../utils/notifyService';
import { computeIncidentPriorityScore } from '../../utils/incidentPriority';

export default function ReportIncident() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { language } = usePreferences();
    const { t } = useTranslation(language);

    const [formData, setFormData] = useState({
        type: 'Pipe Leakage',
        location: '',
        description: '',
        severity: 'Medium',
        contact_number: '',
        latitude: null,
        longitude: null
    });

    const [detecting, setDetecting] = useState(false);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [existingIncidents, setExistingIncidents] = useState([]);
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [aiClassifying, setAiClassifying] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        fetchExistingIncidents();
    }, [navigate]);

    const fetchExistingIncidents = async () => {
        try {
            // Capstone requirement: temporal proximity within 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from('incidents')
                .select('id, type, location, description, latitude, longitude, status, created_at')
                .neq('status', 'Resolved')
                .gte('created_at', twentyFourHoursAgo)
                .order('created_at', { ascending: false });
            if (data) setExistingIncidents(data);
        } catch (err) {
            console.error("Error fetching incidents for duplicate check:", err);
        }
    };

    const trackLocation = () => {
        setDetecting(true);
        setFeedback(null);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData({
                        ...formData,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        location: `GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
                    });
                    setDetecting(false);
                },
                (error) => {
                    console.error("Error detecting location:", error);
                    setFeedback({ type: 'error', message: "Could not detect location. Please type it manually." });
                    setDetecting(false);
                }
            );
        } else {
            setFeedback({ type: 'error', message: "Geolocation is not supported by your browser." });
            setDetecting(false);
        }
    };

    const handleDescriptionChange = async (e) => {
        const text = e.target.value;
        setFormData({ ...formData, description: text });

        // Trigger AI only after 15 characters to avoid spamming
        if (text.length > 15) {
            setAiClassifying(true);

            // 1. Auto-classify type and severity
            const classification = await classifyIncidentText(text);
            if (classification) {
                setFormData(prev => ({
                    ...prev,
                    type: classification.type,
                    severity: classification.severity
                }));
            }

            // 2. Check for duplicates if location is also set
            if (formData.latitude && formData.longitude) {
                const dupeResult = await checkDuplicateIncident(text, formData.latitude, formData.longitude, existingIncidents);
                if (dupeResult.is_duplicate) {
                    setDuplicateWarning({
                        message: `Potential duplicate detected (${Math.round(dupeResult.confidence * 100)}% match). An incident with ID #${dupeResult.match.id} was already reported nearby.`,
                        match: dupeResult.match
                    });
                } else {
                    setDuplicateWarning(null);
                }
            }
            setAiClassifying(false);
        } else {
            setDuplicateWarning(null);
        }
    };

    const [scanning, setScanning] = useState(false);

    /**
     * Real-Time AI Computer Vision Scan
     * Uses MobileNet via TensorFlow.js to accurately identify image content
     */
    const performRealAiScan = async (imageElement) => {
        try {
            // 1. Load the MobileNet model (cached by browser after first run)
            const model = await window.mobilenet.load();

            // 2. Classify the image
            const predictions = await model.classify(imageElement);
            console.log("AI Scanned Predictions:", predictions);

            // 3. Define Water/Utility Related Keywords (Whitelist)
            // Extensively expanded to include hoses, fixtures, and common visual misclassifications for long pipes/lines
            const waterKeywords = [
                'water', 'pipe', 'leak', 'faucet', 'puddle', 'plumbing', 'sink',
                'sewer', 'road', 'street', 'paving', 'river', 'lake', 'rain',
                'bucket', 'container', 'valve', 'hydrant', 'spout', 'metallic',
                'ground', 'asphalt', 'soil', 'drain', 'canal', 'ditch', 'tank', 'well',
                'conduit', 'excavation', 'trench', 'infrastructure', 'hose', 'nozzle',
                'spray', 'fountain', 'sundial', 'construction', 'utility', 'plumber',
                'tube', 'tubing', 'garden hose', 'fixture', 'pavement', 'concrete',
                'whiptail', 'lizard', 'snake', 'worm', 'garter', 'eel', 'line', 'wire',
                'cannon', 'barrel', 'cylinder', 'artillery', 'gun', 'projectile', 'weapon',
                'missile', 'submarine', 'train', 'locomotive', 'boiler', 'engine', 'machine'
            ];

            // 4. Multi-Label Validation: Check if ANY of the top 8 predictions match our service domain
            // We check more labels (8) and use a lower probability floor (3%) to catch blurry or specific leaks
            const topMatch = predictions[0];
            const relatedCount = predictions.filter((p, i) =>
                i < 8 &&
                p.probability > 0.03 &&
                waterKeywords.some(kw => p.className.toLowerCase().includes(kw))
            ).length;

            const isRelated = relatedCount >= 1;

            if (!isRelated || (topMatch.probability < 0.08 && relatedCount < 2)) {
                // If it is completely unrelated with high confidence (e.g. a 90% cat), show warning
                return {
                    isValid: false,
                    label: topMatch.className,
                    error: `AI Logic Unsure: This looks like a '${topMatch.className}'. If this is a genuine water leak, please try a closer photo or use manual upload.`
                };
            }

            // 5. If valid, return classification for auto-fill
            return {
                isValid: true,
                label: topMatch.className,
                predictions: predictions
            };
        } catch (err) {
            console.error("AI Vision Error:", err);
            return { isValid: true, fallback: true }; // Allow fallback if TF.js fails
        }
    };

    /**
     * Centralized Image Processing Core
     * Handles both File Selection & Clipboard Paste
     */
    const processImage = async (file) => {
        if (!file) return;

        setImage(file);
        const reader = new FileReader();

        setScanning(true);
        setFeedback({ type: 'success', message: 'Smart CSM AI: Initializing Computer Vision... 🧠' });

        reader.onloadend = async () => {
            setImagePreview(reader.result);

            // Perform Real Vision Scan
            const img = new Image();
            img.src = reader.result;
            img.onload = async () => {
                const scanResult = await performRealAiScan(img);

                if (!scanResult.isValid) {
                    setFeedback({ type: 'error', message: scanResult.error });
                    setImage(null);
                    setImagePreview(null);
                    setScanning(false);
                    return;
                }

                // Genuine Analysis Result
                setFeedback({ type: 'success', message: 'Vision Verified: Authenticating incident data... 🤖' });
                try {
                    const result = await analyzeIncidentImage(file);

                    // If it's a "Road" or "Puddle", AI might categorize it better
                    let bestType = result.type;
                    if (scanResult.label.toLowerCase().includes('water') || scanResult.label.toLowerCase().includes('puddle')) {
                        bestType = "Pipe Leakage";
                    }

                    setFormData(prev => ({
                        ...prev,
                        type: bestType,
                        severity: result.severity,
                        description: `AI Visual Core identified ${scanResult.label}. ${result.description}`
                    }));

                    setFeedback({ type: 'success', message: `AI Verified: ${bestType}` });

                    // Trigger duplicate check
                    if (formData.latitude && formData.longitude) {
                        const dupeResult = await checkDuplicateIncident(result.description, formData.latitude, formData.longitude, existingIncidents);
                        if (dupeResult.is_duplicate) {
                            setDuplicateWarning({
                                message: `AI found a similar report nearby (${Math.round(dupeResult.confidence * 100)}% match)`,
                                match: dupeResult.match
                            });
                        }
                    }
                } catch (err) {
                    console.error(err);
                    setFeedback({ type: 'error', message: 'AI processing failed.' });
                } finally {
                    setScanning(false);
                    setTimeout(() => setFeedback(null), 4000);
                }
            };
        };
        reader.readAsDataURL(file);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        processImage(file);
    };

    // Global Paste Listener for Computer Users
    useEffect(() => {
        const handlePaste = (e) => {
            // Only handle paste if something isn't being typed in a text field
            if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
            if (e.target.tagName === 'TEXTAREA') return;

            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    processImage(file);
                    // Feedback for paste action
                    setFeedback({ type: 'success', message: 'Pasted image detected! Analyzing... 📋' });
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [formData.latitude, formData.longitude, existingIncidents]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Capstone Requirement: Offline Emergency SMS Fallback protocol
        if (!navigator.onLine) {
            setFeedback({ type: 'error', message: 'No internet connection. Generating SMS Fallback...' });
            setTimeout(() => {
                const smsBody = `PWD-ALERT: ${formData.type} at ${formData.location}. Severity: ${formData.severity}. Reporter Contact: ${formData.contact_number}.`;
                window.location.href = `sms:09171234567?body=${encodeURIComponent(smsBody)}`;
                setLoading(false);
            }, 1000);
            return;
        }

        try {
            const priority_score = computeIncidentPriorityScore({
                type: formData.type,
                severity: formData.severity,
                description: formData.description,
                latitude: formData.latitude,
                longitude: formData.longitude,
                existingIncidents,
            });

            const { data: inserted, error } = await supabase
                .from('incidents')
                .insert([
                    {
                        type: formData.type,
                        location: formData.location,
                        description: formData.description,
                        severity: formData.severity,
                        priority_score,
                        user_id: user.id,
                        user_name: user.name, // Added for admin clarity
                        contact_number: formData.contact_number,
                        latitude: formData.latitude,
                        longitude: formData.longitude
                    }
                ])
                .select('id')
                .single();

            if (error) throw error;

            const sessionUser = getCurrentUser();
            const ackBatchId =
                typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ack-${Date.now()}`;
            void sendIncidentAcknowledgment({
                phone: formData.contact_number,
                email: sessionUser?.email,
                incidentId: inserted?.id,
                type: formData.type,
                location: formData.location,
                batchId: ackBatchId,
                contextType: 'incident_ack',
                contextId: inserted?.id,
                createdBy: sessionUser?.id || null,
            }).catch((ackErr) => console.warn('[acknowledgment]', ackErr));

            setLoading(false);
            setSubmitted(true);
            // Reset form
            setFormData({
                type: 'Pipe Leakage',
                location: '',
                description: '',
                severity: 'Medium'
            });
            // After 3 seconds, redirect to dashboard
            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);
        } catch (error) {
            console.error('Error submitting report:', error);
            const msg = String(error?.message || error || '');
            const rls =
                msg.toLowerCase().includes('row-level security') || error?.code === '42501';
            setFeedback({
                type: 'error',
                message: rls
                    ? 'Could not save: database rules blocked this report. In Supabase SQL Editor, run migrations/incidents_rls_insert_residents.sql, then try again.'
                    : msg
                      ? `Could not submit: ${msg}`
                      : 'Failed to submit report. Please try again.',
            });
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title={t('report_incident')}
                    subtitle={t('keep_services_running')}
                    icon={<AlertTriangle size={28} />}
                    iconBgColor="bg-gradient-to-br from-blue-600 to-indigo-600"
                />

                {/* Feedback Message */}
                {feedback && (
                    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl font-bold text-sm shadow-2xl flex items-center gap-3 animate-slide-up ${feedback.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                        {feedback.message}
                        <button onClick={() => setFeedback(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full"><ChevronDown size={12} className="rotate-180" /></button>
                    </div>
                )}

                <div className="max-w-4xl">
                    {submitted ? (
                        <div className="floating-card p-16 text-center animate-slide-up">
                            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-500 shadow-inner">
                                <CheckCircle size={56} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">{t('success_ticket_created')}</h3>
                            <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium">{t('report_logged_desc', { id: Date.now().toString().slice(-6) })}</p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
                            >
                                {t('return_to_dashboard')}
                            </button>
                        </div>
                    ) : (
                        <div className="floating-card p-10 overflow-hidden relative">
                            {/* Decorative background blur */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                            <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                                <div className="grid md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('incident_category')}</label>
                                        <div className="relative">
                                            <select
                                                className="w-full h-16 pl-6 pr-12 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                                                value={formData.type}
                                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="Pipe Leakage">{t('pipe_leakage')}</option>
                                                <option value="No Water Supply">{t('no_water_supply')}</option>
                                                <option value="Low Water Pressure">{t('low_pressure')}</option>
                                                <option value="Contaminated Water">{t('contaminated_water')}</option>
                                                <option value="Broken Water Meter">{t('broken_meter')}</option>
                                                <option value="Other / Maintenance">{t('other_maintenance')}</option>
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('severity_impact')}</label>
                                        <div className="flex gap-3 h-16">
                                            {['Low', 'Medium', 'High'].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, severity: level })}
                                                    className={`flex-1 rounded-2xl font-black text-sm transition-all border ${formData.severity === level
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/10'
                                                        : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {t(level.toLowerCase())}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('location_identity')}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder={t('area_placeholder')}
                                                className="w-full h-16 pl-6 pr-16 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={trackLocation}
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl ${formData.latitude ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'} shadow-lg hover:scale-110 active:scale-95 transition-all`}
                                            >
                                                {detecting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Droplet size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('contact_number')}</label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder={t('contact_placeholder')}
                                            className="w-full h-16 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                            value={formData.contact_number}
                                            onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Image Upload Section */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t('evidence_photo')}</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="evidence-upload"
                                        />
                                        <label
                                            htmlFor="evidence-upload"
                                            className={`w-full h-[350px] md:h-[450px] p-2 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group/upload ${imagePreview ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            {imagePreview ? (
                                                <div className="relative w-full h-full">
                                                    <img src={imagePreview} alt="Preview" className={`w-full h-full object-contain rounded-2xl transition-all duration-700 ${scanning ? 'brightness-[0.4] contrast-125 saturate-0' : 'brightness-100'}`} />

                                                    {/* AI Scanning HUD Overlay */}
                                                    {scanning && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                                            <div className="w-full h-1 bg-blue-400/80 absolute top-0 left-0 shadow-[0_0_20px_#60a5fa] animate-scan-line"></div>
                                                            <div className="flex flex-col items-center gap-4">
                                                                <div className="w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-full animate-spin"></div>
                                                                <div className="px-4 py-2 bg-blue-500/20 backdrop-blur-md rounded-full border border-blue-500/30 text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">
                                                                    {t('ai_analyzing')}
                                                                </div>
                                                            </div>

                                                            {/* HUD Corners */}
                                                            <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-blue-400/50"></div>
                                                            <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-blue-400/50"></div>
                                                            <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-blue-400/50"></div>
                                                            <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-blue-400/50"></div>
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        disabled={scanning}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setImage(null);
                                                            setImagePreview(null);
                                                        }}
                                                        className="absolute top-6 right-6 p-3 bg-rose-500 text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all z-20"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 text-slate-400">
                                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform text-blue-500">
                                                        <Sparkles size={28} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-black text-slate-800 text-sm uppercase tracking-widest">{t('snap_evidence')}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{t('aqua_vision_enabled')}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                    </div>

                                    {/* Send to Admin Button - Only shows when image is previewed */}
                                    {imagePreview && !scanning && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setFeedback({ type: 'success', message: 'Forwarding Aqua\'s analysis and photo to Admin... 📤' });
                                                    setTimeout(() => {
                                                        navigate('/messages', { state: { initialMsg: `Hi Admin, Aqua analyzed my photo: ${formData.description}. Can you help?` } });
                                                    }, 1500);
                                                }}
                                                className="px-5 py-2.5 bg-slate-800 text-white rounded-[14px] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                            >
                                                <MessageSquare size={14} /> {t('send_photo_admin')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center ml-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('context_description')}</label>
                                        {aiClassifying && <span className="text-[9px] font-black text-blue-500 animate-pulse uppercase tracking-widest">{t('ai_categorizing')}</span>}
                                    </div>

                                    {duplicateWarning && (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 animate-shake mb-4">
                                            <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                            <div>
                                                <p className="text-xs font-black text-amber-800 uppercase tracking-tight">{t('possible_duplicate')}</p>
                                                <p className="text-xs text-amber-700 font-medium leading-relaxed mt-0.5">{duplicateWarning.message}</p>
                                            </div>
                                        </div>
                                    )}

                                    <textarea
                                        required
                                        rows={4}
                                        placeholder={t('description_placeholder')}
                                        className={`w-full p-6 rounded-3xl bg-slate-50 border outline-none transition-all font-bold text-slate-700 resize-none ${duplicateWarning ? 'border-amber-300 focus:border-amber-500' : 'border-slate-100 focus:bg-white focus:border-blue-500'}`}
                                        value={formData.description}
                                        onChange={handleDescriptionChange}
                                    ></textarea>
                                </div>

                                <div className="pt-4 flex items-center justify-between gap-6">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/dashboard')}
                                        className="px-8 py-5 text-slate-400 font-black text-sm uppercase tracking-widest hover:text-slate-600 transition-all"
                                    >
                                        {t('discard')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[24px] py-5 font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                {t('submit_full_report')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Quick Guidance Alert */}
                    {!submitted && (
                        <div className="mt-8 p-8 rounded-[32px] bg-slate-100/50 backdrop-blur-sm border border-white flex items-center gap-6 group hover:bg-white hover:shadow-xl transition-all duration-500">
                            <div className="p-4 bg-white rounded-2xl text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{t('emergency_protocol')}</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{t('immediate_contact_hotline')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
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
    Info,
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
        address_details: '',
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
    const [scanning, setScanning] = useState(false);
    const [activeAdvisories, setActiveAdvisories] = useState([]);
    const [scheduleWarning, setScheduleWarning] = useState(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        setUser(currentUser);
        fetchExistingIncidents();
        fetchActiveAdvisories();
    }, [navigate]);

    const fetchActiveAdvisories = async () => {
        try {
            const { data } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true);
            if (data) setActiveAdvisories(data);
        } catch (err) {
            console.error("Error fetching advisories:", err);
        }
    };

    const fetchExistingIncidents = async () => {
        try {
            // Capstone requirement: temporal proximity within 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from('incidents')
                .select('id, type, location, description, latitude, longitude, status, created_at, image_hash')
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
                setFormData(prev => {
                    const newType = classification.type;
                    
                    // Check integration schedule
                    if (newType === 'No Water' || newType === 'Low Pressure') {
                        const relatedAdvisory = activeAdvisories.find(a => 
                            a.location && formData.location && 
                            (formData.location.toLowerCase().includes(a.location.toLowerCase()) || a.location.toLowerCase().includes('all'))
                        );
                        if (relatedAdvisory) {
                            setScheduleWarning(`Notice: There is currently a scheduled ${relatedAdvisory.type} in your area (${relatedAdvisory.location}). This may be the cause of your issue.`);
                        } else {
                            setScheduleWarning(null);
                        }
                    } else {
                        setScheduleWarning(null);
                    }

                    return {
                        ...prev,
                        type: newType,
                        severity: classification.severity
                    };
                });
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
            setScheduleWarning(null);
        }
    };

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
        setScanning(true);
        setFeedback({ type: 'info', message: 'Aqua AI is currently scanning your image. Please wait...' });

        // Compress Image efficiently
        try {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            setImage(compressedFile);
        } catch (error) {
            console.error("Compression error:", error);
            setImage(file); // fallback
        }

        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);

        // Perform Real Vision Scan
        const img = new Image();
        img.src = objectUrl;
        img.onload = async () => {
            const scanResult = await performRealAiScan(img);

            if (!scanResult.isValid) {
                setFeedback({ type: 'error', message: scanResult.error });
                setImage(null);
                setImagePreview(null);
                URL.revokeObjectURL(objectUrl);
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
            // Check for duplicate flag
            let finalDescription = formData.description;
            if (duplicateWarning) {
                finalDescription = `[DUPLICATE of #${duplicateWarning.match.id}] ${finalDescription}`;
                toast.error("Duplicate warning logged with submission.");
            }

            // Upload image to Supabase Storage if it exists
            let evidence_url = null;
            let image_hash = null;

            if (image) {
                // Generate SHA-256 hash of the image to check for exact duplicates
                try {
                    const arrayBuffer = await image.arrayBuffer();
                    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    image_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                    // Check if an incident with this exact image already exists
                    if (existingIncidents.some(inc => inc.image_hash === image_hash)) {
                        toast.error("This exact image has already been submitted in another report. Please upload a new image to avoid duplication.");
                        setLoading(false);
                        return;
                    }
                } catch (hashErr) {
                    console.error("Hashing error:", hashErr);
                }

                try {
                    const fileExt = image.name?.split('.').pop() || 'jpg';
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `${user.id}/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage.from('evidence').upload(filePath, image);
                    
                    if (uploadError) {
                        console.error("Storage upload failed completely! Error details:", uploadError);
                        throw new Error(`Image upload failed: ${uploadError.message}`);
                    }
                    
                    const { data } = supabase.storage.from('evidence').getPublicUrl(filePath);
                    evidence_url = data.publicUrl;
                } catch (imgErr) {
                    console.error("Image processing error:", imgErr);
                    toast.error(imgErr.message || "Failed to upload image.");
                    setLoading(false);
                    return; // Stop submission if image fails
                }
            }

            const { error } = await supabase
                .from('incidents')
                .insert([
                    {
                        type: formData.type,
                        location: formData.location,
                        description: finalDescription,
                        severity: formData.severity,
                        user_id: user.id,
                        user_name: user.name, // Added for admin clarity
                        contact_number: formData.contact_number,
                        latitude: formData.latitude,
                        longitude: formData.longitude,
                        image_hash: image_hash, // Save hash to prevent future duplicates
                        evidence_url: evidence_url // Reverted to evidence_url
                    }
                ]);

            if (error) throw error;

            // Notify admins
            try {
                const { data: admins } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'admin');

                if (admins && admins.length > 0) {
                    const adminNotifications = admins.map(admin => ({
                        user_id: admin.id,
                        title: 'New Incident Reported',
                        message: `${user.name} reported a ${formData.severity} priority ${formData.type} at ${formData.location}.`,
                        type: 'alert',
                        read: false,
                        created_at: new Date().toISOString()
                    }));
                    await supabase.from('notifications').insert(adminNotifications);
                }
            } catch (notifErr) {
                console.error("Failed to notify admins", notifErr);
            }

            if (error) throw error;

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
            console.error('Error submitting report:', error.message);
            setFeedback({ type: 'error', message: `Failed to submit report: ${error.message}` });
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
                    icon={<AlertTriangle size={24} toggleSidebar={toggleSidebar}
                    />}
                />

                {/* Feedback Message */}
                {feedback && (
                    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm flex items-center gap-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {feedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                        {feedback.message}
                        <button onClick={() => setFeedback(null)} className="ml-2 hover:bg-black/5 p-1 rounded-full"><ChevronDown size={14} className="rotate-180" /></button>
                    </div>
                )}

                <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
                    {submitted ? (
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('success_ticket_created')}</h3>
                            <p className="text-slate-500 mb-8 max-w-sm mx-auto">{t('report_logged_desc', { id: Date.now().toString().slice(-6) })}</p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
                            >
                                {t('return_to_dashboard')}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('incident_category')}</label>
                                        <div className="relative">
                                            <select
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors appearance-none cursor-pointer"
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
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('severity_impact')}</label>
                                        <div className="flex gap-2">
                                            {['Low', 'Medium', 'High'].map((level) => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, severity: level })}
                                                    className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors border ${formData.severity === level
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {t(level.toLowerCase())}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('location_identity')}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                placeholder={t('area_placeholder')}
                                                className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={trackLocation}
                                                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${formData.latitude ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} transition-colors`}
                                                title="Detect Location"
                                            >
                                                {detecting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Droplet size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">{t('contact_number')}</label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder={t('contact_placeholder')}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                            value={formData.contact_number}
                                            onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">{t('specific_address', 'Specific Address / Landmark')}</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Near the old mango tree, Block 4"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                                        value={formData.address_details}
                                        onChange={(e) => setFormData({ ...formData, address_details: e.target.value })}
                                    />
                                </div>

                                {/* Image Upload Section */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">{t('evidence_photo')}</label>
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
                                            className={`w-full h-48 md:h-64 p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group ${imagePreview ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            {imagePreview ? (
                                                <div className="relative w-full h-full flex items-center justify-center">
                                                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg transition-opacity duration-300 opacity-100" />

                                                    <button
                                                        type="button"
                                                        disabled={scanning}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setImage(null);
                                                            setImagePreview(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-white text-rose-600 rounded-lg shadow-sm border border-slate-200 hover:bg-rose-50 transition-colors z-20"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-500">
                                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm text-blue-500">
                                                        <Sparkles size={20} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-medium text-sm text-slate-700">{t('snap_evidence')}</p>
                                                        <p className="text-xs text-slate-500">{t('aqua_vision_enabled')}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                    </div>

                                    {/* Send to Admin Button - Only shows when image is previewed */}
                                    {imagePreview && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setFeedback({ type: 'success', message: 'Forwarding analysis to Admin...' });
                                                    setTimeout(() => {
                                                        navigate('/messages', { state: { initialMsg: `Hi Admin, analyzed my photo: ${formData.description}. Can you help?` } });
                                                    }, 1500);
                                                }}
                                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                                            >
                                                <MessageSquare size={14} /> {t('send_photo_admin')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-slate-700">{t('context_description')}</label>
                                        {aiClassifying && <span className="text-xs font-medium text-blue-600">{t('ai_categorizing')}</span>}
                                    </div>

                                    {duplicateWarning && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 mb-3">
                                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-sm font-medium text-amber-800">{t('possible_duplicate')}</p>
                                                <p className="text-xs text-amber-700 mt-0.5">{duplicateWarning.message}</p>
                                            </div>
                                        </div>
                                    )}

                                    {scheduleWarning && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 mb-3">
                                            <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">Scheduled Integration Notice</p>
                                                <p className="text-xs text-blue-700 mt-0.5">{scheduleWarning}</p>
                                            </div>
                                        </div>
                                    )}

                                    <textarea
                                        required
                                        rows={4}
                                        placeholder={t('description_placeholder')}
                                        className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors resize-none ${duplicateWarning ? 'border-amber-300 focus:border-amber-500' : 'border-slate-200'}`}
                                        value={formData.description}
                                        onChange={handleDescriptionChange}
                                    ></textarea>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/dashboard')}
                                        className="px-4 py-2.5 text-slate-600 font-medium text-sm hover:text-slate-900 transition-colors"
                                    >
                                        {t('discard')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Send size={16} />
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
                        <div className="mt-6 p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900 text-sm">{t('emergency_protocol')}</h4>
                                <p className="text-sm text-slate-500 mt-0.5">{t('immediate_contact_hotline')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

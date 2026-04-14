
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated, updateUserProfile, sendPasswordResetEmail } from '../../utils/auth';
import { supabase } from '../../utils/supabaseClient';
import AdminAnalytics from '../../components/admin/AdminAnalytics';
import DashboardHeader from '../../components/common/DashboardHeader';
import Pagination from '../../components/common/Pagination';
import {
    Activity,
    CheckCircle,
    Clock,
    AlertCircle,
    MoreHorizontal,
    Search,
    Bell,
    ChevronDown,
    Filter,
    Printer,
    Settings,
    CreditCard,
    FileText,
    Truck,
    Zap,
    Users,
    Trash2,
    Edit,
    X,
    Send,
    BarChart3,
    Receipt,
    ArrowRight,
    ArrowLeft,
    MessageSquare,
    Bot,
    Copy,
    Download,
    ListChecks,
    MapPin,
    User,
    Phone
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { SkeletonCard, SkeletonCircle, SkeletonText } from '../../components/SkeletonLoader';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { broadcastSmsToResidents } from '../../utils/smsService';
import { sendIncidentStatusNotifications, sendBroadcastEmails, retryDeliveryLog } from '../../utils/notifyService';
import { formatFastApiDetail } from '../../utils/formatApiError';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBackground from '../../components/AnimatedBackground';
import { usePreferences } from '../../context/PreferencesContext';
import { useTranslation } from '../../utils/translations';
import ProfileManagementModal from '../../components/modals/ProfileManagementModal';
import { compareIncidentsForWorkQueue } from '../../utils/incidentPriority';

// Fix for default Leaflet icon not working with bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

/** Advisory targeting: empty selectedNames = all customers; otherwise match profile.barangay text. */
function filterCustomersByBarangay(rows, selectedNames) {
    if (!selectedNames?.length) return rows || [];
    return (rows || []).filter((row) => {
        const pb = (row.barangay || '').toLowerCase();
        if (!pb.trim()) return false;
        return selectedNames.some((sel) => {
            const s = String(sel).toLowerCase();
            return (
                pb.includes(s) ||
                pb.includes(`barangay ${s}`) ||
                pb.includes(`brgy ${s}`) ||
                pb.includes(`brgy. ${s}`)
            );
        });
    });
}

/**
 * Prefer a real name; avoid showing numeric-only full_name (often a mistaken account_no).
 * Fall back to email local-part so Auth-only users still read sensibly in the admin grid.
 */
function residentDisplayName(profile) {
    const fn = (profile?.full_name || '').trim();
    if (fn && !/^\d+$/.test(fn)) return fn;
    const local = (profile?.email || '').split('@')[0]?.trim();
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
    return 'Anonymous Resident';
}

function residentNameInitial(profile) {
    const n = residentDisplayName(profile);
    return (n[0] || '?').toUpperCase();
}

/** Split "Edo Molatch" → first / last for rows that only store full_name. */
function splitFullNameParts(fullName) {
    const t = String(fullName || '').trim().replace(/\s+/g, ' ');
    if (!t) return { first: '', last: '' };
    const i = t.indexOf(' ');
    if (i === -1) return { first: t, last: '' };
    return { first: t.slice(0, i), last: t.slice(i + 1).trim() };
}

function profileFirstName(p) {
    const v = (p?.first_name || '').trim();
    if (v) return v;
    return splitFullNameParts(p?.full_name).first;
}

function profileLastName(p) {
    const v = (p?.last_name || '').trim();
    if (v) return v;
    return splitFullNameParts(p?.full_name).last;
}

function profilePhoneDisplay(p) {
    const v = (p?.phone || '').trim();
    return v || '';
}

/** Human-readable causes when SMS/email total targets are 0 (translation keys). */
function deliveryZeroRecipientHintKeys({ rawRecipients, targeted, target_barangays, send_sms, send_email, withPhone, withEmail }) {
    const keys = [];
    const nRaw = (rawRecipients || []).length;
    const nTargeted = (targeted || []).length;
    const barangayOn = (target_barangays || []).length > 0;

    if (nRaw === 0) {
        keys.push('delivery_zero_no_customers');
        return keys;
    }
    if (barangayOn && nTargeted === 0) {
        keys.push('delivery_zero_barangay_filter');
    }
    if (send_sms && withPhone.length === 0 && nTargeted > 0) {
        keys.push('delivery_zero_no_valid_phones');
    }
    if (send_email && withEmail.length === 0 && nTargeted > 0) {
        keys.push('delivery_zero_no_valid_emails');
    }
    return keys;
}

/** Avoid “1 target, 0 delivered, 0 failed” when the notify HTTP call failed and returned no counts. */
function summarizeEmailBulkReport(emailResult, totalTargets) {
    if (totalTargets <= 0) {
        return { successCount: 0, failedCount: 0, errorHint: null };
    }
    if (!emailResult) {
        return {
            successCount: 0,
            failedCount: totalTargets,
            errorHint: 'No response from the notify server. Is it running and is VITE_AI_SERVER_URL correct?',
        };
    }
    if (emailResult.skipped) {
        return { successCount: 0, failedCount: 0, errorHint: null };
    }
    if (emailResult.ok === false) {
        const hint = formatFastApiDetail(
            emailResult.detail,
            emailResult.error ||
                (emailResult.status ? `Notify server HTTP ${emailResult.status}` : '') ||
                'Email send request failed.'
        );
        return { successCount: 0, failedCount: totalTargets, errorHint: hint };
    }
    const sc = Number(emailResult.successCount);
    const fc = Number(emailResult.failedCount);
    const successCount = Number.isFinite(sc) ? sc : 0;
    const failedCount = Number.isFinite(fc) ? fc : Math.max(0, totalTargets - successCount);
    let errorHint = null;
    if (failedCount > 0 && Array.isArray(emailResult.results)) {
        const errs = emailResult.results
            .filter((r) => r && r.ok === false)
            .map((r) => formatFastApiDetail(r.error, String(r.error ?? '')))
            .filter(Boolean);
        if (errs.length) errorHint = errs.slice(0, 3).join(' · ');
    }
    const hintStr = errorHint == null || errorHint === '' ? null : formatFastApiDetail(errorHint, String(errorHint));
    return { successCount, failedCount, errorHint: hintStr };
}

function summarizeSmsBulkReport(smsResult, totalTargets) {
    if (totalTargets <= 0) {
        return { successCount: 0, failedCount: 0, errorHint: null };
    }
    if (!smsResult) {
        return {
            successCount: 0,
            failedCount: totalTargets,
            errorHint: 'No response from the notify server. Is it running and is VITE_AI_SERVER_URL correct?',
        };
    }
    const sc = Number(smsResult.count);
    const fc = Number(smsResult.failedCount);
    const successCount = Number.isFinite(sc) ? sc : 0;
    const failedCount = Number.isFinite(fc) ? fc : Math.max(0, totalTargets - successCount);
    let errorHint = (smsResult.success === false && smsResult.message) ? smsResult.message : null;
    if (!errorHint && failedCount > 0 && Array.isArray(smsResult.results)) {
        const errs = smsResult.results
            .filter((r) => r && r.ok === false)
            .map((r) => formatFastApiDetail(r.error, String(r.error ?? '')))
            .filter(Boolean);
        if (errs.length) errorHint = errs.slice(0, 3).join(' · ');
    }
    const hintStr = errorHint == null || errorHint === '' ? null : formatFastApiDetail(errorHint, String(errorHint));
    return { successCount, failedCount, errorHint: hintStr };
}

export default function AdminDashboard() {
    // Sync with session already validated by AdminRoute — avoids a blank first paint (`return null` until useEffect).
    const [user, setUser] = useState(() => getCurrentUser());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [incidents, setIncidents] = useState([]);
    const [allIncidents, setAllIncidents] = useState([]); // For Analytics
    const [users, setUsers] = useState([]);
    // Tabs: analytics, incidents, users, bills, support, system
    const [currentTab, setCurrentTab] = useState('incidents');
    const [supportTickets, setSupportTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [page, setPage] = useState(0);
    const [userPage, setUserPage] = useState(0);
    const [supportPage, setSupportPage] = useState(0);
    const [billPage, setBillPage] = useState(0);
    const [advisoryPage, setAdvisoryPage] = useState(0);
    const [selectedBillForPrint, setSelectedBillForPrint] = useState(null);
    const [adminProfile, setAdminProfile] = useState(null);
    // Modals & Forms
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
    const [userStats, setUserStats] = useState({ total: 0, admins: 0, recent: 0 });
    const [filterType, setFilterType] = useState('all'); // 'all' | 'new'

    // Modals & Forms
    const [notification, setNotification] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
    const [editModal, setEditModal] = useState({ isOpen: false, user: null });
    const [editForm, setEditForm] = useState({ full_name: '', first_name: '', last_name: '', phone: '', barangay: '', role: 'customer' });

    // --- NEW: Profile Management State ---
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedTranscript, setSelectedTranscript] = useState(null);
    const [aiSettings, setAiSettings] = useState({
        mascotName: 'Aqua',
        welcomeMessage: 'Hello! I am Aqua, your PrimeWater assistant. How can I help you today?',
        isMaintenance: false
    });

    // --- NEW: User Profile Modal ---
    const [selectedUserProfile, setSelectedUserProfile] = useState(null); // For detailed view

    // --- NEW: Bills System State ---
    const [bills, setBills] = useState([]);
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [billForm, setBillForm] = useState({
        user_id: '',
        account_no: '',
        address: '',
        amount: '',
        consumption: '',
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    const [transactions, setTransactions] = useState([]); // For User Profile Activity
    const [selectedTransaction, setSelectedTransaction] = useState(null); // For Transaction Receipt Modal

    const [announcements, setAnnouncements] = useState([]);
    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        content: '',
        type: 'Emergency',
        is_active: true,
        send_sms: false,
        send_email: false,
        target_barangays: [],
    });
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [advisoryBarangayNames, setAdvisoryBarangayNames] = useState([]);

    // --- GAP 4: Delivery Tracking State ---
    const [deliveryReport, setDeliveryReport] = useState(null);
    const [deliveryLogs, setDeliveryLogs] = useState([]);
    const [deliveryLogsLoading, setDeliveryLogsLoading] = useState(false);
    const [retryingDeliveryId, setRetryingDeliveryId] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [incidentFilter, setIncidentFilter] = useState('Active'); // 'Active' | 'History'
    const [residentSearchQuery, setResidentSearchQuery] = useState('');
    const [isResidentDropdownOpen, setIsResidentDropdownOpen] = useState(false);
    const [pulseFeed, setPulseFeed] = useState([]);

    const navigate = useNavigate();
    const { language } = usePreferences() || { language: 'EN' };
    const { t } = useTranslation(language);
    const PAGE_SIZE = 5;

    useEffect(() => {
        if (!isAnnouncementModalOpen) return;
        fetch('/data/malaybalay-barangays.json')
            .then((r) => r.json())
            .then((geo) => {
                const names = (geo?.features || [])
                    .map((f) => f?.properties?.name)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b));
                setAdvisoryBarangayNames(names);
            })
            .catch(() => setAdvisoryBarangayNames([]));
    }, [isAnnouncementModalOpen]);

    useEffect(() => {
        if (currentTab !== 'delivery' || !user) return undefined;
        let cancelled = false;
        (async () => {
            setDeliveryLogsLoading(true);
            const { data, error } = await supabase
                .from('delivery_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(150);
            if (cancelled) return;
            if (error) {
                console.warn('[delivery_logs]', error);
                setDeliveryLogs([]);
            } else {
                setDeliveryLogs(data || []);
            }
            setDeliveryLogsLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [currentTab, user]);

    const fetchBills = async () => {
        try {
            let query = supabase
                .from('bills')
                .select('*, profiles(full_name)', { count: 'exact' })
                .range(billPage * PAGE_SIZE, (billPage + 1) * PAGE_SIZE - 1)
                .order('created_at', { ascending: false });

            let { data, error, count } = await query;

            if (error) {
                console.warn('fetchBills join failed, retrying without profile join:', error.message);
                const fallback = await supabase
                    .from('bills')
                    .select('*', { count: 'exact' })
                    .range(billPage * PAGE_SIZE, (billPage + 1) * PAGE_SIZE - 1)
                    .order('created_at', { ascending: false });
                data = fallback.data;
                error = fallback.error;
                count = fallback.count;
            }

            if (error) {
                console.error('fetchBills error:', error);
                setBills([]);
                return;
            }
            if (data) setBills(data);
            if (count !== undefined) setStats(prev => ({ ...prev, totalBills: count }));
        } catch (err) {
            console.error('fetchBills exception:', err);
            setBills([]);
        }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('bills')
                .insert([{
                    user_id: billForm.user_id,
                    account_no: billForm.account_no,
                    address: billForm.address,
                    amount: parseFloat(billForm.amount),
                    consumption: parseFloat(billForm.consumption),
                    due_date: new Date(billForm.due_date).toISOString(),
                    reading_date: new Date().toISOString(),
                    status: 'Unpaid',
                }]);

            if (error) throw error;

            // Create Notification for the resident
            await supabase.from('notifications').insert({
                user_id: billForm.user_id,
                type: 'bill',
                title: t('new_bill_notif'),
                message: t('bill_available_msg', { amount: parseFloat(billForm.amount).toLocaleString() })
            });

            setNotification({ type: 'success', message: 'Bill created and resident notified!' });
            setIsBillModalOpen(false);
            setBillForm({
                user_id: '',
                account_no: '',
                address: '',
                amount: '',
                consumption: '',
                due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });
            fetchBills();
        } catch (err) {
            setNotification({ type: 'error', message: err.message });
        }
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        const currentUser = getCurrentUser();
        if (currentUser.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        setUser(currentUser);
        document.title = "Admin Control Center | Smart CSM";

        fetchIncidents();
        fetchUsers();
        fetchBills();
        fetchAnalytics();
        fetchSupportTickets();
        fetchAnnouncements();

        // High-Fidelity Real-time Subscriptions (Delta-Based)
        const channels = [
            supabase.channel('admin_incidents').on('postgres_changes', { event: '*', table: 'incidents' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    addPulse('New Insight', `A new ${payload.new.type} reported in ${payload.new.location}`, 'incident');
                } else if (payload.eventType === 'UPDATE') {
                    addPulse('Update', `Incident status in ${payload.new.location} changed to ${payload.new.status}`, 'update');
                }
                fetchIncidents();
                fetchAnalytics(); // Refresh charts on change
            }).subscribe(),

            supabase.channel('admin_users').on('postgres_changes', { event: '*', table: 'profiles' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    addPulse('New Citizen', `${residentDisplayName(payload.new)} joined the platform.`, 'user');
                }
                fetchUsers();
            }).subscribe(),

            supabase.channel('admin_bills').on('postgres_changes', { event: '*', table: 'bills' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    addPulse('Billing', `New bill generated for account ${payload.new.account_no}`, 'bill');
                }
                fetchBills();
            }).subscribe(),

            supabase.channel('admin_support').on('postgres_changes', { event: '*', table: 'support_tickets' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    addPulse('Support', `New support ticket from a resident.`, 'support');
                }
                fetchSupportTickets();
            }).subscribe(),

            supabase.channel('admin_announcements').on('postgres_changes', { event: '*', table: 'announcements' }, fetchAnnouncements).subscribe()
        ];

        return () => channels.forEach(c => supabase.removeChannel(c));
    }, [page, filterType, incidentFilter]);

    useEffect(() => {
        if (!isAuthenticated()) return;
        if (getCurrentUser()?.role !== 'admin') return;
        fetchUsers();
    }, [userPage]);

    useEffect(() => {
        if (!isAuthenticated()) return;
        if (getCurrentUser()?.role !== 'admin') return;
        fetchBills();
    }, [billPage]);

    const addPulse = (title, message, type) => {
        const id = Math.random().toString(36).substring(7);
        setPulseFeed(prev => [{ id, title, message, type, time: new Date() }, ...prev].slice(0, 10));
    };

    const fetchSupportTickets = async () => {
        const { data, error, count } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact' })
            .range(supportPage * PAGE_SIZE, (supportPage + 1) * PAGE_SIZE - 1)
            .order('created_at', { ascending: false });

        if (!error && data) setSupportTickets(data);
        if (count !== undefined) setStats(prev => ({ ...prev, totalTickets: count }));
    };

    const fetchUsers = async () => {
        // Residents tab is for customers only; admins should not appear as resident cards.
        const { data, error, count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .eq('role', 'customer')
            .range(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE - 1)
            .order('full_name', { ascending: true });

        if (error) {
            console.warn('[admin fetchUsers]', error.message);
            setUsers([]);
            return;
        }

        if (data) {
            setUsers(data);
            const customerTotal = count ?? data.length;
            const { data: roleRows, error: roleErr } = await supabase.from('profiles').select('role, created_at');
            if (roleErr) {
                console.warn('[admin fetchUsers stats]', roleErr.message);
                setUserStats((prev) => ({ ...prev, total: customerTotal }));
            } else if (roleRows) {
                const admins = roleRows.filter((u) => u.role === 'admin').length;
                const recent = roleRows.filter((u) => {
                    if (u.role !== 'customer') return false;
                    const dayDiff = (new Date() - new Date(u.created_at)) / (1000 * 60 * 60 * 24);
                    return dayDiff <= 30;
                }).length;
                setUserStats({ total: customerTotal, admins, recent });
            } else {
                setUserStats((prev) => ({ ...prev, total: customerTotal }));
            }
        }

        const adminId = getCurrentUser()?.id;
        if (adminId) {
            const { data: adminRow } = await supabase.from('profiles').select('*').eq('id', adminId).maybeSingle();
            if (adminRow) setAdminProfile(adminRow);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'ai_config')
                .single();

            if (data?.value) {
                setAiSettings(data.value);
            }
        } catch (err) {
            console.error('Error fetching AI settings:', err);
        }
    };

    const fetchAnnouncements = async () => {
        const { data, count } = await supabase
            .from('announcements')
            .select('*', { count: 'exact' })
            .range(advisoryPage * PAGE_SIZE, (advisoryPage + 1) * PAGE_SIZE - 1)
            .order('created_at', { ascending: false });

        if (data) setAnnouncements(data);
        if (count !== undefined) setStats(prev => ({ ...prev, totalAdvisories: count }));
    };

    const refreshDeliveryLogs = async () => {
        const { data, error } = await supabase
            .from('delivery_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(150);
        if (error) {
            console.warn('[delivery_logs]', error);
            return;
        }
        setDeliveryLogs(data || []);
    };

    const handleRetryDelivery = async (logId) => {
        setRetryingDeliveryId(logId);
        try {
            const res = await retryDeliveryLog(logId);
            const errMsg = formatFastApiDetail(res.detail, res.error || res.message || 'Retry failed');
            if (!res.ok) {
                setNotification({ type: 'error', message: errMsg });
            } else {
                setNotification({ type: 'success', message: t('delivery_logs_retry_ok') });
                await refreshDeliveryLogs();
            }
        } catch (err) {
            setNotification({ type: 'error', message: err?.message || 'Retry failed' });
        } finally {
            setRetryingDeliveryId(null);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            const { send_sms, send_email, target_barangays, ...dbPayload } = announcementForm;
            const titleTrim = (dbPayload.title || '').trim();
            const contentTrim = (dbPayload.content || '').trim();
            if (!titleTrim) {
                setNotification({ type: 'error', message: t('advisory_title_required') });
                setTimeout(() => setNotification(null), 4000);
                return;
            }
            if (!contentTrim) {
                setNotification({ type: 'error', message: t('advisory_body_required') });
                setTimeout(() => setNotification(null), 4000);
                return;
            }

            const batchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `adv-${Date.now()}`;

            // Older DBs: NOT NULL `subject` with no default. New DBs: `title`/`content` only (no `subject` column).
            const insertModern = { ...dbPayload, title: titleTrim, content: contentTrim };
            const insertLegacy = { ...insertModern, subject: titleTrim };

            let { data: insertedAnnouncement, error } = await supabase
                .from('announcements')
                .insert([insertLegacy])
                .select('id')
                .single();

            const errMsg = String(error?.message || '').toLowerCase();
            const subjectColumnMissing =
                errMsg.includes('subject') &&
                (errMsg.includes('does not exist') ||
                    errMsg.includes('schema cache') ||
                    (errMsg.includes('could not find') && errMsg.includes('column')));
            if (error && subjectColumnMissing) {
                ({ data: insertedAnnouncement, error } = await supabase
                    .from('announcements')
                    .insert([insertModern])
                    .select('id')
                    .single());
            }

            if (error) {
                const em = String(error.message || '').toLowerCase();
                if (em.includes('audit_logs')) {
                    throw new Error(
                        'Database is missing public.audit_logs (or a trigger references it). Run migrations/create_audit_logs_table.sql in the Supabase SQL Editor, then try again.'
                    );
                }
                throw error;
            }

            const announcementId = insertedAnnouncement?.id;

            let successMessage = 'Announcement published successfully!';

            const { data: rawRecipients, error: recipientsError } = await supabase
                .from('profiles')
                .select('id, role, phone, email, barangay, full_name')
                .eq('role', 'customer');
            if (recipientsError) {
                console.warn('[broadcast] profiles fetch:', recipientsError);
            }

            const targeted = filterCustomersByBarangay(rawRecipients, target_barangays);
            const withPhone = targeted.filter((u) => u.phone && String(u.phone).trim().length >= 8);
            const withEmail = targeted.filter((u) => u.email && String(u.email).includes('@'));

            if (send_sms || send_email) {
                setNotification({ type: 'success', message: 'Publishing and sending notifications...' });
            }

            let smsResult = null;
            let emailResult = null;

            const deliveryMeta = {
                batchId,
                contextType: 'broadcast_advisory',
                contextId: announcementId,
                createdBy: user?.id,
            };

            if (send_sms) {
                smsResult = await broadcastSmsToResidents(dbPayload, withPhone, deliveryMeta);
            }
            if (send_email && withEmail.length > 0) {
                const emailBody = `${dbPayload.title}\n\n${dbPayload.content}\n\n[${dbPayload.type}] — PrimeWater Malaybalay (Smart CSM)`;
                emailResult = await sendBroadcastEmails({
                    emails: withEmail.map((u) => u.email),
                    subject: `[PrimeWater] ${dbPayload.type}: ${dbPayload.title}`,
                    body: emailBody,
                    batchId,
                    contextType: 'broadcast_advisory',
                    contextId: announcementId,
                    createdBy: user?.id,
                });
            } else if (send_email && withEmail.length === 0) {
                emailResult = { ok: true, successCount: 0, failedCount: 0, total: 0, skipped: true };
            }

            if (send_sms || send_email) {
                const zeroSms = send_sms && withPhone.length === 0;
                const zeroEmail = send_email && withEmail.length === 0;
                const zeroHintKeys =
                    zeroSms || zeroEmail
                        ? deliveryZeroRecipientHintKeys({
                              rawRecipients,
                              targeted,
                              target_barangays,
                              send_sms,
                              send_email,
                              withPhone,
                              withEmail,
                          })
                        : [];
                const smsSummary = send_sms ? summarizeSmsBulkReport(smsResult, withPhone.length) : null;
                const emailSummary = send_email ? summarizeEmailBulkReport(emailResult, withEmail.length) : null;
                setDeliveryReport({
                    announcement: dbPayload,
                    sms: send_sms
                        ? {
                              totalTarget: withPhone.length,
                              successCount: smsSummary.successCount,
                              failedCount: smsSummary.failedCount,
                              errorHint: smsSummary.errorHint,
                          }
                        : null,
                    email: send_email
                        ? {
                              totalTarget: withEmail.length,
                              successCount: emailSummary.successCount,
                              failedCount: emailSummary.failedCount,
                              errorHint: emailSummary.errorHint,
                          }
                        : null,
                    timestamp: new Date().toISOString(),
                    zeroRecipientHintKeys: zeroHintKeys,
                    recipientsQueryError: recipientsError?.message || null,
                });
                successMessage = 'Alert published! See delivery report for SMS/email totals.';
            }

            setNotification({ type: 'success', message: successMessage });
            setIsAnnouncementModalOpen(false);
            setAnnouncementForm({
                title: '',
                content: '',
                type: 'Emergency',
                is_active: true,
                send_sms: false,
                send_email: false,
                target_barangays: [],
            });
            fetchAnnouncements();
        } catch (err) {
            setNotification({ type: 'error', message: err.message });
        }
    };

    const toggleAnnouncementStatus = async (announcement) => {
        try {
            const { error } = await supabase
                .from('announcements')
                .update({ is_active: !announcement.is_active })
                .eq('id', announcement.id);

            if (error) throw error;
            setNotification({ type: 'success', message: `Announcement ${!announcement.is_active ? 'Activated' : 'Deactivated'}` });
            fetchAnnouncements();
        } catch (err) {
            setNotification({ type: 'error', message: err.message });
        }
    };

    const fetchIncidents = async (options = {}) => {
        const skipLoading = options.skipLoading === true;
        if (!skipLoading) setLoading(true);
        try {
            const isHistory = incidentFilter === 'History';

            let countQuery = supabase.from('incidents').select('*', { count: 'exact', head: true });
            let pageQuery = supabase.from('incidents').select('*');

            if (isHistory) {
                countQuery = countQuery.in('status', ['Resolved', 'Declined']);
                pageQuery = pageQuery
                    .in('status', ['Resolved', 'Declined'])
                    .order('updated_at', { ascending: false })
                    .order('created_at', { ascending: false });
            } else {
                countQuery = countQuery.neq('status', 'Resolved').neq('status', 'Declined');
                pageQuery = pageQuery
                    .neq('status', 'Resolved')
                    .neq('status', 'Declined')
                    .order('priority_score', { ascending: false })
                    .order('created_at', { ascending: true });
            }

            const { count } = await countQuery;
            const { data, error } = await pageQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) {
                console.warn('[fetchIncidents] paged query', error);
                setIncidents([]);
            } else if (data) {
                setIncidents(data);
                setStats((prev) => ({ ...prev, total: count ?? prev.total }));
            }

            const { data: fullData, error: fullError } = await supabase.from('incidents').select('*');

            if (fullError) {
                console.warn('[fetchIncidents] full incidents list', fullError);
            } else if (fullData) {
                setAllIncidents(fullData);
                const pending = fullData.filter((i) => i.status === 'Pending').length;
                const inProgress = fullData.filter((i) => ['In Progress', 'Dispatched', 'On-Site'].includes(i.status)).length;
                const resolved = fullData.filter((i) => i.status === 'Resolved').length;
                setStats((prev) => ({
                    ...prev,
                    total: count ?? prev.total,
                    pending,
                    inProgress,
                    resolved,
                }));
            }
        } catch (err) {
            console.error('Error fetching incidents:', err);
        }
        if (!skipLoading) setLoading(false);
    };

    // calculateStats is now integrated into fetchIncidents for global accuracy

    const generateServiceReport = (incident) => {
        return `WHAT: ${incident.type} - ${incident.description} \n` +
            `WHEN: Reported on ${new Date(incident.created_at).toLocaleString()} \n` +
            `WHERE: ${incident.location} (Signal: ${incident.latitude ? incident.latitude.toFixed(4) : 'N/A'}, ${incident.longitude ? incident.longitude.toFixed(4) : 'N/A'}) \n` +
            `WHO: ${incident.user_name || 'Anonymous Resident'} (Contact: ${incident.contact_number || 'N/A'})`;
    };

    // Real SMS (httpSMS) + email (Gmail API) via FastAPI /notify — keys only on server (.env)
    const sendIncidentOutboundNotifications = async (incident, newStatus) => {
        let smsBody = `${t('primewater_update')}\n${t('ticket_id')}: ${incident.id || 'N/A'}\n${t('status_changed_to')}: ${t(newStatus.toLowerCase().replace(' ', '_')).toUpperCase()}`;

        if (newStatus === 'Dispatched') {
            smsBody += `\n${t('dispatch_note')}`;
        } else if (newStatus === 'Resolved') {
            smsBody += `\n${t('resolved_note')}`;
        }

        const emailSubject = `PrimeWater Smart CSM — Report update (${String(incident.id || '').slice(0, 8)})`;
        const emailBody = `${smsBody}\n\n— PrimeWater Malaybalay (Smart CSM)`;

        let profilePhone = null;
        let profileEmail = null;
        if (incident.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email, phone')
                .eq('id', incident.user_id)
                .maybeSingle();
            profilePhone = profile?.phone || null;
            profileEmail = profile?.email || null;
        }

        const phone = profilePhone || incident.contact_number || null;
        const batchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `st-${Date.now()}`;
        const result = await sendIncidentStatusNotifications({
            phone,
            email: profileEmail,
            smsBody,
            emailSubject,
            emailBody,
            batchId,
            contextType: 'incident_status',
            contextId: incident.id,
            createdBy: user?.id || null,
        });
        if (!result.ok) {
            console.warn('[notify] incident-update partial or failed', result);
        }
        return result;
    };

    const updateStatus = async (status) => {
        if (!selectedIncident) return;
        try {
            const { data: updated, error } = await supabase
                .from('incidents')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', selectedIncident.id)
                .select();

            if (error) throw error;

            if (!updated || updated.length === 0) {
                setNotification({ type: 'error', message: 'Update blocked — admin RLS policy may need to be applied. Run fix_incidents_admin_rls.sql in Supabase SQL Editor.' });
                setTimeout(() => setNotification(null), 8000);
                return;
            }
            const nextIncident = { ...selectedIncident, status };
            setIncidents((prev) => prev.map((i) => (i.id === selectedIncident.id ? { ...i, status } : i)));
            setAllIncidents((prev) =>
                prev.some((i) => i.id === selectedIncident.id)
                    ? prev.map((i) => (i.id === selectedIncident.id ? { ...i, status } : i))
                    : [...prev, { ...selectedIncident, status }]
            );
            setSelectedIncident(nextIncident);

            await sendIncidentOutboundNotifications(selectedIncident, status);

            // Create Internal Notification for the resident
            await supabase.from('notifications').insert({
                user_id: selectedIncident.user_id,
                type: 'incident',
                title: 'Incident Update',
                message: `Your report #${selectedIncident.id.slice(0, 8)} status has been updated to: ${status}.`
            });

            // Dispatch notification
            if (status === 'Dispatched') {
                setNotification({ type: 'success', message: 'Team Dispatched & Resident Notified!' });
            } else if (status === 'Resolved') {
                setNotification({ type: 'success', message: 'Resolved & Resident Notified!' });
            } else {
                setNotification({ type: 'success', message: `Status updated to ${status}` });
            }
            setTimeout(() => setNotification(null), 3000);
            await fetchIncidents({ skipLoading: true });
        } catch (err) {
            console.error('Error updating status:', err);
            setNotification({ type: 'error', message: 'Failed to update status' });
        }
    };

    const handleDelete = async (item, type) => {
        try {
            let error;
            if (type === 'incident') {
                const { error: err } = await supabase.from('incidents').delete().eq('id', item.id);
                error = err;
            } else if (type === 'user') {
                const { error: err } = await supabase.from('profiles').delete().eq('id', item.id);
                error = err;
            } else if (type === 'bill') {
                const { error: err } = await supabase.from('bills').delete().eq('id', item.id);
                error = err;
            } else if (type === 'announcement') {
                const { error: err } = await supabase.from('announcements').delete().eq('id', item.id);
                error = err;
            } else if (type === 'transaction') {
                setTransactions(transactions.filter(t => t.id !== item.id));
                setNotification({ type: 'success', message: 'Transaction deleted' });
                setConfirmModal({ isOpen: false });
                return;
            }

            if (error) throw error;

            if (type === 'incident') {
                setIncidents(incidents.filter(i => i.id !== item.id));
                setSelectedIncident(null);
                setNotification({ type: 'success', message: 'Incident deleted successfully' });
            } else if (type === 'user') {
                setUsers(users.filter(u => u.id !== item.id));
                setNotification({ type: 'success', message: 'User deleted successfully' });
            } else if (type === 'announcement') {
                setAnnouncements(announcements.filter(a => a.id !== item.id));
                setNotification({ type: 'success', message: 'Advisory deleted permanently' });
            } else if (type === 'bill') {
                setBills(bills.filter(b => b.id !== item.id));
                setNotification({ type: 'success', message: 'Bill deleted successfully' });
            }

            setConfirmModal({ isOpen: false, ...confirmModal });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error('Error deleting:', err);
            setNotification({ type: 'error', message: 'Failed to delete' });
        }
    };

    // --- NEW FUNCTIONS ---
    const handleDownloadBillPDF = (bill) => {
        const doc = new jsPDF();

        // Add Premium Header
        doc.setFillColor(13, 138, 188); // PrimeWater Blue
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PrimeWater Smart CSM', 20, 25);

        doc.setFontSize(10);
        doc.text(t('official_bill_receipt'), 20, 35);

        // Bill Info
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(12);
        doc.text(`${t('bill')} ID: ${bill.id}`, 20, 60);
        doc.text(`${t('account_number')}: ${bill.account_no}`, 20, 70);
        doc.text(`${t('resident_label')}: ${bill.profiles?.full_name || 'Resident'}`, 20, 80);
        doc.text(`${t('residential_place')}: ${bill.profiles?.address || 'N/A'}`, 20, 90);

        // Billing Period
        doc.setFillColor(248, 250, 252);
        doc.rect(20, 100, 170, 40, 'F');
        doc.text(t('billing_system_title').toUpperCase(), 25, 110);
        doc.setFontSize(10);
        doc.text(`${t('period')}: ${new Date(bill.reading_date).toLocaleDateString(language === 'EN' ? 'en-US' : language === 'TG' ? 'tl-PH' : 'ceb-PH', { month: 'long', year: 'numeric' })}`, 25, 120);
        doc.text(`${t('consumption_label')}: ${bill.consumption} m3`, 25, 130);

        // Total Amount
        doc.setFontSize(16);
        doc.setTextColor(13, 138, 188);
        doc.text(`${t('amount_label')}: PHP ${bill.amount.toLocaleString()}`, 25, 150);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(t('system_generated_doc'), 20, 270);
        doc.text(`${t('generated_on')}: ${new Date().toLocaleString()}`, 20, 275);

        doc.save(`PrimeWater_Bill_${bill.id.slice(0, 8)}.pdf`);
        setNotification({ type: 'success', message: 'PDF Bill Downloaded!' });
    };

    const handlePrintReceipt = (bill) => {
        handleDownloadBillPDF(bill);
    };

    const handleResolveTicket = async (id) => {
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: 'Resolved' })
                .eq('id', id);

            if (error) throw error;

            setSupportTickets(supportTickets.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
            setNotification({ type: 'success', message: 'Ticket marked as resolved' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error('Error resolving ticket:', err);
            setNotification({ type: 'error', message: 'Failed to resolve ticket' });
        }
    };

    const handleCopyServiceReport = (incident) => {
        const report = generateServiceReport(incident);
        navigator.clipboard.writeText(report);
        setNotification({ type: 'success', message: 'Service report copied to clipboard!' });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSaveAiSettings = async () => {
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({ key: 'ai_config', value: aiSettings, updated_by: user.id });

            if (error) throw error;

            setNotification({ type: 'success', message: 'System Configuration Updated' });
            setTimeout(() => setNotification(null), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            setNotification({ type: 'error', message: 'Failed to save configuration' });
        }
    };

    const exportIncidentHistory = () => {
        const historyData = allIncidents.filter((i) => {
            const n = String(i.status || '').trim();
            return n === 'Resolved' || n === 'Declined';
        });
        if (historyData.length === 0) {
            setNotification({ type: 'error', message: 'No history data to export' });
            return;
        }

        const headers = ['ID', 'Type', 'Status', 'Location', 'User', 'Date'];
        const rows = historyData.map(i => [
            i.id,
            `"${i.type}"`,
            `"${i.status}"`,
            `"${i.location}"`,
            `"${i.user_name || 'Anonymous'}"`,
            new Date(i.created_at).toLocaleDateString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `CSM_Incident_History_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setNotification({ type: 'success', message: 'History log exported successfully!' });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSendBill = (userProfile) => {
        setBillForm({
            ...billForm,
            user_id: userProfile.id,
            address: userProfile.barangay || userProfile.address || ''
        });
        setSelectedUserProfile(null);
        setIsBillModalOpen(true);
    };

    const confirmDelete = (item, type) => {
        setConfirmModal({
            isOpen: true,
            title: `Delete ${type === 'transaction' ? 'Transaction' : type === 'incident' ? 'Report' : 'User'}?`,
            message: 'This action cannot be undone.',
            onConfirm: () => handleDelete(item, type)
        });
    };

    const openEditModal = (user) => {
        const parts = splitFullNameParts(user.full_name);
        setEditForm({
            full_name: user.full_name || '',
            first_name: (user.first_name || '').trim() || parts.first,
            last_name: (user.last_name || '').trim() || parts.last,
            phone: (user.phone || '').trim(),
            barangay: user.barangay || '',
            role: user.role
        });
        setEditModal({ isOpen: true, user });
    };

    const handleUpdateUser = async () => {
        if (!editModal.user) return;

        // Basic Validation
        if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
            setNotification({ type: 'error', message: 'First and Last name are required' });
            return;
        }

        // Auto-sanitize and sync full_name
        const sanitizedForm = {
            ...editForm,
            first_name: editForm.first_name.trim(),
            last_name: editForm.last_name.trim(),
            phone: (editForm.phone || '').trim(),
            barangay: editForm.barangay.trim(),
            full_name: `${editForm.first_name.trim()} ${editForm.last_name.trim()}`
        };

        try {
            setNotification({ type: 'info', message: 'Saving changes...' });
            const { error } = await supabase
                .from('profiles')
                .update(sanitizedForm)
                .eq('id', editModal.user.id);

            if (error) throw error;

            // Log action for Audit Trail (non-blocking if table/trigger missing or RLS differs)
            const { error: auditErr } = await supabase.from('audit_logs').insert({
                admin_id: user.id,
                action: 'UPDATE_USER',
                target_user_id: editModal.user.id,
                details: `Updated profile for ${sanitizedForm.full_name} (Role: ${sanitizedForm.role})`
            });
            if (auditErr) {
                console.warn('[audit_logs]', auditErr.message);
            }

            setUsers(users.map(u => u.id === editModal.user.id ? { ...u, ...sanitizedForm } : u));
            setEditModal({ isOpen: false, user: null });
            setNotification({ type: 'success', message: 'User updated successfully and synced to database' });

            // Auto-refresh list if role changed
            if (sanitizedForm.role !== editModal.user.role) {
                fetchUsers();
            }
        } catch (err) {
            console.error('Error updating user:', err);
            setNotification({ type: 'error', message: 'Network/Server Error: Failed to sync changes. Please try again.' });
        } finally {
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // --- NEW: Profile Management Handlers ---
    const openProfileModal = () => setIsProfileModalOpen(true);

    const handleUpdateProfile = (updatedUser) => {
        setUser(updatedUser);
        setNotification({ type: 'success', message: 'Profile updated successfully' });
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-semibold">Loading admin workspace…</p>
            </div>
        );
    }

    return (
        <div className="dashboard-layout relative min-h-screen">
            <AnimatedBackground />
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            <main className="dashboard-main relative z-10">
                <DashboardHeader
                    user={user}
                    onUpdateUser={handleUpdateProfile}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    placeholder={t('search_tab_placeholder', { tab: t(`${currentTab}_tab`) })}
                    title={t('admin_title')}
                    subtitle={t('admin_subtitle')}
                    icon={<Activity size={24} />}
                />

                {/* KPI Cards (Animated) - Fluid Grid */}
                <div className="flex flex-wrap items-stretch gap-6 mb-8">
                    {[
                        { label: t('pending_incidents'), value: stats.pending, icon: <Clock size={24} />, color: 'bg-amber-500', trend: '+12%', sub: 'Avg: 45m' },
                        { label: t('active_reports'), value: stats.inProgress, icon: <Activity size={24} />, color: 'bg-blue-600', trend: 'Live', sub: 'Critical coverage' },
                        { label: t('resolved_weekly'), value: stats.resolved, icon: <CheckCircle size={24} />, color: 'bg-emerald-500', trend: '98%', sub: 'Target: 95%' },
                        { label: t('active_residents'), value: userStats.total, icon: <Users size={24} />, color: 'bg-slate-900', trend: '+5', sub: 'Community' }
                    ].map((card, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="flex-1 min-w-[280px] bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group overflow-hidden relative"
                        >
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1">{card.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <motion.h3
                                        key={card.value}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-3xl font-black text-slate-900 dark:text-slate-100"
                                    >
                                        {card.value}
                                    </motion.h3>
                                    <span className={`text-[10px] font-bold ${card.trend.includes('+') ? 'text-emerald-400' : 'text-blue-400'}`}>{card.trend}</span>
                                </div>
                                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 font-bold">{card.sub}</p>
                            </div>
                            <div className={`p-4 ${card.color} text-white rounded-2xl shadow-lg relative z-10 group-hover:scale-110 transition-transform`}>
                                {card.icon}
                            </div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 dark:bg-slate-700/50 rounded-full -mr-12 -mt-12 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors"></div>
                        </motion.div>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Dashboard Tabs & Content */}
                    <div className="flex-1 overflow-hidden">
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-600 shadow-sm mb-8 w-fit">
                            {[
                                { id: 'analytics', label: t('analytics'), icon: <BarChart3 size={16} />, color: 'blue' },
                                { id: 'incidents', label: t('incidents'), icon: <AlertCircle size={16} />, color: 'rose' },
                                { id: 'users', label: t('residents_tab'), icon: <Users size={16} />, color: 'indigo' },
                                { id: 'support', label: t('live_support'), icon: <MessageSquare size={16} />, color: 'emerald' },
                                { id: 'bills', label: t('bills'), icon: <CreditCard size={16} />, color: 'amber' },
                                { id: 'advisories', label: t('advisories'), icon: <Zap size={16} />, color: 'purple' },
                                { id: 'delivery', label: t('delivery_tab'), icon: <ListChecks size={16} />, color: 'teal' },
                                { id: 'system', label: t('system'), icon: <Settings size={16} />, color: 'slate' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        const next = tab.id;
                                        if ((currentTab === 'bills' && next === 'incidents') || (currentTab === 'incidents' && next === 'bills')) {
                                            setSearchQuery('');
                                        }
                                        setCurrentTab(next);
                                    }}
                                    className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden group ${currentTab === tab.id
                                        ? `bg-blue-600 text-white shadow-lg shadow-blue-600/20`
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    <span className="relative z-10">{tab.icon}</span>
                                    <span className="relative z-10">{tab.label}</span>
                                    {currentTab === tab.id && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-blue-600 z-0"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* MAIN CONTENT AREA */}
                        <div className="min-h-[500px]">

                            {/* --- ANALYTICS TAB --- */}
                            {
                                currentTab === 'analytics' && (
                                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-600 shadow-sm">
                                        <AdminAnalytics incidents={allIncidents} users={users} onSwitchTab={setCurrentTab} />
                                    </div>
                                )
                            }

                            {/* --- INCIDENTS TAB --- */}
                            {
                                currentTab === 'incidents' && (() => {
                                    const q = searchQuery.trim();

                                    // Server-side query already filters by Active vs History status,
                                    // so `incidents` always contains the right page of data.
                                    // Use `allIncidents` only when searching across all records.
                                    const listToFilter = q ? allIncidents : incidents;
                                    const isHistoryStatus = (s) => {
                                        const n = String(s || '').trim();
                                        return n === 'Resolved' || n === 'Declined';
                                    };
                                    const filtered = listToFilter
                                        .filter((i) => {
                                            const matchesSearch = !q ||
                                                (i.type || '').toLowerCase().includes(q.toLowerCase()) ||
                                                (i.user_name || '').toLowerCase().includes(q.toLowerCase()) ||
                                                (i.id || '').toString().includes(q);

                                            if (incidentFilter === 'History') {
                                                return matchesSearch && isHistoryStatus(i.status);
                                            }
                                            return matchesSearch && !isHistoryStatus(i.status);
                                        })
                                        .sort((a, b) => {
                                            if (incidentFilter === 'History') {
                                                const da = new Date(a.updated_at || a.created_at).getTime();
                                                const db = new Date(b.updated_at || b.created_at).getTime();
                                                return db - da;
                                            }
                                            return compareIncidentsForWorkQueue(a, b);
                                        });

                                    const incidentsForDisplay = q
                                        ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                                        : filtered;

                                    // --- GAP 2: SLA Timer Logic ---
                                    const getSlaStatus = (incident) => {
                                        if (incident.status !== 'Pending') return { isBreached: false, text: '' };

                                        const reportedTime = new Date(incident.created_at).getTime();
                                        const now = new Date().getTime();
                                        const hoursElapsed = (now - reportedTime) / (1000 * 60 * 60);

                                        const p = Number(incident.priority_score ?? 5);
                                        let thresholdHour = 24;
                                        if (p >= 9) thresholdHour = 1;
                                        else if (p >= 6) thresholdHour = 3;

                                        if (hoursElapsed > thresholdHour) {
                                            return {
                                                isBreached: true,
                                                text: `SLA BREACH: Pending for ${Math.floor(hoursElapsed)}h (Target: <${thresholdHour}h)`
                                            };
                                        }
                                        return { isBreached: false, text: '' };
                                    };

                                    return (
                                        <div className="space-y-4">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                                <div className="flex flex-col gap-2">
                                                    {incidentFilter === 'Active' && (
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {t('work_queue_sorted_hint')}
                                                        </p>
                                                    )}
                                                    <div className="flex gap-2 bg-white/50 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm">
                                                        <button
                                                            onClick={() => {
                                                                setPage(0);
                                                                setSearchQuery('');
                                                                setIncidentFilter('Active');
                                                            }}
                                                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${incidentFilter === 'Active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/80'}`}
                                                        >
                                                            {t('active_queue')}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setPage(0);
                                                                setSearchQuery('');
                                                                setIncidentFilter('History');
                                                            }}
                                                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${incidentFilter === 'History' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg shadow-slate-500/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/80'}`}
                                                        >
                                                            {t('incident_history')}
                                                        </button>
                                                    </div>
                                                </div>

                                                {incidentFilter === 'History' && (
                                                    <button
                                                        onClick={exportIncidentHistory}
                                                        className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                                                    >
                                                        <CreditCard size={14} /> {t('download_history')}
                                                    </button>
                                                )}
                                            </div>
                                            {loading ? (
                                                [...Array(PAGE_SIZE)].map((_, i) => (
                                                    <div key={i} className="p-4 border rounded-xl flex justify-between items-center">
                                                        <div className="flex items-center gap-4">
                                                            <SkeletonCard className="w-12 h-12 rounded-lg" />
                                                            <div className="space-y-2">
                                                                <SkeletonText width="w-32" />
                                                                <SkeletonText width="w-48" height="h-3" />
                                                            </div>
                                                        </div>
                                                        <SkeletonText width="w-20" height="h-6" className="rounded-full" />
                                                    </div>
                                                ))
                                            ) : (
                                                <>
                                                    {incidentsForDisplay.map((incident) => {
                                                        const sla = getSlaStatus(incident);
                                                        return (
                                                            <div key={incident.id} onClick={() => setSelectedIncident(incident)} className={`p-4 border rounded-xl cursor-pointer flex justify-between items-center group transition-all ${sla.isBreached ? 'bg-rose-50 border-rose-200 hover:bg-rose-100 animate-pulse-soft' : 'hover:bg-slate-50'}`}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold relative ${incident.status === 'Resolved' ? 'bg-emerald-500' : sla.isBreached ? 'bg-rose-600' : 'bg-blue-500'}`}>
                                                                        {incident.type[0]}
                                                                        {sla.isBreached && <span className="absolute -top-2 -right-2 flex h-4 w-4">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
                                                                        </span>}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className={`font-bold ${sla.isBreached ? 'text-rose-700' : 'text-slate-800'}`}>{incident.type}</h4>
                                                                            {sla.isBreached && <span className="text-[9px] font-black uppercase tracking-widest bg-rose-200 text-rose-700 px-2 py-0.5 rounded-md">{t('urgent_action')}</span>}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500">{incident.user_name} • {new Date(incident.created_at).toLocaleDateString()}</p>
                                                                        {sla.isBreached && <p className="text-[10px] text-rose-600 font-bold mt-1 flex items-center gap-1"><Clock size={10} /> {sla.text}</p>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span
                                                                        className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100"
                                                                        title={t('priority_score_label')}
                                                                    >
                                                                        P{Number(incident.priority_score ?? 5)}
                                                                    </span>
                                                                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${sla.isBreached ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100'}`}>{incident.status}</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    {filtered.length === 0 && (
                                                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                                            <p className="text-slate-400 font-bold mb-1 max-w-md mx-auto">
                                                                {q
                                                                    ? t('no_incidents_match', { query: searchQuery })
                                                                    : incidentFilter === 'History'
                                                                        ? t('admin_incident_history_empty')
                                                                        : t('admin_active_queue_empty')}
                                                            </p>
                                                            {q ? (
                                                                <p className="text-[10px] text-slate-300 uppercase tracking-widest leading-loose">{t('adjust_search')}</p>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <Pagination
                                                currentPage={page}
                                                totalItems={q ? filtered.length : stats.total}
                                                pageSize={PAGE_SIZE}
                                                onPageChange={setPage}
                                            />
                                        </div>
                                    );
                                })()
                            }

                            {
                                currentTab === 'users' && (
                                    <div className="space-y-8">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div>
                                                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{t('resident_mgmt')}</h3>
                                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{t('hub_subtitle')}</p>
                                            </div>
                                            <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                                                <button
                                                    onClick={() => setFilterType('all')}
                                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    {t('all_residents')}
                                                </button>
                                                <button
                                                    onClick={() => setFilterType('new')}
                                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'new' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
                                                >
                                                    {t('newcomers')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {loading ? (
                                                [...Array(6)].map((_, i) => (
                                                    <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <SkeletonCard className="w-14 h-14 rounded-2xl" />
                                                                <div className="space-y-2">
                                                                    <SkeletonText width="w-32" />
                                                                    <SkeletonText width="w-24" height="h-3" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <SkeletonCard className="h-32 rounded-2xl mb-6" />
                                                        <div className="flex justify-between items-center">
                                                            <SkeletonText width="w-20" />
                                                            <SkeletonText width="w-24" height="h-8" />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (() => {
                                                const filtered = users
                                                    .filter((u) => u.role === 'customer')
                                                    .filter((u) => {
                                                    const searchLower = searchQuery.toLowerCase();
                                                    const dn = residentDisplayName(u).toLowerCase();
                                                    const matchesSearch =
                                                        dn.includes(searchLower) ||
                                                        (u.full_name || '').toLowerCase().includes(searchLower) ||
                                                        (u.email || '').toLowerCase().includes(searchLower) ||
                                                        (u.account_no || '').toLowerCase().includes(searchLower) ||
                                                        (u.barangay || '').toLowerCase().includes(searchLower);

                                                    if (filterType === 'new') {
                                                        const dayDiff = (new Date() - new Date(u.created_at)) / (1000 * 60 * 60 * 24);
                                                        return dayDiff <= 30 && matchesSearch;
                                                    }
                                                    return matchesSearch;
                                                });

                                                if (filtered.length === 0) {
                                                    const noCustomersLoaded = users.length === 0 && !searchQuery.trim();
                                                    return (
                                                        <div className="md:col-span-3 py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center px-6">
                                                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                            {noCustomersLoaded ? (
                                                                <>
                                                                    <p className="text-slate-600 font-bold mb-2">{t('residents_empty_no_customers')}</p>
                                                                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-lg mx-auto">
                                                                        {t('residents_empty_rls_hint')}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="text-slate-400 font-bold">
                                                                        {searchQuery.trim()
                                                                            ? t('residents_no_match', { query: searchQuery })
                                                                            : t('residents_no_newcomers')}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2">
                                                                        {t('residents_try_search_hint')}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return filtered.map(u => (
                                                    <div key={u.id} className="bg-white rounded-[32px] p-6 border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group flex flex-col h-full">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/20">
                                                                    {residentNameInitial(u)}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                                                                        {residentDisplayName(u)}
                                                                    </h4>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                        {u.barangay || 'Area Unspecified'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openEditModal(u)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit size={16} /></button>
                                                                <button onClick={() => confirmDelete(u, 'user')} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                                            </div>
                                                        </div>

                                                        {/* Specialized Report Container */}
                                                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 mb-6">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Incident Logs</span>
                                                                <AlertCircle size={12} className="text-slate-300" />
                                                            </div>
                                                            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                                                {allIncidents.filter(i => i.user_id === u.id).length > 0 ? (
                                                                    allIncidents.filter(i => i.user_id === u.id).map(i => (
                                                                        <div key={i.id} className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i.status === 'Resolved' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                                                                <span className="text-[10px] font-bold text-slate-700 truncate">{i.type}</span>
                                                                            </div>
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap ml-2">{i.status}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-[10px] text-slate-300 italic py-4 text-center">No reports on file</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Path</span>
                                                                <span className="text-xs font-bold text-slate-700">{u.phone || 'No phone set'}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedUserProfile(u)}
                                                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                            >
                                                                Full Profile
                                                            </button>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        <Pagination
                                            currentPage={userPage}
                                            totalItems={userStats.total}
                                            pageSize={PAGE_SIZE}
                                            onPageChange={setUserPage}
                                        />
                                    </div>
                                )
                            }

                            {/* --- SUPPORT HUB TAB --- */}
                            {
                                currentTab === 'support' && (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-8">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('support_hub_title')}</h3>
                                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{t('support_hub_subtitle')}</p>
                                            </div>
                                            <div className="h-10 px-4 bg-blue-50 rounded-xl flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{t('active_monitoring')}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {supportTickets.length > 0 ? supportTickets.map(ticket => (
                                                <div key={ticket.id} className="p-6 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                                                <Bot size={24} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-800">{ticket.user_name || 'Resident'} - Handoff Request</h4>
                                                                <p className="text-xs text-slate-500 mt-1">{new Date(ticket.created_at).toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${ticket.status === 'Open' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                {ticket.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-slate-100 mb-4">
                                                        <p className="text-xs text-slate-600 font-bold leading-relaxed">"{ticket.description}"</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setSelectedTranscript(ticket)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all">
                                                            {t('open_transcript')}
                                                        </button>
                                                        <button onClick={() => handleResolveTicket(ticket.id)} className="px-6 py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-blue-600 hover:border-blue-200 transition-all">
                                                            {t('mark_resolved')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                                    <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-bold">{t('no_support_requests')}</p>
                                                    <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2 leading-loose">{t('ai_handling')}</p>
                                                </div>
                                            )}
                                        </div>
                                        <Pagination
                                            currentPage={supportPage}
                                            totalItems={stats.totalTickets || 0}
                                            pageSize={PAGE_SIZE}
                                            onPageChange={setSupportPage}
                                        />
                                    </div>
                                )
                            }

                            {/* --- BILLS TAB --- */}
                            {
                                currentTab === 'bills' && (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Water Billing System</h3>
                                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">{t('billing_system_subtitle')}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsBillModalOpen(true)}
                                                className="btn-premium !w-auto px-6 h-12 flex items-center gap-2"
                                            >
                                                <Receipt size={18} /> {t('generate_new_bill')}
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">Resident / ID</th>
                                                        <th className="px-6 py-4">Acct No.</th>
                                                        <th className="px-6 py-4">Period</th>
                                                        <th className="px-6 py-4 text-center">Reading (m³)</th>
                                                        <th className="px-6 py-4 text-center">Amount</th>
                                                        <th className="px-6 py-4 text-center">Status</th>
                                                        <th className="px-6 py-4 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 font-bold text-sm text-slate-700">
                                                    {(() => {
                                                        const bq = searchQuery.trim();
                                                        const filtered = bills.filter(bill =>
                                                            (bill.profiles?.full_name || '').toLowerCase().includes(bq.toLowerCase()) ||
                                                            (bill.id || '').toString().includes(bq) ||
                                                            (bill.account_no || '').toLowerCase().includes(bq.toLowerCase())
                                                        );

                                                        if (filtered.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan="7" className="py-20 text-center">
                                                                        <p className="text-slate-400 font-bold mb-1">
                                                                            {bq ? `No billing records found matching "${searchQuery}"` : t('no_bills_found')}
                                                                        </p>
                                                                        {bq ? (
                                                                            <p className="text-[10px] text-slate-300 uppercase tracking-widest leading-loose">Verify the account number or name and try again</p>
                                                                        ) : null}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return filtered.map(bill => (
                                                            <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <p className="text-slate-800">{bill.profiles?.full_name || 'Resident'}</p>
                                                                    <p className="text-[10px] font-mono text-slate-400 uppercase">#{(bill.id || '').slice(0, 8)}</p>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs">{bill.account_no || '—'}</td>
                                                                <td className="px-6 py-4 text-xs">
                                                                    {bill.reading_date ? new Date(bill.reading_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">{bill.consumption ?? '—'}</td>
                                                                <td className="px-6 py-4 text-center text-blue-600 font-black">₱{(bill.amount ?? 0).toLocaleString()}</td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border 
                                                                ${bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                            bill.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                                'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                                        {bill.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handlePrintReceipt(bill)}
                                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Printer size={16} />
                                                                    </button>
                                                                    <button onClick={() => confirmDelete(bill, 'bill')} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                            {bills.length === 0 && <p className="text-center text-slate-400 font-bold py-16 uppercase tracking-widest text-[10px]">No bills generated yet.</p>}
                                            <Pagination
                                                currentPage={billPage}
                                                totalItems={stats.totalBills || 0}
                                                pageSize={PAGE_SIZE}
                                                onPageChange={setBillPage}
                                            />
                                        </div>
                                    </div>
                                )
                            }

                            {/* --- ADVISORIES TAB --- */}
                            {
                                currentTab === 'advisories' && (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('service_advisories_title')}</h3>
                                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{t('service_advisories_subtitle')}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsAnnouncementModalOpen(true)}
                                                className="btn-premium !w-auto px-6 h-12 flex items-center gap-2"
                                            >
                                                <Zap size={18} /> {t('new_advisory')}
                                            </button>
                                        </div>

                                        <div className="grid gap-4">
                                            {announcements.length > 0 ? announcements.map(ann => (
                                                <div key={ann.id} className={`p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${ann.is_active ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${ann.type === 'Emergency' ? 'bg-rose-500 shadow-lg shadow-rose-200' : ann.type === 'Maintenance' ? 'bg-blue-500 shadow-lg shadow-blue-200' : 'bg-emerald-500'}`}>
                                                            {ann.type[0]}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-slate-800">{ann.title}</h4>
                                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${ann.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                                                    {ann.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 mt-1 max-w-md">{ann.content}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{new Date(ann.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => toggleAnnouncementStatus(ann)}
                                                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ann.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
                                                        >
                                                            {ann.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button onClick={() => confirmDelete(ann, 'announcement')} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                                    <Zap className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-bold">No active advisories</p>
                                                    <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2 leading-loose">All systems are currently operational</p>
                                                </div>
                                            )}
                                        </div>
                                        <Pagination
                                            currentPage={advisoryPage}
                                            totalItems={stats.totalAdvisories || 0}
                                            pageSize={PAGE_SIZE}
                                            onPageChange={setAdvisoryPage}
                                        />
                                    </div>
                                )
                            }

                            {/* --- DELIVERY LOGS TAB --- */}
                            {
                                currentTab === 'delivery' && (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('delivery_tab')}</h3>
                                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest max-w-2xl">
                                                    {t('delivery_logs_hint')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => refreshDeliveryLogs()}
                                                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                                            >
                                                {t('delivery_logs_refresh')}
                                            </button>
                                        </div>
                                        {deliveryLogsLoading ? (
                                            <p className="text-sm text-slate-500 py-12 text-center font-bold">{t('delivery_logs_loading')}</p>
                                        ) : deliveryLogs.length === 0 ? (
                                            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-500 font-bold text-sm">{t('delivery_logs_empty')}</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                        <tr>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_time')}</th>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_channel')}</th>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_context')}</th>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_recipient')}</th>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_status')}</th>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_attempts')}</th>
                                                            <th className="px-3 py-3 min-w-[140px]">{t('delivery_logs_col_error')}</th>
                                                            <th className="px-3 py-3">{t('delivery_logs_col_action')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {deliveryLogs.map((row) => {
                                                            const attempts = row.attempt_count ?? 1;
                                                            const maxA = row.max_attempts ?? 5;
                                                            const canRetry =
                                                                row.status === 'failed' && attempts < maxA;
                                                            return (
                                                                <tr key={row.id} className="hover:bg-slate-50/80">
                                                                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                                                                        {row.created_at
                                                                            ? new Date(row.created_at).toLocaleString()
                                                                            : '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 font-bold uppercase text-slate-700">
                                                                        {row.channel}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate" title={`${row.context_type || ''} ${row.context_id || ''}`}>
                                                                        {(row.context_type || '—') + (row.context_id ? ` · ${String(row.context_id).slice(0, 8)}…` : '')}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-slate-700 max-w-[140px] truncate" title={row.recipient}>
                                                                        {row.recipient}
                                                                    </td>
                                                                    <td className="px-3 py-2.5">
                                                                        <span
                                                                            className={`font-black uppercase text-[10px] px-2 py-1 rounded-lg ${
                                                                                row.status === 'sent'
                                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                                    : 'bg-rose-100 text-rose-700'
                                                                            }`}
                                                                        >
                                                                            {row.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-slate-600">
                                                                        {attempts}/{maxA}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-rose-600 max-w-[200px] break-words">
                                                                        {row.failure_reason || '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2.5">
                                                                        {canRetry ? (
                                                                            <button
                                                                                type="button"
                                                                                disabled={retryingDeliveryId === row.id}
                                                                                onClick={() => handleRetryDelivery(row.id)}
                                                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                                                            >
                                                                                {retryingDeliveryId === row.id ? '…' : t('delivery_logs_retry')}
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-slate-300">—</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            {/* --- SETTINGS TAB --- */}
                            {
                                currentTab === 'system' && (
                                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                                        <div className="max-w-xl mx-auto">
                                            <h3 className="text-2xl font-black text-slate-800 mb-6">{t('system_settings')}</h3>
                                            <div className="space-y-6">
                                                <div className="p-6 border rounded-2xl bg-slate-50">
                                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap size={20} className="text-blue-600" /> {t('ai_config')}</h4>

                                                    <div className="mb-4">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('mascot_name')}</label>
                                                        <input
                                                            type="text"
                                                            value={aiSettings.mascotName}
                                                            onChange={e => setAiSettings({ ...aiSettings, mascotName: e.target.value })}
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-200"
                                                        />
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('welcome_msg')}</label>
                                                        <textarea
                                                            value={aiSettings.welcomeMessage}
                                                            onChange={e => setAiSettings({ ...aiSettings, welcomeMessage: e.target.value })}
                                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 h-24"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={aiSettings.isMaintenance}
                                                                onChange={e => setAiSettings({ ...aiSettings, isMaintenance: e.target.checked })}
                                                                className="w-5 h-5 rounded border-gray-300 text-blue-600"
                                                            />
                                                            <span className="text-sm font-bold text-slate-700">{t('maintenance_mode')}</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <button onClick={handleSaveAiSettings} className="btn-premium w-full py-4">
                                                    {t('save_sys_config')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div> {/* end min-h-[500px] */}
                    </div> {/* end flex-1 overflow-hidden */}
                </div> {/* end flex flex-col lg:flex-row gap-8 */}

                {/* --- MODALS --- */}

                {/* Incident Modal */}
                {
                    selectedIncident && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-[32px] p-0 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] sm:max-h-[90vh]">
                                <div className="w-full md:w-1/2 bg-slate-100 relative min-h-[200px] sm:min-h-[300px]">
                                    {/* Map or Image View */}
                                    {selectedIncident.image_url ? (
                                        <img src={selectedIncident.image_url} className="w-full h-full object-cover" alt="Incident" />
                                    ) : selectedIncident.latitude ? (
                                        <MapContainer center={[selectedIncident.latitude, selectedIncident.longitude]} zoom={15} style={{ height: '100%', minHeight: '200px' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <Marker position={[selectedIncident.latitude, selectedIncident.longitude]} />
                                        </MapContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Imagery Available</div>
                                    )}
                                </div>
                                <div className="w-full md:w-1/2 p-6 sm:p-8 overflow-y-auto">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">{selectedIncident.type}</h3>
                                        <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X className="text-slate-400" /></button>
                                    </div>
                                    <div className="relative mb-6">
                                        <pre className="text-[10px] sm:text-xs font-mono bg-slate-50 p-3 sm:p-4 rounded-xl whitespace-pre-wrap pr-12">{generateServiceReport(selectedIncident)}</pre>
                                        <button
                                            onClick={() => handleCopyServiceReport(selectedIncident)}
                                            className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Copy Service Report"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <button
                                            onClick={() => updateStatus('In Progress')}
                                            className={`py-2.5 sm:py-3 font-bold rounded-xl text-[10px] sm:text-xs uppercase transition-all ${selectedIncident.status === 'In Progress' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}
                                        >
                                            Acknowledge
                                        </button>
                                        <button
                                            onClick={() => updateStatus('Resolved')}
                                            className={`py-2.5 sm:py-3 font-bold rounded-xl text-[10px] sm:text-xs uppercase transition-all ${selectedIncident.status === 'Resolved' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            onClick={() => updateStatus('Dispatched')}
                                            className={`py-3 sm:py-4 font-black uppercase rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs ${selectedIncident.status === 'Dispatched' ? 'bg-indigo-700 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                        >
                                            <Truck size={14} /> Dispatch
                                        </button>
                                        <button
                                            onClick={() => updateStatus('On-Site')}
                                            className={`py-3 sm:py-4 font-black uppercase rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs ${selectedIncident.status === 'On-Site' ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                                        >
                                            <Zap size={14} /> On-Site
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            onClick={() => {
                                                const doc = new jsPDF();
                                                doc.setFontSize(20);
                                                doc.text('INCIDENT SERVICE REPORT', 20, 20);
                                                doc.setFontSize(10);
                                                doc.text(`ID: ${selectedIncident.id}`, 20, 30);
                                                doc.text(`Type: ${selectedIncident.type}`, 20, 40);
                                                doc.text(`Status: ${selectedIncident.status}`, 20, 50);
                                                doc.text(`Date: ${new Date(selectedIncident.created_at).toLocaleString()}`, 20, 60);
                                                doc.setFontSize(12);
                                                doc.text('Description:', 20, 80);
                                                doc.setFontSize(10);
                                                doc.text(selectedIncident.description || 'No description provided.', 20, 90, { maxWidth: 170 });
                                                doc.save(`Incident_Report_${selectedIncident.id.slice(0, 8)}.pdf`);
                                            }}
                                            className="py-3 sm:py-4 bg-slate-100 text-slate-700 font-bold uppercase rounded-xl flex items-center justify-center gap-2 text-[10px] sm:text-xs hover:bg-slate-200"
                                        >
                                            <Download size={14} /> Download PDF
                                        </button>
                                        <button onClick={() => confirmDelete(selectedIncident, 'incident')} className="py-2.5 text-rose-500 font-bold text-[10px] sm:text-xs uppercase hover:bg-rose-50 rounded-xl transition-colors">Delete Report</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* User Profile Modal */}
                {
                    selectedUserProfile && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-[40px] p-10 max-w-3xl w-full shadow-2xl shadow-blue-900/10 max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-blue-500/30">
                                            {residentNameInitial(selectedUserProfile)}
                                        </div>
                                        <div>
                                            <h3 className="text-4xl font-black text-slate-800 tracking-tight">{residentDisplayName(selectedUserProfile)}</h3>
                                            <p className="text-lg text-slate-500 font-bold mt-1">{selectedUserProfile.email}</p>
                                            <div className="flex items-center gap-3 mt-3">
                                                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${selectedUserProfile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{selectedUserProfile.role}</span>
                                                <span className="text-xs font-black uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                                    <MapPin size={12} /> {selectedUserProfile.barangay || 'No Area Specified'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUserProfile(null)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all shadow-sm"><X size={20} className="text-slate-500 font-bold" /></button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                                    <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><User size={12} /> First Name</p>
                                        <p className="font-black text-xl text-slate-700">{profileFirstName(selectedUserProfile) || 'Not set'}</p>
                                        {!selectedUserProfile.first_name?.trim() && profileFirstName(selectedUserProfile) && (
                                            <p className="text-[9px] font-bold text-slate-400 mt-1">From full name</p>
                                        )}
                                    </div>
                                    <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><User size={12} /> Last Name</p>
                                        <p className="font-black text-xl text-slate-700">{profileLastName(selectedUserProfile) || 'Not set'}</p>
                                        {!selectedUserProfile.last_name?.trim() && profileLastName(selectedUserProfile) && (
                                            <p className="text-[9px] font-bold text-slate-400 mt-1">From full name</p>
                                        )}
                                    </div>
                                    <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-3xl border border-slate-100 md:col-span-1 col-span-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Phone size={12} /> Contact Path</p>
                                        <p className="font-black text-xl text-slate-700">{profilePhoneDisplay(selectedUserProfile) || 'No phone set'}</p>
                                        {!profilePhoneDisplay(selectedUserProfile) && (
                                            <p className="text-[9px] font-bold text-slate-400 mt-1 leading-snug">
                                                Not in database yet — use Edit on the resident card, or run{' '}
                                                <span className="font-mono text-[8px]">profiles_sync_contact_from_auth.sql</span> if the number exists in Auth metadata.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 mb-10">
                                    <button onClick={() => {
                                        handleSendBill(selectedUserProfile);
                                    }} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Receipt size={18} /> Issue Formal Bill
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentTab('incidents');
                                            setSearchQuery(selectedUserProfile.full_name);
                                            setSelectedUserProfile(null);
                                        }}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Search size={18} /> Deep View Activity
                                    </button>
                                </div>

                                {/* History Lists */}
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Recent Incident Logs
                                        </h4>
                                        <div className="space-y-3">
                                            {allIncidents.filter(i => i.user_id === selectedUserProfile.id).length > 0 ? (
                                                allIncidents.filter(i => i.user_id === selectedUserProfile.id).slice(0, 5).map(i => (
                                                    <div key={i.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">{i.type}</p>
                                                            <p className="text-[9px] text-slate-400 uppercase font-black">{new Date(i.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${i.status === 'Resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{i.status}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl">No reports logged for this resident.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Transaction History
                                        </h4>
                                        <div className="space-y-3">
                                            {bills.filter(b => b.user_id === selectedUserProfile.id).length > 0 ? (
                                                bills.filter(b => b.user_id === selectedUserProfile.id).slice(0, 5).map(b => (
                                                    <div key={b.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">Water Consumption Bill</p>
                                                            <p className="text-[9px] text-slate-400 uppercase font-black">{new Date(b.reading_date).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className="font-black text-slate-900 text-sm">₱{b.amount.toLocaleString()}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl">No billing history found.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Receipt Modal */}
                {
                    selectedTransaction && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                            <div className="bg-white p-8 max-w-md w-full shadow-2xl relative print-modal">
                                <button onClick={() => setSelectedTransaction(null)} className="absolute top-4 right-4 print:hidden"><X /></button>

                                <div className="text-center mb-8 border-b-2 border-dashed border-slate-200 pb-8">
                                    <h2 className="text-3xl font-black text-slate-800 mb-1">PrimeWater</h2>
                                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Official Receipt</p>
                                </div>

                                <div className="space-y-4 mb-8 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Receipt ID</span>
                                        <span className="font-mono font-bold">{selectedTransaction.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Date</span>
                                        <span className="font-bold">{selectedTransaction.date}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Customer</span>
                                        <span className="font-bold">{selectedTransaction.user}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Payment Method</span>
                                        <span className="font-bold">{selectedTransaction.method}</span>
                                    </div>
                                    <div className="my-4 border-t border-slate-100"></div>
                                    <div className="flex justify-between text-lg font-black text-emerald-600">
                                        <span>TOTAL</span>
                                        <span>₱{selectedTransaction.amount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="text-center print:hidden">
                                    <button
                                        onClick={() => window.print()}
                                        className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-black flex items-center justify-center gap-2"
                                    >
                                        <Printer size={20} /> Print Receipt
                                    </button>
                                </div>

                                <div className="hidden print:block text-center mt-8 text-xs text-slate-400">
                                    Thank you for your payment. <br /> This is a system generated receipt.
                                </div>

                                <style>{`
                            @media print {
                                body * { visibility: hidden; }
                                .print-modal, .print-modal * { visibility: visible; }
                                .print-modal { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; }
                                .print:hidden { display: none !important; }
                            }
                        `}</style>
                            </div>
                        </div>
                    )
                }

                {/* Notification Toast */}
                {
                    notification && (
                        <div className={`fixed bottom-6 right-6 z-[110] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-slide-up ${notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            <span className="font-bold text-sm">{notification.message}</span>
                        </div>
                    )
                }

                {/* Confirm Modal */}
                {
                    confirmModal.isOpen && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl p-8 max-w-sm w-full">
                                <h3 className="text-xl font-black text-slate-800 text-center mb-2">{confirmModal.title}</h3>
                                <p className="text-slate-500 text-center mb-6">{confirmModal.message}</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-600">Cancel</button>
                                    <button onClick={confirmModal.onConfirm} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg">Confirm</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bill Generation Modal */}
                {
                    isBillModalOpen && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                            <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative animate-slide-up">
                                <button onClick={() => setIsBillModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                        <Receipt size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('generate_bill_title')}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Send to resident dashboard</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateBill} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('select_resident')}</label>
                                        <div className="relative">
                                            <div
                                                onClick={() => setIsResidentDropdownOpen(!isResidentDropdownOpen)}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-700 cursor-pointer flex justify-between items-center group hover:border-blue-200 transition-all"
                                            >
                                                <span className={billForm.user_id ? "text-slate-800" : "text-slate-400"}>
                                                    {billForm.user_id
                                                        ? users.find(u => u.id === billForm.user_id)?.full_name
                                                        : "Search resident by name..."}
                                                </span>
                                                <Search size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            </div>

                                            {isResidentDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-[150] overflow-hidden animate-slide-up">
                                                    <div className="p-3 border-b border-slate-50">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Type to filter residents..."
                                                            value={residentSearchQuery}
                                                            onChange={(e) => setResidentSearchQuery(e.target.value)}
                                                            className="w-full px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20"
                                                        />
                                                    </div>
                                                    <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                        {users
                                                            .filter(u => u.role === 'customer' &&
                                                                (u.full_name?.toLowerCase().includes(residentSearchQuery.toLowerCase()) ||
                                                                    u.email?.toLowerCase().includes(residentSearchQuery.toLowerCase()))
                                                            )
                                                            .map(u => (
                                                                <div
                                                                    key={u.id}
                                                                    onClick={() => {
                                                                        setBillForm({ ...billForm, user_id: u.id, address: u.address || '' });
                                                                        setIsResidentDropdownOpen(false);
                                                                        setResidentSearchQuery('');
                                                                    }}
                                                                    className="px-4 py-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors group"
                                                                >
                                                                    <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{u.full_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</p>
                                                                </div>
                                                            ))}
                                                        {users.filter(u => u.role === 'customer' &&
                                                            (u.full_name?.toLowerCase().includes(residentSearchQuery.toLowerCase()) ||
                                                                u.email?.toLowerCase().includes(residentSearchQuery.toLowerCase()))
                                                        ).length === 0 && (
                                                                <div className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                                    No residents found
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('account_number')}</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="01-2345-678"
                                                value={billForm.account_no}
                                                onChange={e => setBillForm({ ...billForm, account_no: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('due_date')}</label>
                                            <input
                                                type="date"
                                                required
                                                value={billForm.due_date}
                                                onChange={e => setBillForm({ ...billForm, due_date: e.target.value })}
                                                className="w-full px-5 py-5 rounded-2xl border-2 border-slate-200 bg-white font-black text-xl text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm [&::-webkit-calendar-picker-indicator]:scale-150 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('consumption_label')}</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                required
                                                value={billForm.consumption}
                                                onChange={e => setBillForm({ ...billForm, consumption: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('amount_label')}</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={billForm.amount}
                                                onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-5 bg-blue-600 text-white font-black uppercase text-sm rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                                    >
                                        {t('issue_bill_btn')} <ArrowRight size={20} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Edit User Modal */}
                {
                    editModal.isOpen && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-slate-800">{t('edit_user')}</h3>
                                    <button onClick={() => setEditModal({ isOpen: false, user: null })} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="text-slate-400" /></button>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">First Name</label>
                                            <input
                                                type="text"
                                                value={editForm.first_name}
                                                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                                                placeholder="Enter first name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Name</label>
                                            <input
                                                type="text"
                                                value={editForm.last_name}
                                                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                                                placeholder="Enter last name"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Residential Area / Barangay</label>
                                        <input
                                            type="text"
                                            value={editForm.barangay}
                                            onChange={(e) => setEditForm({ ...editForm, barangay: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="e.g. Barangay Casisang"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone (SMS / contact)</label>
                                        <input
                                            type="text"
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="09XXXXXXXXX"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name Reference</label>
                                        <input
                                            type="text"
                                            value={editForm.full_name}
                                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditForm({ ...editForm, role: 'customer' })}
                                                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border-2 transition-all ${editForm.role === 'customer' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                                            >
                                                Customer
                                            </button>
                                            <button
                                                onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                                                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border-2 transition-all ${editForm.role === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'}`}
                                            >
                                                Admin
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateUser}
                                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {t('save_changes')}
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Hidden Receipt Template for Printing */}
                {
                    selectedBillForPrint && (
                        <ReceiptTemplate
                            bill={selectedBillForPrint}
                            user={selectedBillForPrint.profiles || { full_name: 'Resident' }}
                        />
                    )
                }
                {/* Advisory Creation Modal */}
                {
                    isAnnouncementModalOpen && (
                        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                            <div className="bg-white rounded-[40px] p-10 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-slide-up">
                                <button onClick={() => setIsAnnouncementModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('post_new_advisory')}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('broadcast_subtitle')}</p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                                        <div className="flex gap-2">
                                            {['Emergency', 'Maintenance', 'Update'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setAnnouncementForm({ ...announcementForm, type })}
                                                    className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border-2 transition-all ${announcementForm.type === type ? (type === 'Emergency' ? 'border-rose-500 bg-rose-50 text-rose-600' : type === 'Maintenance' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-emerald-500 bg-emerald-50 text-emerald-600') : 'border-slate-100 bg-white text-slate-400'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Headline</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Scheduled Maintenance"
                                            value={announcementForm.title}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Message</label>
                                        <textarea
                                            required
                                            placeholder="Explain the details here..."
                                            rows={4}
                                            value={announcementForm.content}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target barangays (optional)</label>
                                        <p className="text-[10px] font-bold text-slate-400 mb-2">Leave none selected to notify all customers. Otherwise only profiles whose barangay field matches a selected name receive SMS/email.</p>
                                        <button
                                            type="button"
                                            onClick={() => setAnnouncementForm({ ...announcementForm, target_barangays: [] })}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 hover:underline"
                                        >
                                            Clear — all barangays
                                        </button>
                                        <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-2 space-y-1 custom-scrollbar">
                                            {advisoryBarangayNames.length === 0 ? (
                                                <p className="text-xs text-slate-400 px-2 py-4">Loading barangays…</p>
                                            ) : (
                                                advisoryBarangayNames.map((name) => (
                                                    <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={(announcementForm.target_barangays || []).includes(name)}
                                                            onChange={() => {
                                                                const cur = announcementForm.target_barangays || [];
                                                                setAnnouncementForm({
                                                                    ...announcementForm,
                                                                    target_barangays: cur.includes(name)
                                                                        ? cur.filter((x) => x !== name)
                                                                        : [...cur, name],
                                                                });
                                                            }}
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600"
                                                        />
                                                        <span className="text-xs font-bold text-slate-700">{name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                        <input
                                            type="checkbox"
                                            id="sendSmsOption"
                                            checked={announcementForm.send_sms}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, send_sms: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                            <label htmlFor="sendSmsOption" className="text-sm font-black text-rose-700 cursor-pointer">Mass SMS broadcast</label>
                                            <span className="text-[10px] text-rose-500 font-bold leading-tight">Sends via httpSMS to selected residents (respects barangay filter above).</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                        <input
                                            type="checkbox"
                                            id="sendEmailOption"
                                            checked={announcementForm.send_email}
                                            onChange={e => setAnnouncementForm({ ...announcementForm, send_email: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                            <label htmlFor="sendEmailOption" className="text-sm font-black text-indigo-800 cursor-pointer">Mass email broadcast</label>
                                            <span className="text-[10px] text-indigo-600 font-bold leading-tight">Sends the same advisory by Gmail to residents with an email on file (respects barangay filter).</span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-5 bg-slate-900 text-white font-black uppercase text-sm rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                                    >
                                        {t('publish_alert')} <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }
                {/* Transcript Modal */}
                {
                    selectedTranscript && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">{t('chat_transcript')}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Resident: {selectedTranscript.user_name || 'Anonymous Resident'}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedTranscript(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[300px]">
                                    {selectedTranscript.metadata?.transcript?.length > 0 ? (
                                        selectedTranscript.metadata.transcript.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'}`}>
                                                    <p className="text-sm font-bold whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                                            <Bot size={32} className="mb-2 text-slate-300" />
                                            <p>{t('no_chat_history')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* --- GAP 4: Delivery Tracking Report Modal --- */}
                {
                    deliveryReport && (
                        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                            <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl relative animate-scale-up text-center border-4 border-slate-50">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-inner">
                                    <Send size={40} className="animate-bounce" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">{t('broadcast_sent')}</h3>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{t('delivery_report_generated')}</p>

                                <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100 space-y-6">
                                    <h4 className="font-bold text-slate-800">{deliveryReport.announcement.title}</h4>

                                    {deliveryReport.sms && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">SMS (httpSMS)</p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                                    <span className="text-slate-500">{t('total_targets')}</span>
                                                    <span className="font-black text-slate-800">{deliveryReport.sms.totalTarget}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                                    <span className="text-emerald-600 font-bold">{t('delivered')}</span>
                                                    <span className="font-black text-emerald-600">{deliveryReport.sms.successCount}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-rose-600 font-bold">{t('failed')}</span>
                                                    <span className="font-black text-rose-600">{deliveryReport.sms.failedCount}</span>
                                                </div>
                                                {deliveryReport.sms.errorHint && (
                                                    <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug mt-2">
                                                        {deliveryReport.sms.errorHint}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {deliveryReport.email && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email (Gmail)</p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                                    <span className="text-slate-500">{t('total_targets')}</span>
                                                    <span className="font-black text-slate-800">{deliveryReport.email.totalTarget}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-200 pb-1">
                                                    <span className="text-emerald-600 font-bold">{t('delivered')}</span>
                                                    <span className="font-black text-emerald-600">{deliveryReport.email.successCount}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-rose-600 font-bold">{t('failed')}</span>
                                                    <span className="font-black text-rose-600">{deliveryReport.email.failedCount}</span>
                                                </div>
                                                {deliveryReport.email.errorHint && (
                                                    <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug mt-2">
                                                        {deliveryReport.email.errorHint}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {!deliveryReport.sms && !deliveryReport.email && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('total_targets')}</span>
                                                <span className="font-black text-slate-800">{deliveryReport.totalTarget}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {t('delivered')}
                                                </span>
                                                <span className="font-black text-emerald-600">{deliveryReport.successCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div> {t('failed')}
                                                </span>
                                                <span className="font-black text-rose-600">{deliveryReport.failedCount}</span>
                                            </div>
                                        </div>
                                    )}

                                    {(deliveryReport.zeroRecipientHintKeys?.length > 0 || deliveryReport.recipientsQueryError) && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">
                                                {t('delivery_zero_heading')}
                                            </p>
                                            <ul className="list-disc pl-4 space-y-1.5 text-xs font-semibold text-amber-950 leading-snug">
                                                {deliveryReport.recipientsQueryError && (
                                                    <li>
                                                        {t('delivery_zero_query_error')}: {deliveryReport.recipientsQueryError}
                                                    </li>
                                                )}
                                                {(deliveryReport.zeroRecipientHintKeys || []).map((key) => (
                                                    <li key={key}>{t(key)}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setDeliveryReport(null)}
                                    className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95"
                                >
                                    {t('acknowledge')}
                                </button>
                            </div>
                        </div>
                    )
                }
            </main >

            <ProfileManagementModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                onUpdate={handleUpdateProfile}
            />

            {/* Notification Toast */}
            {
                notification && (
                    <div className={`fixed bottom-8 right-8 z-[150] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-up ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                        {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <p className="font-black text-sm uppercase tracking-widest">{notification.message}</p>
                    </div>
                )
            }
        </div >
    );
}

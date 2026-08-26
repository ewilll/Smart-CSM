import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';
import {
    BookOpen, Droplets, ShieldAlert, PhoneCall, ChevronRight,
    Waves, Shield, CheckCircle2, Lightbulb, Zap, Rocket, Globe,
    MapPin, Mail, Phone, QrCode as QRIcon, Smartphone
} from 'lucide-react';
import QRCode from 'react-qr-code';
import DashboardHeader from '../../components/common/DashboardHeader';

export default function InfoHub() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [qrValue, setQrValue] = useState('https://start.smart-csm.com');
    const [useLocal, setUseLocal] = useState(false);
    const [activeTip, setActiveTip] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const isProduction = window.location.hostname === 'start.smart-csm.com';

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        setUser(getCurrentUser());
        document.title = "Information Hub | Smart CSM";

        if (!isProduction && useLocal) {
            const origin = window.location.origin;
            const autoIp = origin.replace('localhost', '10.0.0.10');
            setQrValue(autoIp);
        } else {
            setQrValue('https://start.smart-csm.com');
        }
    }, [navigate, useLocal, isProduction]);

    // Auto-advance Conservation Tips
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTip((prev) => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    if (!user) return null;

    const waterTips = [
        { q: "Fix Leaky Faucets", a: "A single drip can waste over 3,000 gallons of water per year. Check pipes regularly." },
        { q: "Shorten Showers", a: "Reducing your shower by just 2 minutes saves up to 10 gallons of water." },
        { q: "Full Loads Only", a: "Run your dishwasher and laundry only when completely full to maximize efficiency." }
    ];

    const emergencySections = [
        {
            title: "Emergency Procedures",
            icon: <ShieldAlert size={24} className="text-rose-500" />,
            bgColor: "bg-rose-50",
            items: [
                { q: "Major Pipe Burst", a: "Immediately shut off your main water valve and report the incident via the dashboard." },
                { q: "Water Contamination", a: "Do not consume tap water. Wait for official clearance via the Global Ticker." }
            ]
        },
        {
            title: "Important Contacts",
            icon: <PhoneCall size={24} className="text-emerald-500" />,
            bgColor: "bg-emerald-50",
            items: [
                { q: "Support Hotline", a: "1-800-PRIME-H2O (Available 24/7)" },
                { q: "Maintenance", a: "0917-123-4567 (Text / Call)" },
                { q: "Email", a: "support@prime.ph" }
            ]
        }
    ];

    return (
        <div className="dashboard-layout">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            <main className="dashboard-main">
                <DashboardHeader
                    user={user}
                    onUpdateUser={setUser}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    title="Information Hub"
                    subtitle="Unified Resources & Heritage"
                    icon={<BookOpen size={24} toggleSidebar={toggleSidebar}
                    />}
                />

                <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 pb-20">

                    {/* Hero Banner */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-8 md:p-10 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10 max-w-3xl">
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4 border border-blue-100">Official Knowledge Center</span>
                            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">PrimeWater <span className="text-blue-600">Smart CSM</span></h3>
                            <p className="text-slate-600 font-medium text-base md:text-lg leading-relaxed">
                                Pioneering sustainable water management since 1982. Your unified resource for heritage, water standards, and conservation guidelines.
                            </p>
                        </div>
                        <Waves className="absolute -bottom-8 -right-8 w-64 h-64 text-slate-50 pointer-events-none -rotate-12" />
                    </div>

                    {/* Heritage & Standards Summary */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-blue-50 rounded-xl">
                                    <Waves className="w-5 h-5 text-blue-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900">Our Heritage</h4>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                Over 40 years of service, evolving from a local initiative to an international-standard utility provider serving millions of households.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-2xl font-bold text-blue-600">40+</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Years</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-2xl font-bold text-blue-600">2M+</p>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Users</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-emerald-50 rounded-xl">
                                    <Shield className="w-5 h-5 text-emerald-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900">Water Standards</h4>
                            </div>
                            <ul className="space-y-4 mt-6">
                                {[
                                    "WHO Guidelines Compliant",
                                    "PNSDW Certified Standards",
                                    "Real-time Quality Monitoring"
                                ].map((std, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                                        <div className="p-1 bg-emerald-50 rounded-md">
                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                        </div>
                                        {std}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Guidelines & Tips Section */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Conservation Tips (Interactive Carousel Style) */}
                        <div className="lg:col-span-2 bg-blue-600 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-sm">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <Lightbulb className="text-blue-200" />
                                        <h3 className="text-xl font-bold">Conservation Tips</h3>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {waterTips.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all ${activeTip === i ? 'bg-white w-6' : 'bg-white/30 w-1.5'}`}></div>
                                        ))}
                                    </div>
                                </div>
                                <div key={activeTip} className="animate-slide-up h-24">
                                    <h5 className="font-semibold text-lg mb-2">{waterTips[activeTip].q}</h5>
                                    <p className="text-blue-50 text-sm leading-relaxed max-w-md">{waterTips[activeTip].a}</p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 text-white/10 font-bold text-8xl pointer-events-none">H2O</div>
                        </div>

                        {/* PWA / Mobile Scan */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                                <QRCode value={qrValue} size={100} level="H" fgColor="#1e293b" />
                            </div>
                            <h5 className="text-sm font-semibold text-slate-900 mb-1">Mobile Access</h5>
                            <p className="text-xs text-slate-500 mb-4">Scan to Connect</p>
                            <div className="w-full flex bg-slate-100 p-1 rounded-lg gap-1">
                                <button onClick={() => setUseLocal(false)} className={`flex-1 py-1.5 text-xs font-medium rounded-md ${!useLocal ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Cloud</button>
                                <button onClick={() => setUseLocal(true)} className={`flex-1 py-1.5 text-xs font-medium rounded-md ${useLocal ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Local</button>
                            </div>
                        </div>
                    </div>

                    {/* Emergency & Contacts */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {emergencySections.map((section, idx) => (
                            <div key={idx} className="p-6 md:p-8 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-10 h-10 rounded-xl ${section.bgColor} flex items-center justify-center`}>
                                        {React.cloneElement(section.icon, { size: 20 })}
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-900">{section.title}</h4>
                                </div>
                                <div className="space-y-3">
                                    {section.items.map((item, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-100 transition-colors">
                                            <h6 className="font-medium text-slate-900 text-sm mb-1">{item.q}</h6>
                                            <p className="text-slate-500 text-xs leading-relaxed">{item.a}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Service Territory Section */}
                    <div id="territory" className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden group mb-8">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900">PrimeWater Malaybalay Coverage</h4>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Registered Service Territory (46 Barangays)</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {["Barangays 1-11 (Poblacion District)", "Aglayan", "Apo Macote", "Bangcud", "Busdi", "Cabangahan", "Caburacanan", "Can-ayan", "Capitan Angel", "Casisang", "Dalwangan", "Imbayao", "Indalasa", "Kalaisan", "Kalasungay", "Kibalabag", "Kulaman", "Laguitas", "Linabo", "Magsaysay", "Maligaya", "Managok", "Manalog", "Mapayag", "Mapulo", "Patpat", "Saint Peter", "San Jose", "San Martin", "Santo Niño", "Silae", "Simaya", "Sinanglanan", "Sumpong", "Tigbasan", "Zamboanguita"].map((brgy, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-100 hover:bg-white hover:border-blue-200 transition-colors cursor-default">
                                        {brgy}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Acronyms & Terminology */}
                    <div id="acronyms" className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden group mb-8">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900">System Acronyms & Terminology</h4>
                                    <p className="text-xs font-medium text-slate-500 mt-1">Glossary of terms used across the platform</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                {[
                                    { term: "CSM", meaning: "Customer Service Management", desc: "The overarching system used to manage resident interactions and reports." },
                                    { term: "Aqua", meaning: "Automated Query & Utility Assistant", desc: "Our AI-powered chatbot designed to assist with water-related queries." },
                                    { term: "LWD", meaning: "Local Water District", desc: "The regulatory and distribution body for water in the municipality." },
                                    { term: "NRW", meaning: "Non-Revenue Water", desc: "Water that has been produced but is lost before it reaches the customer (e.g., leaks)." },
                                    { term: "PSI", meaning: "Pounds per Square Inch", desc: "Unit used to measure water pressure in the pipelines." },
                                    { term: "SR", meaning: "Service Request", desc: "A formal ticket created when a resident reports an issue or needs maintenance." }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col p-4 bg-slate-50 text-slate-700 rounded-xl border border-slate-100 hover:bg-white hover:border-indigo-100 transition-colors">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-indigo-700">{item.term}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="font-bold text-sm">{item.meaning}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Future Roadmap Section */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm">
                        <div className="text-center mb-8">
                            <h4 className="text-lg font-semibold text-slate-900 mb-1">System Roadmap</h4>
                            <p className="text-sm text-slate-500">Our Innovative Vision</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { title: "AI Leak Prediction", icon: <Zap size={20} /> },
                                { title: "Solar Metering", icon: <Rocket size={20} /> },
                                { title: "Global Network", icon: <Globe size={20} /> }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center p-6 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:border-blue-100 transition-colors">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                                        {item.icon}
                                    </div>
                                    <h6 className="font-semibold text-slate-900 text-sm">{item.title}</h6>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

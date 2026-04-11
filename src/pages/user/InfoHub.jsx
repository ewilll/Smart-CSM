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
                    icon={<BookOpen size={28} />}
                    iconBgColor="bg-blue-600"
                />

                <div className="max-w-6xl space-y-12 pb-20">

                    {/* Hero Banner */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl group">
                        <div className="relative z-10 max-w-3xl">
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-blue-400/20 backdrop-blur-sm">Official Knowledge Center</span>
                            <h3 className="text-5xl font-black tracking-tight mb-6">PrimeWater <span className="text-blue-400">Smart CSM</span></h3>
                            <p className="text-slate-300 font-medium text-lg leading-relaxed">
                                Pioneering sustainable water management since 1982. Your unified resource for heritage, water standards, and conservation guidelines.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-1000"></div>
                        <Waves className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 pointer-events-none -rotate-12" />
                    </div>

                    {/* Heritage & Standards Summary */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                                    <Waves className="w-6 h-6 text-blue-600" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800">Our Heritage</h4>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                Over 40 years of service, evolving from a local initiative to an international-standard utility provider serving millions of households.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-xl font-black text-blue-600">40+</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Years</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-xl font-black text-blue-600">2M+</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Users</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                                    <Shield className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800">Water Standards</h4>
                            </div>
                            <ul className="space-y-3">
                                {[
                                    "WHO Guidelines Compliant",
                                    "PNSDW Certified Standards",
                                    "Real-time Quality Monitoring"
                                ].map((std, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        {std}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Guidelines & Tips Section */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Conservation Tips (Interactive Carousel Style) */}
                        <div className="lg:col-span-2 bg-blue-600 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between group">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <Lightbulb className="text-blue-200" />
                                        <h3 className="text-2xl font-black tracking-tight">Conservation Tips</h3>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {waterTips.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all ${activeTip === i ? 'bg-white w-6' : 'bg-white/30 w-1.5'}`}></div>
                                        ))}
                                    </div>
                                </div>
                                <div key={activeTip} className="animate-slide-up h-24">
                                    <h5 className="font-black text-lg mb-2">{waterTips[activeTip].q}</h5>
                                    <p className="text-blue-50 text-sm leading-relaxed max-w-md">{waterTips[activeTip].a}</p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 text-white/5 font-black text-8xl pointer-events-none">H2O</div>
                        </div>

                        {/* PWA / Mobile Scan */}
                        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl flex flex-col items-center group/qr">
                            <div className="p-3 bg-slate-100 rounded-2xl mb-4 group-hover/qr:scale-105 transition-transform">
                                <QRCode value={qrValue} size={110} level="H" fgColor="#1e293b" />
                            </div>
                            <h5 className="text-sm font-black text-slate-800 mb-1">Mobile Access</h5>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Scan to Connect</p>
                            <div className="w-full flex bg-slate-50 p-1 rounded-xl gap-1">
                                <button onClick={() => setUseLocal(false)} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg ${!useLocal ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Cloud</button>
                                <button onClick={() => setUseLocal(true)} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg ${useLocal ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Local</button>
                            </div>
                        </div>
                    </div>

                    {/* Emergency & Contacts */}
                    <div className="grid lg:grid-cols-2 gap-8">
                        {emergencySections.map((section, idx) => (
                            <div key={idx} className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center`}>
                                        {section.icon}
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800">{section.title}</h4>
                                </div>
                                <div className="space-y-3">
                                    {section.items.map((item, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-50 hover:bg-white hover:border-blue-100 transition-all">
                                            <h6 className="font-bold text-slate-800 text-xs mb-1">{item.q}</h6>
                                            <p className="text-slate-500 text-xs leading-relaxed">{item.a}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Service Territory Section */}
                    <div id="territory" className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group mb-8">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30">
                                    <MapPin size={28} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-slate-800">PrimeWater Malaybalay Coverage</h4>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Registered Service Territory (46 Barangays)</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {["Barangays 1-11 (Poblacion District)", "Aglayan", "Apo Macote", "Bangcud", "Busdi", "Cabangahan", "Caburacanan", "Can-ayan", "Capitan Angel", "Casisang", "Dalwangan", "Imbayao", "Indalasa", "Kalaisan", "Kalasungay", "Kibalabag", "Kulaman", "Laguitas", "Linabo", "Magsaysay", "Maligaya", "Managok", "Manalog", "Mapayag", "Mapulo", "Patpat", "Saint Peter", "San Jose", "San Martin", "Santo Niño", "Silae", "Simaya", "Sinanglanan", "Sumpong", "Tigbasan", "Zamboanguita"].map((brgy, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg border border-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all cursor-default">
                                        {brgy}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Future Roadmap Section */}
                    <div className="bg-slate-50 rounded-[40px] p-10 border border-slate-200/50">
                        <div className="text-center mb-10">
                            <h4 className="text-2xl font-black text-slate-800 mb-1">System Roadmap</h4>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Our Innovative Vision</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { title: "AI Leak Prediction", icon: <Zap size={20} /> },
                                { title: "Solar Metering", icon: <Rocket size={20} /> },
                                { title: "Global Network", icon: <Globe size={20} /> }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:translate-y-[-4px] transition-transform">
                                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                                        {item.icon}
                                    </div>
                                    <h6 className="font-black text-slate-800 text-sm">{item.title}</h6>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

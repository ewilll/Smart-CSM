import React from 'react';
import Navbar from '../../components/Navbar';
import { Activity, Zap, Cpu, BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RealTimeTracking() {
    return (
        <div className="min-h-screen relative flex flex-col overflow-x-hidden water-bg">
            <Navbar />

            <section className="relative pt-32 pb-20 px-4">
                {/* Background Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#BAE6FD] via-[#7DD3FC] to-white z-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto">
                    <Link to="/" className="inline-flex items-center gap-2 text-blue-700 font-bold mb-8 hover:gap-3 transition-all">
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-100 text-cyan-600 font-bold text-xs uppercase tracking-widest mb-6">
                                <Activity size={16} />
                                Smart Monitoring
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
                                Real-time <br />
                                <span className="text-cyan-600">Consumption Tracking</span>
                            </h1>
                            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                                Experience precision like never before. Our advanced IoT integration provides up-to-the-minute data on your water usage, helping you stay informed and in control.
                            </p>

                            <div className="space-y-6">
                                <FeatureItem
                                    icon={<Zap className="text-cyan-500" />}
                                    title="Instant Updates"
                                    description="View your consumption data as it happens, with no lag or delays in reporting."
                                />
                                <FeatureItem
                                    icon={<Cpu className="text-cyan-500" />}
                                    title="IoT Driven"
                                    description="Powered by state-of-the-art smart meters that communicate wirelessly with our servers."
                                />
                                <FeatureItem
                                    icon={<BarChart3 className="text-cyan-500" />}
                                    title="Interactive Analytics"
                                    description="Visualize your usage patterns with beautiful, easy-to-understand charts and graphs."
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full"></div>
                            <div className="relative bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
                                <div className="aspect-square bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center p-12">
                                    <Activity size={120} className="text-white animate-pulse" />
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="bg-white/80 p-4 rounded-2xl shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Current Flow</p>
                                        <p className="text-2xl font-black text-slate-800">12.5 L/m</p>
                                    </div>
                                    <div className="bg-white/80 p-4 rounded-2xl shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Total Today</p>
                                        <p className="text-2xl font-black text-slate-800">420 L</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Details Section */}
            <section className="py-20 bg-white relative z-10">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Why Monitor in Real-Time?</h2>
                    <p className="text-lg text-slate-500 mb-12">
                        Traditional billing systems only tell you what you used at the end of the month. Smart CSM changes the game by giving you the data you need to save money and water right now.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <StatCard title="20%" subtitle="Avg. Savings" color="text-cyan-600" />
                        <StatCard title="2s" subtitle="Data Sync" color="text-cyan-600" />
                        <StatCard title="24/7" subtitle="Monitoring" color="text-cyan-600" />
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureItem({ icon, title, description }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function StatCard({ title, subtitle, color }) {
    return (
        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
            <h3 className={`text-4xl font-black ${color} mb-2`}>{title}</h3>
            <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">{subtitle}</p>
        </div>
    );
}

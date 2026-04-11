import React from 'react';
import Navbar from '../../components/Navbar';
import { ShieldCheck, Lock, Eye, Database, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecurePlatform() {
    return (
        <div className="min-h-screen relative flex flex-col overflow-x-hidden water-bg">
            <Navbar />

            <section className="relative pt-32 pb-20 px-4">
                {/* Background Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#D1FAE5] via-[#A7F3D0] to-white z-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto">
                    <Link to="/" className="inline-flex items-center gap-2 text-emerald-700 font-bold mb-8 hover:gap-3 transition-all">
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs uppercase tracking-widest mb-6">
                                <ShieldCheck size={16} />
                                Enterprise Security
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
                                Your Data, <br />
                                <span className="text-emerald-600">Shielded & Secured</span>
                            </h1>
                            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                                Security isn't an afterthought—it's our foundation. We use bank-grade encryption and advanced protocols to ensure your data stays private and protected.
                            </p>

                            <div className="space-y-6">
                                <FeatureItem
                                    icon={<Lock className="text-emerald-500" />}
                                    title="End-to-End Encryption"
                                    description="All data transmitted between your device and our servers is encrypted using 256-bit AES."
                                />
                                <FeatureItem
                                    icon={<Eye className="text-emerald-500" />}
                                    title="Privacy by Design"
                                    description="We strictly adhere to data protection regulations, ensuring your personal info is never shared."
                                />
                                <FeatureItem
                                    icon={<Database className="text-emerald-500" />}
                                    title="Secure Infrastructure"
                                    description="Hosted on industry-leading cloud platforms with multi-layered physical and digital security."
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full"></div>
                            <div className="relative bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
                                <div className="aspect-square bg-gradient-to-br from-emerald-400 to-green-600 rounded-3xl flex items-center justify-center p-12">
                                    <div className="w-48 h-48 bg-white/10 border-4 border-white/40 rounded-full flex items-center justify-center animate-pulse-slow">
                                        <ShieldCheck size={100} className="text-white" />
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <div className="p-4 bg-emerald-600/10 border border-emerald-600/20 rounded-2xl flex items-center gap-4">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                                        <span className="text-emerald-700 font-bold text-sm uppercase tracking-widest">Active Protection Enabled</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-20 bg-white relative z-10">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Compliance & Standards</h2>
                    <p className="text-lg text-slate-500 mb-12">
                        PrimeWater Smart CSM follows global security standards to give you peace of mind while managing your utility services.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <Badge text="SSL SECURE" />
                        <Badge text="AES-256" />
                        <Badge text="GDPR READY" />
                        <Badge text="ISO 27001" />
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

function Badge({ text }) {
    return (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 font-black text-emerald-800 text-xs tracking-widest">
            {text}
        </div>
    );
}

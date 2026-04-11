import React from 'react';
import Navbar from '../../components/Navbar';
import { CreditCard, ShieldCheck, Wallet, Receipt, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InstantPayments() {
    return (
        <div className="min-h-screen relative flex flex-col overflow-x-hidden water-bg">
            <Navbar />

            <section className="relative pt-32 pb-20 px-4">
                {/* Background Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#DBEAFE] via-[#BFDBFE] to-white z-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto">
                    <Link to="/" className="inline-flex items-center gap-2 text-blue-700 font-bold mb-8 hover:gap-3 transition-all">
                        <ArrowLeft size={20} />
                        Back to Home
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-600 font-bold text-xs uppercase tracking-widest mb-6">
                                <CreditCard size={16} />
                                Seamless Billing
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
                                Instant <br />
                                <span className="text-blue-600">Bill Payments</span>
                            </h1>
                            <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                                No more long queues or missed deadlines. Our secure payment gateway allows you to settle your water bills in seconds, right from your mobile device.
                            </p>

                            <div className="space-y-6">
                                <FeatureItem
                                    icon={<Wallet className="text-blue-500" />}
                                    title="Multiple Methods"
                                    description="Pay via GCash, Credit Cards, or Bank Transfer with a single click."
                                />
                                <FeatureItem
                                    icon={<ShieldCheck className="text-blue-500" />}
                                    title="Secured Transactions"
                                    description="Every payment is encrypted and verified to ensure your financial safety."
                                />
                                <FeatureItem
                                    icon={<Receipt className="text-blue-500" />}
                                    title="Digital Receipts"
                                    description="Instantly receive and download your official receipts for record-keeping."
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full"></div>
                            <div className="relative bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
                                <div className="aspect-square bg-gradient-to-br from-blue-400 to-indigo-600 rounded-3xl flex items-center justify-center p-12">
                                    <div className="relative w-full h-full">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white/20 border-2 border-white/40 rounded-2xl backdrop-blur-md rotate-12 flex items-center justify-center">
                                            <CreditCard size={48} className="text-white/80" />
                                        </div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 bg-white/10 border-2 border-white/20 rounded-2xl backdrop-blur-md -rotate-12"></div>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-white/80 rounded-2xl">
                                        <span className="font-bold text-slate-500">Processing Fee</span>
                                        <span className="font-black text-emerald-600">₱0.00</span>
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
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Built for Trust</h2>
                    <p className="text-lg text-slate-500 mb-12">
                        We partner with leading payment providers to ensure that your transactions are handled with the highest level of security and reliability.
                    </p>

                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 items-center opacity-80 hover:opacity-100 transition-opacity duration-500">
                        {/* GCash */}
                        <div className="flex flex-col items-center group cursor-default">
                            <div className="h-16 w-16 bg-[#007DFE] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                                <span className="text-white font-black text-2xl tracking-tighter">G</span>
                            </div>
                            <span className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#007DFE] transition-colors">GCash</span>
                        </div>

                        {/* Maya */}
                        <div className="flex flex-col items-center group cursor-default">
                            <div className="h-16 w-16 bg-[#17C171] rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform">
                                <span className="text-white font-black text-[10px] uppercase tracking-tighter">Maya</span>
                            </div>
                            <span className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#17C171] transition-colors">Maya</span>
                        </div>

                        {/* Visa */}
                        <div className="flex flex-col items-center group cursor-default">
                            <div className="h-16 w-16 bg-[#1A1F71] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 group-hover:scale-110 transition-transform">
                                <span className="text-[#F7B600] font-black italic text-sm tracking-tighter">VISA</span>
                            </div>
                            <span className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#1A1F71] transition-colors">Visa</span>
                        </div>

                        {/* Mastercard */}
                        <div className="flex flex-col items-center group cursor-default">
                            <div className="h-16 w-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform relative overflow-hidden">
                                <div className="w-8 h-8 bg-[#EB001B] rounded-full absolute -translate-x-3"></div>
                                <div className="w-8 h-8 bg-[#FF5F00] rounded-full absolute translate-x-3 opacity-80"></div>
                            </div>
                            <span className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#EB001B] transition-colors">Mastercard</span>
                        </div>

                        {/* PayPal */}
                        <div className="flex flex-col items-center group cursor-default">
                            <div className="h-16 w-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform">
                                <span className="text-[#003087] font-black italic text-xs">Pay</span>
                                <span className="text-[#009CDE] font-black italic text-xs">Pal</span>
                            </div>
                            <span className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-[#003087] transition-colors">PayPal</span>
                        </div>
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

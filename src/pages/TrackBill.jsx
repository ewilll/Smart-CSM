import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { Search, ArrowRight, FileText, Smartphone, CheckCircle, X, CreditCard, Lock, Loader2 } from 'lucide-react';

export default function TrackBill() {
    const [accountNumber, setAccountNumber] = useState('');
    const [billData, setBillData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentStep, setPaymentStep] = useState(1); // 1: Number, 2: OTP, 3: Success
    const [paying, setPaying] = useState(false);
    const [gcashNumber, setGcashNumber] = useState('');
    const [otp, setOtp] = useState('');

    const handleTrack = (e) => {
        e.preventDefault();
        setLoading(true);
        setBillData(null);

        // Simulate API Fetch
        setTimeout(() => {
            setLoading(false);
            // Mock Data Generation based on Account Number
            const isEven = accountNumber.length % 2 === 0;
            setBillData({
                accountName: "Juan Dela Cruz",
                period: "February 1 - February 28, 2026",
                consumption: "24 m³",
                amount: 1250.00,
                dueDate: "March 15, 2026",
                status: "Unpaid", // Default
                id: Math.random().toString(36).substr(2, 9).toUpperCase()
            });
        }, 1500);
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        setPaying(true);
        // Simulate OTP Request
        setTimeout(() => {
            setPaying(false);
            setPaymentStep(2);
        }, 1500);
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        setPaying(true);
        // Simulate Payment Processing
        setTimeout(() => {
            setPaying(false);
            setPaymentStep(3);
            // Update Bill Status
            setBillData(prev => ({ ...prev, status: 'Paid' }));
        }, 2000);
    };

    const resetModal = () => {
        setShowPaymentModal(false);
        setPaymentStep(1);
        setGcashNumber('');
        setOtp('');
    };

    return (
        <div className="min-h-screen relative flex flex-col overflow-x-hidden water-bg">
            <div className="absolute inset-0 bg-white z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white z-0 opacity-50"></div>
            <Navbar />

            <main className="flex-1 flex flex-col items-center p-4 relative z-10 pt-24 pb-12">

                {/* Search Section */}
                <div className="w-full max-w-lg mb-8">
                    <div className={`bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white transition-all duration-500 ${billData ? 'scale-95 opacity-80 hover:scale-100 hover:opacity-100' : ''}`}>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                                <FileText size={32} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 mb-2">Track Your Bill</h1>
                            <p className="text-slate-500 font-medium">Enter your 10-digit account number.</p>
                        </div>

                        <form onSubmit={handleTrack} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Account Number</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="e.g. 1234567890"
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-lg text-slate-800"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        maxLength={10}
                                        required
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <>Check Status <ArrowRight size={20} /></>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bill Result Section */}
                {billData && (
                    <div className="w-full max-w-lg animate-slide-up">
                        <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
                            {/* Status Banner */}
                            <div className={`absolute top-0 left-0 right-0 h-2 ${billData.status === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Statement of Account</p>
                                    <h2 className="text-2xl font-black text-slate-800">{billData.accountName}</h2>
                                    <p className="text-sm text-slate-500 font-medium">Acct No: {accountNumber}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${billData.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {billData.status}
                                </div>
                            </div>

                            <div className="space-y-6 mb-8">
                                <div className="flex justify-between items-center py-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Billing Period</span>
                                    <span className="text-slate-800 font-bold">{billData.period}</span>
                                </div>
                                <div className="flex justify-between items-center py-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Consumption</span>
                                    <span className="text-slate-800 font-bold">{billData.consumption}</span>
                                </div>
                                <div className="flex justify-between items-center py-4 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">Due Date</span>
                                    <span className="text-rose-500 font-bold">{billData.dueDate}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-slate-800 font-bold text-lg">Total Amount Due</span>
                                    <span className="text-3xl font-black text-blue-600">₱{billData.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            {billData.status === 'Unpaid' ? (
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="w-full py-4 bg-[#007DFE] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <Smartphone size={20} />
                                    Pay with GCash
                                </button>
                            ) : (
                                <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-3">
                                    <CheckCircle size={20} />
                                    Payment Verified
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* GCash Payment Modal */}
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up relative">
                            {/* Blue Header */}
                            <div className="bg-[#007DFE] p-6 text-white text-center relative">
                                <button onClick={resetModal} className="absolute top-6 left-6 hover:bg-white/20 p-2 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                                <h3 className="font-bold text-lg">GCash Payment</h3>
                                <p className="text-blue-100 text-sm">Merchant: PrimeWater Inc.</p>
                            </div>

                            <div className="p-8">
                                {paymentStep === 1 && (
                                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                        <div className="text-center mb-6">
                                            <p className="text-slate-500 text-sm font-medium">Please enter your mobile number to pay</p>
                                            <h2 className="text-3xl font-black text-slate-800 mt-2">₱ {billData.amount.toLocaleString()}</h2>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    placeholder="09XX XXX XXXX"
                                                    className="w-full h-14 pl-12 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#007DFE] outline-none font-bold text-lg text-slate-800"
                                                    value={gcashNumber}
                                                    onChange={(e) => setGcashNumber(e.target.value)}
                                                    required
                                                />
                                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={paying}
                                            className="w-full py-4 bg-[#007DFE] text-white rounded-xl font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center"
                                        >
                                            {paying ? <Loader2 className="animate-spin" /> : 'Next'}
                                        </button>
                                    </form>
                                )}

                                {paymentStep === 2 && (
                                    <form onSubmit={handleOtpSubmit} className="space-y-6">
                                        <div className="text-center mb-6">
                                            <Lock size={48} className="mx-auto text-[#007DFE] mb-4" />
                                            <h3 className="font-bold text-xl text-slate-800">Authentication</h3>
                                            <p className="text-slate-500 text-sm mt-2">We sent a 6-digit code to <span className="font-bold text-slate-800">{gcashNumber}</span></p>
                                        </div>

                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                placeholder="000000"
                                                className="w-full h-16 text-center text-3xl tracking-[0.5em] rounded-xl bg-slate-50 border border-slate-200 focus:border-[#007DFE] outline-none font-black text-slate-800"
                                                maxLength={6}
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={paying}
                                            className="w-full py-4 bg-[#007DFE] text-white rounded-xl font-bold uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center"
                                        >
                                            {paying ? <Loader2 className="animate-spin" /> : 'Pay Now'}
                                        </button>
                                    </form>
                                )}

                                {paymentStep === 3 && (
                                    <div className="text-center py-4">
                                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 animate-bounce">
                                            <CheckCircle size={48} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h3>
                                        <p className="text-slate-500 font-medium mb-8">Ref No. {Math.random().toString().substr(2, 10)}</p>
                                        <button
                                            onClick={resetModal}
                                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

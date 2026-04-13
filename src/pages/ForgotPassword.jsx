import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, Mail, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from '../utils/auth';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await sendPasswordResetEmail(email);
            if (!result.success) {
                setError(result.message || 'Could not send reset email.');
                return;
            }
            setSubmitted(true);
        } catch (err) {
            setError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col overflow-hidden water-bg">
            {/* Floating Bubbles */}
            <div className="bubble"></div>
            <div className="bubble"></div>
            <div className="bubble"></div>
            <div className="bubble"></div>
            <div className="bubble"></div>
            <div className="bubble"></div>

            {/* Water Ripples removed for cleaner UI */}

            {/* Wave Layers */}
            <div className="wave-layer-1"></div>
            <div className="wave-layer-2"></div>



            <div className="flex-1 flex flex-col items-center justify-start p-4 pt-32 pb-12 relative z-50 animate-slide-up">
                <div className="premium-login-card w-full">
                    <div className="text-center mb-3">
                        <div className="mx-auto h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-1">
                            <Droplets className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
                        <p className="mt-1 text-slate-500 text-xs font-medium">
                            {submitted
                                ? "Check your email for reset instructions"
                                : "Enter your email to receive a reset link"}
                        </p>
                    </div>

                    {!submitted ? (
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label className="block text-xs font-semibold text-slate-700 mb-1 ml-1">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        className="w-full"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <Mail className="input-icon h-5 w-5" />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending Link...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100 animate-slide-up">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Email Sent!</h3>
                            <p className="text-sm text-slate-600 mb-6">
                                We've sent a password reset link to <span className="font-bold text-slate-900">{email}</span>.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSubmitted(false);
                                    setError('');
                                }}
                                className="text-blue-600 font-bold hover:text-blue-500 transition-colors text-sm"
                            >
                                Didn't receive it? Try again
                            </button>
                        </div>
                    )}

                    <div className="mt-4 text-center pt-3 border-t border-slate-100">
                        <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500 transition-colors inline-flex items-center text-xs">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div >
    );
}

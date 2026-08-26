import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, Mail, Lock, ArrowRight, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

import AnimatedBackground from '../components/AnimatedBackground';
import { loginUser, signInWithGoogle, getCurrentUser } from '../utils/auth';
import ReCAPTCHA from "react-google-recaptcha";

export default function Login() {
    const [role, setRole] = useState('customer'); // Default to customer (User)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const navigate = useNavigate();

    // Prevent double login
    React.useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
        }
    }, [navigate]);

    // Development Bypass for local IP and Localtunnel testing
    const isLocalIP = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.loca.lt') ||
        /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);

    const onCaptchaChange = (token) => {
        setCaptchaToken(token);
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            // Store selected role for AuthHandler to pick up after redirect
            localStorage.setItem('smart_csm_pending_role', role);
            localStorage.setItem('smart_csm_auth_intent', 'login');

            const result = await signInWithGoogle();
            if (!result.success) {
                setError(result.message);
            }
        } catch (err) {
            setError('Google login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!captchaToken && !isLocalIP) {
            setError('Please verify you are not a robot.');
            setLoading(false);
            return;
        }

        try {
            // AuthHandler only navigates after SIGNED_IN when this flag is set (same as Google login).
            localStorage.setItem('smart_csm_auth_intent', 'login');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Login timed out. Please check your connection.')), 15000)
            );

            const loginPromise = loginUser(email, password);

            const result = await Promise.race([loginPromise, timeoutPromise]);

            if (result.success) {
                setSuccess(true);
                // Redirect will be handled by AuthHandler in App.jsx
            } else {
                localStorage.removeItem('smart_csm_auth_intent');
                setError(result.message);
                toast.error(result.message);
            }
        } catch (err) {
            console.error("Login Error:", err);
            localStorage.removeItem('smart_csm_auth_intent');
            setError(err.message || 'An unexpected error occurred. Please try again.');
            toast.error(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left branding panel */}
            <div className="hidden lg:flex flex-col justify-between bg-blue-600 text-white w-[420px] xl:w-[480px] p-10 flex-shrink-0">
                <div>
                    <Link to="/" className="inline-flex items-center gap-3 group mb-12">
                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <Droplets className="h-6 w-6 text-blue-600" strokeWidth={2.5} />
                        </div>
                        <span className="text-3xl font-black tracking-tight">
                            <span className="text-white">Prime</span>
                            <span className="text-blue-200">Water</span>
                        </span>
                    </Link>
                    
                    <h1 className="text-4xl font-bold leading-tight mb-6">
                        Centralized Water Incident Reporting & Response
                    </h1>
                    <p className="text-blue-100 text-lg leading-relaxed mb-8">
                        Secure access to your water consumption data, payment portals, and direct customer service channels.
                    </p>
                    
                    <ul className="space-y-4">
                        <li className="flex items-center gap-3 text-blue-100 font-medium">
                            <CheckCircle className="h-5 w-5 text-blue-300" /> Real-time water consumption tracking
                        </li>
                        <li className="flex items-center gap-3 text-blue-100 font-medium">
                            <CheckCircle className="h-5 w-5 text-blue-300" /> Secure online bill payments
                        </li>
                        <li className="flex items-center gap-3 text-blue-100 font-medium">
                            <CheckCircle className="h-5 w-5 text-blue-300" /> Instant incident reporting
                        </li>
                    </ul>
                </div>
                
                <div className="text-sm font-medium text-blue-300">
                    &copy; {new Date().getFullYear()} PrimeWater. All rights reserved.
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
                {/* Back Button for mobile */}
                <Link
                    to="/"
                    className="absolute top-6 left-6 lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </Link>

                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm w-full max-w-md">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-sm text-slate-500">Sign in to your account</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input
                                type="email"
                                required
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 px-4 pl-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-slate-700 bg-white"
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        </div>

                        <div className="input-group relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 px-4 pl-12 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-slate-700 bg-white"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between w-full text-sm text-slate-600 px-1">
                            <label className="flex items-center cursor-pointer hover:text-slate-900 transition-colors gap-2">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-0" />
                                <span>Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <p className="text-sm text-green-600 font-medium">Login successful! Redirecting...</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="btn-premium w-full h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing In...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    Welcome!
                                </>
                            ) : (
                                <>
                                    Sign In <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>

                        {!isLocalIP ? (
                            <div className="flex justify-center mt-4">
                                <ReCAPTCHA
                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                    onChange={onCaptchaChange}
                                    theme="light"
                                />
                            </div>
                        ) : (
                            <div className="text-center py-2 px-4 rounded-lg bg-blue-50 border border-blue-100 mt-4">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                    🛡️ Test Mode: reCAPTCHA Paused
                                </p>
                            </div>
                        )}
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm font-medium">
                            <span className="px-4 bg-white text-slate-400">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.83 2.07-1.79 2.71v2.25h2.91c1.7-1.56 2.68-3.86 2.68-6.59z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.81.54-1.85.87-3.05.87-2.34 0-4.33-1.58-5.04-3.7H.89v2.32C2.37 15.99 5.44 18 9 18z" fill="#34A853" />
                            <path d="M3.96 10.74c-.18-.54-.28-1.12-.28-1.74s.1-1.2.28-1.74V4.94H.89C.32 6.17 0 7.55 0 9s.32 2.83.89 4.06l3.07-2.32z" fill="#FBBC05" />
                            <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.44 0 2.37 2.01.89 4.94l3.07 2.32C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-slate-500 text-sm font-medium">
                            Don't have an account?{' '}
                            <Link
                                to="/signup"
                                className="text-blue-600 font-bold hover:text-blue-700 transition-colors"
                            >
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

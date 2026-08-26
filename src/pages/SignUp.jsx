import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Droplets, User, Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Eye, EyeOff, Phone, MapPin, ArrowLeft } from 'lucide-react';

import AnimatedBackground from '../components/AnimatedBackground';
import { registerUser, signInWithGoogle, loginUser } from '../utils/auth';
import ReCAPTCHA from "react-google-recaptcha";
import LocationPickerModal from '../components/LocationPickerModal';

export default function SignUp() {
    const [role, setRole] = useState('customer');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [barangay, setBarangay] = useState('');
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Check for "not registered" error from login redirect
    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('error') === 'not_registered') {
            setError('Account not found. Please create an account first to continue with Google.');
        }
    }, [location]);

    // Development Bypass for local IP and Localtunnel testing
    const isLocalIP = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.loca.lt') ||
        /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);

    const onCaptchaChange = (token) => {
        setCaptchaToken(token);
    };

    const handleGoogleSignUp = async () => {
        setError('');
        setLoading(true);
        try {
            // CRITICAL: Remember the role selection before redirecting to Google
            localStorage.setItem('smart_csm_pending_role', role);
            localStorage.setItem('smart_csm_auth_intent', 'signup');
            const result = await signInWithGoogle();
            if (!result.success) {
                setError(result.message);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Google sign up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const onCaptchaExpired = () => {
        setCaptchaToken(null);
        if (!isLocalIP) setError('Captcha expired. Please verify again.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!captchaToken && !isLocalIP) {
            setError('Please verify you are not a robot.');
            return;
        }

        setLoading(true);

        try {
            localStorage.setItem('smart_csm_auth_intent', 'signup');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 20000)
            );

            const registrationPromise = registerUser({ name, email, password, role, captchaToken, phone, barangay });

            const result = await Promise.race([registrationPromise, timeoutPromise]);

            if (result.success) {
                setSuccess(true);
            } else {
                if (result.message && (result.message.toLowerCase().includes('already registered') || result.message.includes('422'))) {
                    console.log("User exists, attempting auto-login...");
                    localStorage.setItem('smart_csm_auth_intent', 'login');
                    const loginResult = await loginUser(email, password);

                    if (loginResult.success) {
                        setSuccess(true);
                        return;
                    }
                }
                localStorage.removeItem('smart_csm_auth_intent');
                setError(result.message);
            }
        } catch (err) {
            localStorage.removeItem('smart_csm_auth_intent');
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex flex-col overflow-hidden">
            {/* Premium Animated Background Layer */}
            <AnimatedBackground />

            {/* Back Button */}
            <Link
                to="/"
                className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-white/40 rounded-full shadow-lg text-slate-700 font-bold text-sm hover:bg-white hover:scale-105 hover:text-blue-600 transition-all duration-300"
            >
                <ArrowLeft size={16} /> Back to Home
            </Link>

            {/* Content Container */}
            <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4 relative z-10">

                {/* Branding - Clean & Floating */}
                <div className="flex flex-col items-center justify-center mb-10 w-full text-center animate-slide-up">
                    <Link to="/" className="group flex flex-col items-center">
                        <div className="h-14 w-14 mb-4 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-xl shadow-blue-500/20 group-hover:rotate-6 transition-all">
                            <Droplets className="h-7 w-7 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="brand-title !text-4xl tracking-tighter">
                            <span className="text-slate-900">Prime</span>
                            <span className="text-blue-600">Water</span>
                        </span>
                    </Link>
                    <p className="mt-3 text-slate-500 text-xs font-black uppercase tracking-[0.3em]">Smart Infrastructure Hub</p>
                </div>

                {/* Glassmorphism Card */}
                <div className="glass-card p-10 relative overflow-hidden animate-slide-up delay-100" style={{ maxWidth: '440px', width: '100%' }}>
                    {/* Subtle Glow inside card */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>

                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight mb-1">Join PrimeWater</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Create your resident account</p>
                    </div>

                    <form className="space-y-3" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input
                                type="text"
                                required
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <User className="input-icon h-5 w-5" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="input-group">
                                <input
                                    type="text"
                                    required
                                    placeholder="Phone Number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pr-4 pl-[42px]"
                                />
                                <Phone className="input-icon h-5 w-5" />
                            </div>
                            <div className="input-group relative">
                                <MapPin className="input-icon h-5 w-5" />
                                <div className="absolute inset-y-0 right-2 flex items-center z-10">
                                    <button
                                        type="button"
                                        onClick={() => setIsMapOpen(true)}
                                        className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                        title="Pick from Map"
                                    >
                                        <MapPin className="h-4 w-4" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="Location (Type or Map)"
                                    value={barangay}
                                    onChange={(e) => setBarangay(e.target.value)}
                                    className="pl-[42px] pr-12 bg-white"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <input
                                type="email"
                                required
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Mail className="input-icon h-5 w-5" />
                        </div>

                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="Password (min 6 chars)"
                                className="pr-12"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="input-icon h-5 w-5" />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="input-group">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                placeholder="Confirm Password"
                                className="pr-12"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Lock className="input-icon h-5 w-5" />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-slide-up">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 animate-slide-up">
                                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                                <p className="text-sm text-green-400 font-medium">Account created! Redirecting...</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="btn-primary mt-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    Account Created!
                                </>
                            ) : (
                                <>
                                    Create Account <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>

                        {!isLocalIP ? (
                            <div className="flex justify-center mt-2 scale-[0.85] origin-center opacity-90 hover:opacity-100 transition-opacity">
                                <ReCAPTCHA
                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                    onChange={onCaptchaChange}
                                    onExpired={onCaptchaExpired}
                                    theme="light"
                                />
                            </div>
                        ) : (
                            <div className="text-center py-2 px-4 rounded-lg bg-blue-50 border border-blue-100 mt-2">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                    🛡️ Test Mode: reCAPTCHA Paused
                                </p>
                            </div>
                        )}
                    </form>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            <span className="px-2 bg-white">Or sign up with</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={handleGoogleSignUp}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.83 2.07-1.79 2.71v2.25h2.91c1.7-1.56 2.68-3.86 2.68-6.59z" fill="#4285F4" />
                                <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.81.54-1.85.87-3.05.87-2.34 0-4.33-1.58-5.04-3.7H.89v2.32C2.37 15.99 5.44 18 9 18z" fill="#34A853" />
                                <path d="M3.96 10.74c-.18-.54-.28-1.12-.28-1.74s.1-1.2.28-1.74V4.94H.89C.32 6.17 0 7.55 0 9s.32 2.83.89 4.06l3.07-2.32z" fill="#FBBC05" />
                                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.44 0 2.37 2.01.89 4.94l3.07 2.32C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div className="text-center mt-6">
                        <p className="text-slate-500 text-sm font-medium">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-blue-600 font-bold hover:underline transition-all"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Map Picker Modal */}
            <LocationPickerModal
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onSelectLocation={(locationName) => {
                    setBarangay(locationName);
                }}
            />
        </div>
    );
}

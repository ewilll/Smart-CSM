import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Droplets, User, Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Eye, EyeOff, Phone, MapPin, ArrowLeft } from 'lucide-react';

import AnimatedBackground from '../components/AnimatedBackground';
import { registerUser, signInWithGoogle, loginUser, resendSignupConfirmationEmail } from '../utils/auth';
import ReCAPTCHA from "react-google-recaptcha";
import LocationPickerModal from '../components/LocationPickerModal';

export default function SignUp() {
    const [role, setRole] = useState('customer');
    const [firstName, setFirstName] = useState('');
    const [middleInitial, setMiddleInitial] = useState('');
    const [lastName, setLastName] = useState('');
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
    /** When Supabase requires email confirmation before a session exists */
    const [pendingEmailNotice, setPendingEmailNotice] = useState('');
    const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendInfo, setResendInfo] = useState('');
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
    /** LAN / vite --host: still dev, but hostname is not "localhost" — skip captcha in dev only */
    const bypassCaptcha = isLocalIP || import.meta.env.DEV;

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
            }
            // OAuth continues in the same tab via result.url (see auth.js)
        } catch (err) {
            setError('Google sign up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const onCaptchaExpired = () => {
        setCaptchaToken(null);
        if (!bypassCaptcha) setError('Captcha expired. Please verify again.');
    };

    const handleResendConfirmation = async () => {
        setError('');
        setResendInfo('');
        const trimmed = email.trim();
        if (!trimmed) {
            setError('Enter the same email you used above, then tap Resend.');
            return;
        }
        setResendLoading(true);
        try {
            const result = await resendSignupConfirmationEmail(trimmed);
            if (!result.success) {
                setError(result.message);
                return;
            }
            setResendInfo('Another confirmation message was requested. Check your inbox and spam folder.');
        } catch (err) {
            setError(err?.message || 'Could not resend. Try again in a minute.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setPendingEmailNotice('');
        setAwaitingEmailConfirmation(false);
        setResendInfo('');

        // Validation
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required.');
            return;
        }

        if (!captchaToken && !bypassCaptcha) {
            setError('Please verify you are not a robot.');
            return;
        }

        setLoading(true);

        try {
            localStorage.setItem('smart_csm_auth_intent', 'signup');

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), 20000)
            );

            const registrationPromise = registerUser({
                firstName,
                middleInitial,
                lastName,
                email,
                password,
                role,
                captchaToken,
                phone,
                barangay,
            });

            const result = await Promise.race([registrationPromise, timeoutPromise]);

            if (result.success) {
                if (result.needsEmailConfirmation) {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    setAwaitingEmailConfirmation(true);
                    setPendingEmailNotice(
                        'Account created. You should get a “Confirm your signup” message from the sign-in provider (sender is often noreply@mail.app.supabase.io unless you use custom SMTP). If the server is configured for outbound mail, you may also receive a short message from PrimeWater with the same tips below.\n\n' +
                        'If nothing arrives:\n' +
                        '• Check Spam / Promotions.\n' +
                        `• Authentication → URL configuration: add ${origin} and ${origin}/login to Redirect URLs. Site URL should be ${origin} (or your production URL).\n` +
                        '• Project Settings → Auth → SMTP: configure custom mail if the default is blocked by your provider.\n' +
                        '• Logs → Auth: look for send errors after each sign-up.\n' +
                        '• Dev only: Authentication → Providers → Email → disable “Confirm email” to skip mail and sign in immediately.\n\n' +
                        'Use “Resend confirmation email” below if you need another copy. Then sign in on the Login page.'
                    );
                } else {
                    setSuccess(true);
                    setTimeout(() => navigate('/dashboard'), 1200);
                }
            } else {
                if (result.message && (result.message.toLowerCase().includes('already registered') || result.message.includes('422'))) {
                    console.log("User exists, attempting auto-login...");
                    localStorage.setItem('smart_csm_auth_intent', 'login');
                    const loginResult = await loginUser(email, password);

                    if (loginResult.success) {
                        setSuccess(true);
                        setTimeout(() => navigate('/dashboard'), 1200);
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
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" aria-hidden />

                    <div className="relative z-10 mb-6 text-center">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight mb-1">Join PrimeWater</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Create your resident account</p>
                    </div>

                    <form className="relative z-10 space-y-3" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="input-group sm:col-span-5">
                                <input
                                    type="text"
                                    name="firstName"
                                    required
                                    placeholder="First name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    autoComplete="given-name"
                                    spellCheck={false}
                                />
                                <User className="input-icon h-5 w-5" />
                            </div>
                            <div className="input-group sm:col-span-2">
                                <input
                                    type="text"
                                    name="middleInitial"
                                    placeholder="M.I. (opt.)"
                                    title="Middle initial (optional)"
                                    value={middleInitial}
                                    onChange={(e) => setMiddleInitial(e.target.value.replace(/\s/g, '').slice(0, 4))}
                                    autoComplete="additional-name"
                                    spellCheck={false}
                                    className="!pl-4 text-center sm:text-left"
                                />
                            </div>
                            <div className="input-group sm:col-span-5">
                                <input
                                    type="text"
                                    name="lastName"
                                    required
                                    placeholder="Last name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    autoComplete="family-name"
                                    spellCheck={false}
                                />
                                <User className="input-icon h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 -mt-1 mb-1 px-1">Middle initial is optional. One letter is shown as “X.” in your full name.</p>

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
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-slide-up">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-sm text-red-400 font-medium">{error}</p>
                                    {/already registered|signing in instead/i.test(error) && (
                                        <p className="mt-2 text-xs font-bold text-red-700/90">
                                            <Link to="/login" className="underline hover:text-red-900">Sign in</Link>
                                            <span className="mx-1.5 text-red-400/80" aria-hidden>·</span>
                                            <Link to="/forgot-password" className="underline hover:text-red-900">Forgot password</Link>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {pendingEmailNotice && (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 animate-slide-up">
                                    <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-800 font-medium whitespace-pre-line leading-relaxed">{pendingEmailNotice}</p>
                                </div>
                                {awaitingEmailConfirmation && (
                                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                        <button
                                            type="button"
                                            onClick={handleResendConfirmation}
                                            disabled={resendLoading}
                                            className="px-4 py-2.5 rounded-xl bg-white border-2 border-blue-200 text-blue-700 text-xs font-black uppercase tracking-widest hover:bg-blue-50 disabled:opacity-50 transition-all"
                                        >
                                            {resendLoading ? 'Sending…' : 'Resend confirmation email'}
                                        </button>
                                        {resendInfo && (
                                            <p className="text-xs font-bold text-emerald-700">{resendInfo}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 animate-slide-up">
                                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                                <p className="text-sm text-green-400 font-medium">Account ready! Redirecting...</p>
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

                        {!bypassCaptcha ? (
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

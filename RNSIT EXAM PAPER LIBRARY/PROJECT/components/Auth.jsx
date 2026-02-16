import React, { useState } from 'react';
import { RNSIT_EMAIL_REGEX } from '@app/constants';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, GraduationCap, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { authService } from '@app/services/authService';

export const Auth = ({ onLogin }) => {
    const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER, FORGOT_PASSWORD, RESET_PASSWORD
    const [isAdmin, setIsAdmin] = useState(false);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // OTP Reset Fields
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP + New Password
    const [signupStep, setSignupStep] = useState(1); // 1: Details, 2: OTP

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => {
        setError('');
        setSuccessMsg('');
        setEmail('');
        setPassword('');
        setName('');
        setOtp('');
        setNewPassword('');
        setResetStep(1);
        setSignupStep(1);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        resetForm();
    };

    const toggleAdmin = () => {
        setIsAdmin(!isAdmin);
        setMode('LOGIN'); // Always reset to login when switching roles
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setSubmitting(true);

        try {
            // --- ADMIN LOGIN ---
            if (isAdmin) {
                const admin = await authService.login({ email, password, isAdmin: true });
                onLogin(admin);
                return;
            }

            // --- STUDENT FLOWS ---
            if (!email) {
                setError('Please enter your email.');
                setSubmitting(false);
                return;
            }

            if (!RNSIT_EMAIL_REGEX.test(email)) {
                setError('Please use a valid @rnsit.ac.in email address.');
                setSubmitting(false);
                return;
            }

            // --- FOGOT PASSWORD (Step 1: Request Link) ---
            if (mode === 'FORGOT_PASSWORD') {
                await authService.requestReset(email);
                setSuccessMsg('Reset link sent to your email.');
                setSubmitting(false);
                return;
            }

            // --- RESET PASSWORD (Step 2: Use Token) ---
            if (mode === 'RESET_PASSWORD') {
                if (!newPassword) {
                    setError('Please enter your new password.');
                    setSubmitting(false);
                    return;
                }
                // Use confirmReset but pass token as the 'otp' argument
                await authService.confirmReset(email, otp, newPassword);
                setSuccessMsg('Password reset successfully! Please login.');
                setTimeout(() => switchMode('LOGIN'), 2000);
                setSubmitting(false);
                return;
            }

            // --- LOGIN ---
            if (mode === 'LOGIN') {
                if (!password) {
                    setError('Password is required.');
                    setSubmitting(false);
                    return;
                }
                const loggedUser = await authService.login({ email, password });
                onLogin(loggedUser);
                return;
            }

            // --- REGISTER (Step 1: Init) ---
            if (mode === 'REGISTER' && signupStep === 1) {
                if (!password) {
                    setError('Password is required.');
                    setSubmitting(false);
                    return;
                }
                if (!name) {
                    setError('Full name is required.');
                    setSubmitting(false);
                    return;
                }

                await authService.initSignup({ name, email, password });
                setSignupStep(2);
                setSuccessMsg(`Verification code sent to ${email}`);
                setSubmitting(false);
                return;
            }

            // --- REGISTER (Step 2: Verify OTP) ---
            if (mode === 'REGISTER' && signupStep === 2) {
                if (!otp) {
                    setError('Please enter the verification code.');
                    setSubmitting(false);
                    return;
                }
                const registered = await authService.completeSignup({ email, otp });
                onLogin(registered);
                return;
            }

        } catch (err) {
            setError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Google Sign-In Handler
    const handleGoogleLogin = async (response) => {
        try {
            setSubmitting(true);
            const user = await authService.googleLogin(response.credential);
            onLogin(user);
        } catch (err) {
            setError(err?.message || 'Google sign-in failed.');
            setSubmitting(false);
        }
    };

    // Check for Magic Link Token
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const emailParam = params.get('email');

        if (token && emailParam) {
            setOtp(token); // Reuse OTP state for token
            setEmail(emailParam);
            setMode('RESET_PASSWORD');
            // Clean URL
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    React.useEffect(() => {
        /* global google */
        if (window.google && !isAdmin && mode === 'LOGIN') {
            try {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                    callback: handleGoogleLogin,
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('google-btn'),
                    { theme: 'outline', size: 'large', width: '100%' }
                );
            } catch (e) {
                console.error("Google Auth Error:", e);
            }
        }
    }, [isAdmin, mode]);

    return (
        <div className="min-h-screen flex bg-white dark:bg-slate-900 transition-colors duration-300">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-rnsit-900 overflow-hidden items-center justify-center">
                {/* Dynamic Gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-rnsit-800 via-rnsit-900 to-slate-900 opacity-95 z-10" />
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[500px] h-[500px] bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse z-0"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] bg-rnsit-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse z-0"></div>

                {/* Content */}
                <div className="relative z-20 text-white p-12 text-center max-w-lg">
                    <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-rnsit-100">
                        RNSIT Library
                    </h1>
                    <p className="text-rnsit-100 text-lg leading-relaxed font-light mb-8">
                        Your centralized academic resource hub. Access <span className="text-accent-300 font-semibold">previous papers</span>, <span className="text-accent-300 font-semibold">notes</span>, and generate <span className="text-accent-300 font-semibold">AI solutions</span> instantly.
                    </p>
                    <div className="flex justify-center gap-4 text-sm text-rnsit-200 font-medium">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rnsit-800/50 border border-rnsit-700">
                            <GraduationCap size={16} className="text-accent-400" /> Students
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rnsit-800/50 border border-rnsit-700">
                            <ShieldCheck size={16} className="text-accent-400" /> Faculty
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 animate-fade-in bg-slate-50 lg:bg-white dark:bg-slate-950 dark:lg:bg-slate-900 transition-colors duration-300">
                <div className="w-full max-w-md space-y-8 bg-white lg:bg-transparent dark:bg-slate-900 p-8 lg:p-0 rounded-2xl shadow-xl lg:shadow-none border lg:border-none border-gray-100 dark:border-slate-800">

                    {/* Header Section */}
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden flex justify-center mb-6">
                            <img src="/rnsit-logo.jpg" alt="RNSIT Logo" className="h-20 w-auto" />
                        </div>

                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isAdmin ? 'Admin Portal' :
                                mode === 'FORGOT_PASSWORD' ? (resetStep === 1 ? 'Reset Password' : 'Enter OTP') :
                                    mode === 'REGISTER' ? (signupStep === 1 ? 'Create Account' : 'Verify Email') :
                                        mode === 'RESET_PASSWORD' ? 'Set New Password' : 'Welcome Back'}
                        </h2>
                        <p className="mt-3 text-slate-500 dark:text-slate-400 text-base">
                            {isAdmin ? 'Authorized personnel only.' :
                                mode === 'FORGOT_PASSWORD' ? (resetStep === 1 ? 'Enter your email to receive a code.' : 'Check your email for the code.') :
                                    mode === 'REGISTER' ? (signupStep === 1 ? 'Join the digital library today.' : `Enter the code sent to ${email}`) :
                                        mode === 'RESET_PASSWORD' ? 'Enter your new password below.' : 'Enter your credentials to access the library.'}
                        </p>
                    </div>

                    {/* Feedback Messages */}
                    {(error || successMsg) && (
                        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm ${error ? 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/50' : 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/50'}`}>
                            {error ? <div className="w-2 h-2 rounded-full bg-red-500"></div> : <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                            {error || successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6 mt-8">
                        {/* REGISTER: Name Field (Step 1) */}
                        {!isAdmin && mode === 'REGISTER' && signupStep === 1 && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <UserIcon size={18} className="text-slate-400 group-focus-within:text-rnsit-600 dark:group-focus-within:text-rnsit-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full pl-10 pr-3 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-all outline-none"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* EMAIL Field (Login, Register Step 1, Forgot Password Step 1) */}
                        {((mode === 'LOGIN') || (mode === 'REGISTER' && signupStep === 1) || (mode === 'FORGOT_PASSWORD' && resetStep === 1)) && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-slate-400 group-focus-within:text-rnsit-600 dark:group-focus-within:text-rnsit-400 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-all outline-none"
                                        placeholder={isAdmin ? "admin@rnsit.ac.in" : "example@rnsit.ac.in"}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* PASSWORD Field (Login, Register Step 1) */}
                        {(mode === 'LOGIN' || (mode === 'REGISTER' && signupStep === 1)) && (
                            <div className="animate-fade-in">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                                    {!isAdmin && mode === 'LOGIN' && (
                                        <button
                                            type="button"
                                            onClick={() => switchMode('FORGOT_PASSWORD')}
                                            className="text-xs text-rnsit-600 dark:text-rnsit-400 hover:text-rnsit-800 dark:hover:text-rnsit-300 font-medium transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-slate-400 group-focus-within:text-rnsit-600 dark:group-focus-within:text-rnsit-400 transition-colors" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="block w-full pl-10 pr-10 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-all outline-none"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* OTP Field (Register Step 2 OR Reset Password Step 2) */}
                        {((mode === 'REGISTER' && signupStep === 2) || mode === 'RESET_PASSWORD') && (
                            <div className="animate-fade-in">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Verification Code</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <KeyRound size={18} className="text-slate-400 group-focus-within:text-rnsit-600 dark:group-focus-within:text-rnsit-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full pl-10 pr-3 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-all outline-none tracking-widest font-mono text-center text-lg"
                                        placeholder="------"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>
                                {mode === 'REGISTER' && (
                                    <p className="text-xs text-center mt-2 text-slate-500">
                                        Didn't receive code? <button type="button" onClick={() => handleSubmit({ preventDefault: () => { } })} className="text-rnsit-600 font-bold hover:underline">Resend</button>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* NEW PASSWORD Field (Reset Password Step 2) */}
                        {mode === 'RESET_PASSWORD' && (
                            <div className="animate-fade-in relative group">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                                <div className="absolute inset-y-0 left-0 pl-3.5 top-8 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-slate-400 group-focus-within:text-rnsit-600 dark:group-focus-within:text-rnsit-400 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="block w-full pl-10 pr-10 py-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-all outline-none"
                                    placeholder="Min 6 chars"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        )}

                        {/* Google Sign In Button - Students Only, Login Only */}
                        {!isAdmin && mode === 'LOGIN' && (
                            <div className="pt-2">
                                <div id="google-btn" className="w-full flex justify-center"></div>
                                <div className="relative mt-4 mb-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="px-2 bg-slate-50 dark:bg-slate-900 text-slate-400 font-medium">Or continue with email</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-rnsit-500/30 text-sm font-bold text-white bg-gradient-to-r from-rnsit-600 to-rnsit-700 hover:from-rnsit-700 hover:to-rnsit-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rnsit-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                            {isAdmin ? 'Access Dashboard' :
                                mode === 'FORGOT_PASSWORD' ? 'Send Reset Link' :
                                    mode === 'RESET_PASSWORD' ? 'Set New Password' :
                                        mode === 'LOGIN' ? 'Sign In' :
                                            mode === 'REGISTER' && signupStep === 1 ? 'Next: Verify Email' : 'Create Account'}
                            {!submitting && <ArrowRight size={18} />}
                        </button>

                        {/* Back Button for Forgot Password & Register */}
                        {(mode === 'FORGOT_PASSWORD' || mode === 'REGISTER') && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (mode === 'REGISTER' && signupStep === 2) {
                                        setSignupStep(1);
                                    } else {
                                        switchMode('LOGIN');
                                    }
                                }}
                                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft size={18} /> {mode === 'REGISTER' && signupStep === 2 ? 'Back to Details' : 'Back to Login'}
                            </button>
                        )}
                    </form>

                    {/* Footer / Switching Modes */}
                    <div className="space-y-6 pt-2">
                        {!isAdmin && mode !== 'FORGOT_PASSWORD' && (
                            <div className="text-center">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {mode === 'LOGIN' ? "New to the library? " : "Already have an account? "}
                                </span>
                                <button
                                    onClick={() => switchMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                                    className="text-sm font-bold text-rnsit-600 dark:text-rnsit-400 hover:text-rnsit-800 dark:hover:text-rnsit-300 hover:underline transition-all"
                                >
                                    {mode === 'LOGIN' ? "Register now" : "Log in"}
                                </button>
                            </div>
                        )}

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-medium">Or</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleAdmin}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 border rounded-xl shadow-sm text-sm font-semibold transition-all
                  ${isAdmin
                                    ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-rnsit-200 dark:hover:border-rnsit-700 hover:text-rnsit-700 dark:hover:text-rnsit-400'
                                }
               `}
                        >
                            <ShieldCheck size={18} className={isAdmin ? "text-slate-500 dark:text-slate-400" : "text-rnsit-600 dark:text-rnsit-400"} />
                            {isAdmin ? 'Switch to Student Login' : 'Admin Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

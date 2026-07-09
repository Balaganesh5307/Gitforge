import React, { useState } from 'react';
import { Bot, Mail, Lock, User as UserIcon, ShieldCheck, Key, ArrowLeft, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: any) => void;
  initialView?: 'login' | 'signup';
}

type AuthView = 'login' | 'signup' | 'forgot' | 'reset' | 'verify';

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, initialView = 'login' }) => {
  const [view, setView] = useState<AuthView>(initialView);
  
  // Input fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Verification code inputs (6 separate digits)
  const [verificationDigits, setVerificationDigits] = useState<string[]>(Array(6).fill(''));

  // Notification overlays
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock email simulators
  const [simulatedEmail, setSimulatedEmail] = useState<{
    subject: string;
    body: string;
    code: string;
  } | null>(null);

  const triggerError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
    triggerSuccess('Demo credentials auto-filled. Click Sign In!');
  };

  // Submit Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return triggerError('Please fill in all fields');
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (response.ok) {
        if (!data.user.isVerified) {
          triggerSuccess('Please verify your email to complete registration.');
          // Pre-populate verification email simulated popup
          setSimulatedEmail({
            subject: 'Verify your GitForge Account',
            body: `Thank you for signing up. Please enter the verification code to activate your simulated collaborator account.`,
            code: '123456' // fallback
          });
          setView('verify');
        } else {
          onAuthSuccess(data.token, data.user);
        }
      } else {
        triggerError(data.error || 'Login failed');
      }
    } catch (err) {
      triggerError('Backend server connection failed. Please ensure the server is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Sign Up
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return triggerError('Please fill in all fields');
    if (password !== confirmPassword) return triggerError('Passwords do not match');

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await response.json();

      if (response.ok) {
        triggerSuccess('Registration successful! Please verify your email.');
        if (data.verificationCode) {
          setSimulatedEmail({
            subject: 'GitForge Verification Code',
            body: `Hello ${username},\n\nYour simulated verification code is provided below to test the full-stack sign-up logic.`,
            code: data.verificationCode
          });
        }
        setView('verify');
      } else {
        triggerError(data.error || 'Signup failed');
      }
    } catch (err) {
      triggerError('Backend server connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Email Verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationDigits.join('');
    if (code.length < 6) return triggerError('Please enter the complete 6-digit code');

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();

      if (response.ok) {
        triggerSuccess('Email verified successfully! Session established.');
        setSimulatedEmail(null);
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 1000);
      } else {
        triggerError(data.error || 'Verification failed');
      }
    } catch (err) {
      triggerError('Backend connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return triggerError('Please enter your email address');

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (response.ok) {
        triggerSuccess('Password reset token generated.');
        if (data.resetToken) {
          setSimulatedEmail({
            subject: 'Reset Password Code',
            body: `We received a password reset request. Use the temporary authorization code to complete your reset.`,
            code: data.resetToken
          });
        }
        setView('reset');
      } else {
        triggerError(data.error || 'Request failed');
      }
    } catch (err) {
      triggerError('Backend connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return triggerError('Please fill in all fields');

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: resetToken, newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        triggerSuccess('Password reset successful. You can log in now.');
        setSimulatedEmail(null);
        setView('login');
      } else {
        triggerError(data.error || 'Password reset failed');
      }
    } catch (err) {
      triggerError('Backend connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Social Login Mock Click handler
  const handleSocialLogin = (provider: 'Google' | 'GitHub') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Simulate success callback
      const mockUser = {
        id: 'usr-social',
        username: `Social_${provider}_Developer`,
        email: `developer@${provider.toLowerCase()}.com`,
        isVerified: true
      };
      const mockToken = 'mock-jwt-token-social-login-' + Math.random().toString(36).substring(7);
      triggerSuccess(`Mock social login through ${provider} successful!`);
      onAuthSuccess(mockToken, mockUser);
    }, 1200);
  };

  // Handle verification digit input focus advancement
  const handleDigitChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const nextDigits = [...verificationDigits];
    nextDigits[index] = val.substring(val.length - 1);
    setVerificationDigits(nextDigits);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] grid-bg flex items-center justify-center p-6 relative overflow-hidden text-gray-200">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Main glass card container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-glow">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight leading-none">GitForge</h1>
            <span className="text-[10px] text-purple-400 font-mono tracking-widest uppercase mt-0.5 block">Security Hub</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full glass-panel premium-navbar rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden bg-[#090d16]/90">
          
          {/* Form Content Wrapper */}
          <AnimatePresence mode="wait">
            
            {/* LOGIN FORM */}
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome Back</h2>
                <p className="text-xs text-dark-muted mt-1.5">Sign in to sync your collaborative sandbox.</p>

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  
                  <div className="text-right">
                    <span
                      onClick={() => setView('forgot')}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 cursor-pointer transition-colors"
                    >
                      Forgot password?
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? 'Connecting...' : 'Sign In'}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                  <span className="relative z-10 px-3 bg-[#090d16] text-[9px] font-bold text-dark-muted uppercase font-mono tracking-widest">or login with</span>
                </div>

                {/* Social Login Grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleSocialLogin('GitHub')}
                    className="py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </button>
                  <button
                    onClick={() => handleSocialLogin('Google')}
                    className="py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.486 0-6.313-2.827-6.313-6.313s2.827-6.313 6.313-6.313c1.521 0 2.905.546 3.987 1.455l3.22-3.22C19.2 2.239 15.937 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.897 0 10.87-4.22 10.87-11.24 0-.668-.063-1.314-.177-1.955H12.24z"/>
                    </svg>
                    Google
                  </button>
                </div>

                <div className="mt-8 text-center text-xs text-dark-muted">
                  Don't have an account?{' '}
                  <span
                    onClick={() => setView('signup')}
                    className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer transition-colors"
                  >
                    Create Account
                  </span>
                </div>

                {/* Demo Credentials Quick-Select */}
                <div className="mt-6 pt-5 border-t border-white/5 text-center">
                  <span className="text-[9px] font-bold text-dark-muted uppercase font-mono tracking-widest block mb-2.5">
                    Demo Credentials (Click to Autofill)
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('user@gitforge.com', 'password123')}
                      className="w-full py-2 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 rounded-xl text-[10px] font-mono font-semibold flex items-center justify-between px-3.5 transition-all hover:scale-[1.01]"
                    >
                      <span className="text-purple-300">user@gitforge.com</span>
                      <span className="text-gray-500">password123</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('admin@gitforge.com', 'admin123')}
                      className="w-full py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded-xl text-[10px] font-mono font-semibold flex items-center justify-between px-3.5 transition-all hover:scale-[1.01]"
                    >
                      <span className="text-indigo-300">admin@gitforge.com</span>
                      <span className="text-gray-500">admin123</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SIGNUP FORM */}
            {view === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-extrabold text-white tracking-tight">Create Account</h2>
                <p className="text-xs text-dark-muted mt-1.5">Sign up to access visual sandbox collaborator modules.</p>

                <form onSubmit={handleSignup} className="mt-6 space-y-4">
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? 'Registering...' : 'Register'}
                  </button>
                </form>

                <div className="mt-8 text-center text-xs text-dark-muted">
                  Already have an account?{' '}
                  <span
                    onClick={() => setView('login')}
                    className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer transition-colors"
                  >
                    Sign In
                  </span>
                </div>
              </motion.div>
            )}

            {/* EMAIL VERIFICATION SCREEN */}
            {view === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                </div>
                
                <h2 className="text-xl font-extrabold text-white tracking-tight">Verify Your Email</h2>
                <p className="text-xs text-dark-muted mt-2 px-4">
                  We have sent a simulated verification code to your email account <span className="text-gray-300 font-semibold">{email}</span>.
                </p>

                <form onSubmit={handleVerify} className="mt-8 space-y-6">
                  {/* Spaced 6 code digits */}
                  <div className="flex justify-center gap-2">
                    {verificationDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`digit-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        className="w-10 h-12 bg-[#05080f] border border-white/10 rounded-lg text-center text-lg font-bold text-white focus:outline-none focus:border-purple-500 focus:shadow-glow transition-all"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </form>

                <div className="mt-8 text-xs text-dark-muted flex justify-between items-center px-2">
                  <span
                    onClick={() => setView('login')}
                    className="text-gray-400 hover:text-white cursor-pointer transition-colors flex items-center gap-1 font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </span>
                  
                  <span
                    onClick={() => {
                      triggerSuccess('Verification code resent.');
                    }}
                    className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer transition-colors"
                  >
                    Resend Code
                  </span>
                </div>
              </motion.div>
            )}

            {/* FORGOT PASSWORD FORM */}
            {view === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-extrabold text-white tracking-tight">Reset Password</h2>
                <p className="text-xs text-dark-muted mt-1.5">Enter your email to receive a password reset validation code.</p>

                <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    {isLoading ? 'Requesting...' : 'Request Reset Code'}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <span
                    onClick={() => setView('login')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold cursor-pointer transition-colors flex items-center gap-1 justify-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </span>
                </div>
              </motion.div>
            )}

            {/* RESET PASSWORD CONFIRM FORM */}
            {view === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-extrabold text-white tracking-tight">Choose New Password</h2>
                <p className="text-xs text-dark-muted mt-1.5">Enter the reset code sent to your email and select your new password.</p>

                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Reset Code (6 Digits)"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <span
                    onClick={() => setView('login')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold cursor-pointer transition-colors flex items-center gap-1 justify-center"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </span>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Form Message Overlays */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[11px] font-semibold text-center z-20"
              >
                {error}
              </motion.div>
            )}
            
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-4 left-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-[11px] font-semibold text-center z-20"
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* MOCK EMAIL SIMULATOR POPUP WINDOW */}
        <AnimatePresence>
          {simulatedEmail && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="mt-6 w-full glass-panel border border-amber-500/20 rounded-2xl p-4 shadow-2xl bg-amber-500/5 text-left font-mono relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/30" />
              
              <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold border-b border-white/5 pb-2 mb-2 uppercase tracking-wide">
                <span>✉️ Mock Mail Server Output</span>
                <span className="bg-amber-400/15 border border-amber-400/20 px-1.5 py-0.5 rounded text-[8px]">deliver:instant</span>
              </div>
              
              <div className="text-[10px] text-gray-300 space-y-1">
                <div><strong>Subject:</strong> {simulatedEmail.subject}</div>
                <div><strong>To:</strong> {email || 'you'}</div>
                <div className="pt-2 text-dark-muted whitespace-pre-line leading-relaxed">{simulatedEmail.body}</div>
                
                <div className="mt-4 p-2 bg-[#05080f] rounded-lg border border-amber-500/10 flex items-center justify-between">
                  <span className="text-[10px] text-amber-200">Authorization Code:</span>
                  <span className="text-sm font-black text-amber-400 tracking-widest">{simulatedEmail.code}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

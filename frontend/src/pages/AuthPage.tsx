import React, { useState } from 'react';
import { Bot, Mail, Lock, User as UserIcon, ShieldCheck, Key, ArrowLeft, Github, CheckCircle, GitBranch, GitCommit, GitPullRequest } from 'lucide-react';
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

  // Notification states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  
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
          setSimulatedEmail({
            subject: 'Verify your GitForge Account',
            body: `Thank you for signing up. Please enter the verification code to activate your simulated collaborator account.`,
            code: '123456'
          });
          setView('verify');
        } else {
          onAuthSuccess(data.token, data.user);
        }
      } else {
        triggerError(data.error || 'Login failed');
      }
    } catch (err) {
      triggerError('Backend server connection failed. Make sure port 5000 is open.');
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
        setVerifySuccess(true);
        triggerSuccess('Email verified successfully!');
        setSimulatedEmail(null);
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 1500);
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

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setEmail(emailVal);
    setPassword(passVal);
    triggerSuccess('Demo credentials filled. Press Sign In!');
  };

  const handleSocialLogin = (provider: 'Google' | 'GitHub') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const mockUser = {
        id: 'usr-social',
        username: `Social_${provider}_Dev`,
        email: `dev@${provider.toLowerCase()}.com`,
        isVerified: true
      };
      const mockToken = 'mock-jwt-token-social-login-' + Math.random().toString(36).substring(7);
      triggerSuccess(`Mock ${provider} login succeeded!`);
      onAuthSuccess(mockToken, mockUser);
    }, 1000);
  };

  const handleDigitChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const nextDigits = [...verificationDigits];
    nextDigits[index] = val.substring(val.length - 1);
    setVerificationDigits(nextDigits);

    if (val && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#060a12] grid-bg flex relative overflow-hidden text-gray-200">
      
      {/* Animated Ambient Light Orbs */}
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -50, 40, 0],
          scale: [1, 1.15, 0.9, 1]
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 60, -40, 0],
          scale: [1, 0.85, 1.15, 1]
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none"
      />

      <div className="flex-grow flex flex-col md:flex-row max-w-6xl mx-auto w-full z-10 p-6 md:p-12 items-center justify-center gap-12">
        
        {/* LEFT COLUMN: Visual Showcase Presentation (Visible on Desktop) */}
        <div className="hidden md:flex flex-1 flex-col text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono select-none w-max">
            <Bot className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive Git Engine Sandbox v1.0.0</span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight leading-tight text-white max-w-lg">
            Collaborate. Version. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
              Master Git Workflows.
            </span>
          </h2>

          <p className="text-sm text-dark-muted leading-relaxed max-w-md">
            Practice commit branchings, pull request reviews, and merge conflict resolutions alongside AI developer bots inside a premium graphical simulator interface.
          </p>

          {/* SVG Live Commit Animation Mockup */}
          <div className="h-44 bg-[#080d16]/70 border border-white/5 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden glass-panel max-w-md">
            <div className="absolute inset-0 bg-gradient-to-r from-[#080d16] via-transparent to-[#080d16] z-10 pointer-events-none" />
            <svg className="w-full h-full z-0" viewBox="0 0 350 140">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Tracks */}
              <line x1="20" y1="50" x2="330" y2="50" stroke="url(#lineGrad)" strokeWidth="2.5" />
              <path d="M 100 50 Q 140 100 180 100 L 290 100" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
              
              {/* Animated Commit Nodes */}
              <motion.circle
                cx="50" cy="50" r="6" fill="#8b5cf6"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="100" cy="50" r="6" fill="#8b5cf6"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              
              {/* Branch Node */}
              <motion.circle
                cx="180" cy="100" r="5.5" fill="#10b981"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="240" cy="100" r="5.5" fill="#10b981"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2.5, delay: 0.6, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Main Head Node */}
              <circle cx="280" cy="50" r="6" fill="#6366f1" />
              
              {/* Dynamic Connecting Lines */}
              <motion.line
                x1="100" y1="50" x2="180" y2="100" stroke="#10b981" strokeWidth="2"
                animate={{ strokeDashoffset: [100, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />

              {/* Labels */}
              <text x="40" y="35" fill="#8b5cf6" fontSize="8" fontFamily="monospace">c1:init</text>
              <text x="265" y="35" fill="#6366f1" fontSize="8" fontFamily="monospace" fontWeight="bold">main</text>
              <text x="225" y="120" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">feature/auth</text>
            </svg>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Glassmorphic Form Card */}
        <div className="w-full max-w-md flex flex-col items-center">
          
          {/* Mobile Logo Brand */}
          <div className="flex md:hidden items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-glow">
              <Bot className="w-5.5 h-5.5" />
            </div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">GitForge</h1>
          </div>

          {/* Smooth layout transition card */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="w-full glass-panel premium-navbar rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden bg-[#090d16]/90"
          >
            <AnimatePresence mode="wait">
              
              {/* 1. LOGIN VIEW */}
              {view === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome Back</h2>
                  <p className="text-xs text-dark-muted mt-1.5">Sign in to sync your collaborative sandbox.</p>

                  <form onSubmit={handleLogin} className="mt-6 space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
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

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      onClick={() => handleSocialLogin('GitHub')}
                      className="py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </button>
                    <button
                      onClick={() => handleSocialLogin('Google')}
                      className="py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
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

                  {/* Demo Credentials quick access */}
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

              {/* 2. SIGNUP VIEW */}
              {view === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Create Account</h2>
                  <p className="text-xs text-dark-muted mt-1.5">Sign up to access visual sandbox collaborator modules.</p>

                  <form onSubmit={handleSignup} className="mt-6 space-y-4">
                    <div className="relative group">
                      <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
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

              {/* 3. EMAIL VERIFICATION VIEW */}
              {view === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mx-auto mb-4 relative">
                    <AnimatePresence>
                      {verifySuccess ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <CheckCircle className="w-8 h-8 text-emerald-400" />
                        </motion.div>
                      ) : (
                        <ShieldCheck className="w-6 h-6 text-purple-400" />
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Verify Your Email</h2>
                  <p className="text-xs text-dark-muted mt-2 px-4">
                    We have sent a simulated verification code to your email account <span className="text-gray-300 font-semibold">{email}</span>.
                  </p>

                  <form onSubmit={handleVerify} className="mt-8 space-y-6">
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
                      disabled={isLoading || verifySuccess}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? 'Verifying...' : verifySuccess ? 'Success!' : 'Verify & Continue'}
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
                      onClick={() => triggerSuccess('Verification code resent.')}
                      className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer transition-colors"
                    >
                      Resend Code
                    </span>
                  </div>
                </motion.div>
              )}

              {/* 4. FORGOT PASSWORD VIEW */}
              {view === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Reset Password</h2>
                  <p className="text-xs text-dark-muted mt-1.5">Enter your email to receive a password reset validation code.</p>

                  <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
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

            {/* 5. RESET PASSWORD VIEW */}
            {view === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-extrabold text-white tracking-tight">Choose New Password</h2>
                <p className="text-xs text-dark-muted mt-1.5">Enter the reset code sent to your email and select your new password.</p>

                <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                  <div className="relative group">
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Reset Code (6 Digits)"
                      className="w-full bg-[#05080f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-xs font-semibold focus:outline-none focus:border-purple-500/50 focus:shadow-glow transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-muted group-focus-within:text-purple-400 transition-colors" />
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-[11px] font-semibold text-center z-20"
              >
                {error}
              </motion.div>
            )}
            
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute bottom-4 left-4 right-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-[11px] font-semibold text-center z-20"
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

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
    </div>
  );
};

import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Menu, 
  Sun, 
  Moon,
  HelpCircle
} from 'lucide-react';

interface LoginViewProps {
  onUnlock: (userName: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onUnlock }) => {
  const [userName, setUserName] = useState('arunpandi47777@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlock('Arun Pandian');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col justify-between select-none bg-black text-white font-sans">
      {/* Background Hero: Crimson Mountain Sunset with Lone Hiker */}
      <img
        src="/assets/crimson-sunset.png"
        alt="Crimson Mountain Sunset with Lone Hiker"
        className="absolute inset-0 w-full h-full object-cover filter brightness-90 contrast-105 scale-100"
      />

      {/* Subtle Crimson Overlay to match reference mockup color tone */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-red-900/20 to-black/70 pointer-events-none" />

      {/* 1. Top Bar */}
      <header className="relative z-10 w-full px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="p-1 text-white/80 hover:text-white transition-colors"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold tracking-wider text-sm text-white">AP UI KIT</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-white/90">
          <button 
            type="button" 
            onClick={() => onUnlock('Developer')}
            className="hover:text-white transition-colors tracking-wide"
          >
            BACK TO HOME
          </button>
          <span className="text-white/40">|</span>
          <button 
            type="button" 
            onClick={() => alert('Ap is an offline-first desktop environment for developer interview preparation. For assistance, see documentation in the Help tab.')}
            className="hover:text-white transition-colors tracking-wide"
          >
            NEED HELP?
          </button>
          <span className="text-white/40">|</span>
          <button 
            type="button" 
            className="p-1 text-white/80 hover:text-white transition-colors"
            title="Toggle theme mode"
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Center Glassmorphic Login Form */}
      <main className="relative z-10 flex items-center justify-center px-4 my-auto">
        <div className="w-full max-w-[420px] p-8 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-2xl text-center">
          {/* Circular Glossy Red Ap Monogram Icon */}
          <div className="flex justify-center -mt-2 mb-4">
            <div className="relative group">
              <img
                src="/assets/icon-circle.png"
                alt="Ap Monogram Logo"
                className="w-20 h-20 rounded-full object-contain shadow-2xl ring-4 ring-white/20 transition-transform transform group-hover:scale-105"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Welcome Back!
          </h1>
          <p className="text-xs text-white/80 font-normal mb-6">
            Login to continue your learning journey
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username / Email Field */}
            <div className="relative">
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your email or username (e.g. arun4709s)"
                className="w-full pl-11 pr-4 py-3 bg-white/20 border border-white/30 rounded-full text-xs text-white placeholder-white/70 focus:outline-hidden focus:ring-2 focus:ring-[#E11D26] focus:bg-white/25 transition-all backdrop-blur-md"
              />
              <User className="w-4 h-4 text-white/75 absolute left-4 top-3.5" />
            </div>

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-11 py-3 bg-white/20 border border-white/30 rounded-full text-xs text-white placeholder-white/70 focus:outline-hidden focus:ring-2 focus:ring-[#E11D26] focus:bg-white/25 transition-all backdrop-blur-md"
              />
              <Lock className="w-4 h-4 text-white/75 absolute left-4 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/75 hover:text-white absolute right-4 top-3.5 p-0.5 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-98 mt-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Social Divider */}
          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-white/20" />
            <span className="px-3 text-[11px] font-semibold text-white/60 uppercase tracking-widest">
              OR
            </span>
            <div className="flex-1 border-t border-white/20" />
          </div>

          {/* Social Login Round Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Google */}
            <button
              type="button"
              onClick={() => onUnlock('Google Developer')}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              title="Sign in with Google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={() => onUnlock('GitHub Developer')}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              title="Sign in with GitHub"
            >
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </button>

            {/* Microsoft */}
            <button
              type="button"
              onClick={() => onUnlock('Microsoft Developer')}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              title="Sign in with Microsoft"
            >
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z" />
                <path fill="#00a4ef" d="M1 11h9v9H1z" />
                <path fill="#7fba00" d="M11 1h9v9h-9z" />
                <path fill="#ffb900" d="M11 11h9v9h-9z" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* 3. Bottom Bar */}
      <footer className="relative z-10 w-full px-8 py-5 flex items-center justify-between text-xs text-white/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-white/90" />
          <span>Your data is safe with us</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span>Don't have an account?</span>
          <button
            type="button"
            onClick={() => onUnlock('New Developer')}
            className="text-[#E11D26] font-bold hover:underline hover:text-red-400 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </footer>
    </div>
  );
};

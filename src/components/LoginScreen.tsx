import React, { useState } from 'react';
import {
  GraduationCap,
  AlertCircle,
  BookOpen,
  CalendarCheck,
  Receipt,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { PortalUserSession, Student } from '../types';
import { FullTuitionDataset } from '../services/googleSheets';
import {
  hasAnyLocalCredentials,
  isValidBridgeUrl,
  loginViaSheetsBridge,
  saveLocalAdminCredential,
  verifyLocalCredentials,
} from '../services/sheetsAuth';

interface LoginScreenProps {
  students: Student[];
  bridgeUrl: string;
  onLoginSuccess: (result: {
    session: PortalUserSession;
    dataset?: FullTuitionDataset;
    sheetMeta?: { spreadsheetId?: string; spreadsheetTitle?: string; spreadsheetUrl?: string };
  }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  students,
  bridgeUrl,
  onLoginSuccess,
}) => {
  const hasBridge = isValidBridgeUrl(bridgeUrl);
  const hasLocalAccounts = hasAnyLocalCredentials();
  const defaultSetupMode = !hasBridge && !hasLocalAccounts;

  const [isSetupMode] = useState<boolean>(defaultSetupMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);

      if (isSetupMode) {
        if (password.length < 4) {
          setErrorMsg('Admin password must be at least 4 characters long.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please re-enter carefully.');
          return;
        }
        const session = await saveLocalAdminCredential(normalizedEmail, password);
        onLoginSuccess({ session });
        return;
      }

      if (hasBridge) {
        const res = await loginViaSheetsBridge(bridgeUrl, normalizedEmail, password);
        onLoginSuccess({
          session: res.session,
          dataset: res.dataset,
          sheetMeta: res.sheetMeta,
        });
        return;
      }

      const session = await verifyLocalCredentials(normalizedEmail, password, students);
      onLoginSuccess({ session });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please check your Email ID and Password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F3] text-[#2D3329] flex flex-col justify-between font-sans selection:bg-[#CAD3C0] selection:text-[#2D3329]">
      {/* Minimal Top Brand Bar */}
      <header className="bg-white border-b border-[#E0E4D9]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5C6652] flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5 text-[#E9EDE0]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#2D3329] font-serif whitespace-nowrap">
                Sir Ali Preparations
              </h1>
            </div>
          </div>
          <span className="text-xs text-[#707969] font-medium whitespace-nowrap hidden sm:inline">
            CAIE · Federal &amp; Karachi Board · AKU-EB
          </span>
        </div>
      </header>

      {/* Main Centered Auth Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Editorial Info Column */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-[#5C6652]">
                Updated Weekly
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-[#2D3329] leading-tight text-balance">
                Academic Portal
              </h2>
              <p className="text-sm text-[#42473E] leading-relaxed max-w-xl">
                Only students enrolled with Sir Ali can access this portal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E0E4D9]">
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2D3329]">
                  <CalendarCheck className="w-4 h-4 text-[#5C6652]" />
                  <span>Daily Attendance</span>
                </div>
                <p className="text-xs text-[#707969] leading-relaxed">
                  View class attendance logs, covered topics, and class timings.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2D3329]">
                  <BookOpen className="w-4 h-4 text-[#5C6652]" />
                  <span>Syllabus &amp; Tests</span>
                </div>
                <p className="text-xs text-[#707969] leading-relaxed">
                  Track board-specific chapters, test marks, and report cards.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2D3329]">
                  <Receipt className="w-4 h-4 text-[#5C6652]" />
                  <span>Fee Receipts</span>
                </div>
                <p className="text-xs text-[#707969] leading-relaxed">
                  Check monthly tuition fee status and print official receipts.
                </p>
              </div>
            </div>
          </div>

          {/* Right Email + Password Card */}
          <div className="lg:col-span-6 flex items-center">
            <div className="w-full bg-white rounded-3xl border border-[#E0E4D9] p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-serif text-[#2D3329]">
                    {isSetupMode ? 'First-Time Admin Setup' : 'Sign In'}
                  </h3>
                  <p className="text-xs text-[#707969] leading-relaxed">
                    {isSetupMode
                      ? 'Create your local Admin email & password to open the dashboard and connect Google Sheets, or link an existing Sheet below.'
                      : hasBridge
                      ? 'Connected to Google Sheets LoginAccess verification.'
                      : 'Do not share your login credentials with anyone.'}
                  </p>
                </div>

                {hasBridge ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E9EDE0] text-[#5C6652] text-[11px] font-semibold shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sheet Linked
                  </span>
                ) : null}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmitLogin} className="space-y-4">
                <div>
                  <label htmlFor="portal-login-email" className="block text-xs font-semibold text-[#2D3329] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#707969] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="portal-login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. abcde12345@gmail.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8F3] border border-[#E0E4D9] rounded-xl text-sm text-[#2D3329] placeholder:text-[#8E9687] focus:outline-none focus:border-[#5C6652] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="portal-login-password" className="block text-xs font-semibold text-[#2D3329] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#707969] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="portal-login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSetupMode ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSetupMode ? 'Create admin password (min 4 chars)' : 'Enter your password'}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F7F8F3] border border-[#E0E4D9] rounded-xl text-sm text-[#2D3329] placeholder:text-[#8E9687] focus:outline-none focus:border-[#5C6652] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#707969] hover:text-[#2D3329] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isSetupMode && (
                  <div>
                    <label htmlFor="portal-confirm-password" className="block text-xs font-semibold text-[#2D3329] mb-1.5">
                      Confirm Admin Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#707969] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="portal-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter admin password"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F7F8F3] border border-[#E0E4D9] rounded-xl text-sm text-[#2D3329] placeholder:text-[#8E9687] focus:outline-none focus:border-[#5C6652] focus:bg-white transition"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  id="portal-login-submit-btn"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-[#5C6652] hover:bg-[#4D5644] text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : isSetupMode ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Admin Login &amp; Open Portal</span>
                    </>
                  ) : (
                    <span>Verify &amp; Open Portal</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-[#E0E4D9] py-4 text-center text-xs text-[#707969]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-[#2D3329]">
            Sir Ali Preparations © 2026 · Home &amp; Online Tuitions Portal
          </p>
          <span>siraliteach@gmail.com | +92 302 2324503 | Karachi Pakistan</span>
        </div>
      </footer>
    </div>
  );
};

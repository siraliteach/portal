import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  LogOut,
  AlertCircle,
  BookOpen,
  CalendarCheck,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { portalGoogleSignIn, googleSignOut } from '../services/googleAuth';

interface LoginScreenProps {
  currentUser: User | null;
  isUnauthorized?: boolean;
  authChecking?: boolean;
  authError?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  currentUser,
  isUnauthorized = false,
  authChecking = false,
  authError = null,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await portalGoogleSignIn();
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Browser popup was blocked. Please allow popups for this site and try again.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in window was closed before completing Google authentication.');
      } else {
        setErrorMsg(err?.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await googleSignOut();
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
          <span className="text-xs text-[#707969] font-medium whitespace-nowrap">
            CAIE · Federal &amp; Karachi Board · AKU-EB
          </span>
        </div>
      </header>

      {/* Main Centered Auth Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Editorial Info Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-[#5C6652]">
                Student, Parent &amp; Academic Administration
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold font-serif text-[#2D3329] leading-tight text-balance">
                Academic progress, attendance, and fee records in one secure portal.
              </h2>
              <p className="text-sm text-[#42473E] leading-relaxed max-w-xl">
                Students and parents can sign in directly with the Google email registered by Sir Ali in the academy database or Google Sheet — no extra approval needed once your email is listed.
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

          {/* Right Sign-In / Access Status Card */}
          <div className="lg:col-span-5 flex items-center">
            <div className="w-full bg-white rounded-3xl border border-[#E0E4D9] p-7 shadow-sm space-y-6">
              {authChecking ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-[#5C6652] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-[#2D3329]">Verifying portal access...</p>
                  <p className="text-xs text-[#707969]">Checking your registered Google email</p>
                </div>
              ) : isUnauthorized && currentUser ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAF1EC] text-[#9E6547] flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-serif text-[#2D3329]">
                        {authError ? 'Unable to Verify Access' : 'Email Not Registered'}
                      </h3>
                      <p className="text-xs text-[#707969] mt-0.5">
                        {authError
                          ? 'A temporary connection or permission error occurred while checking access.'
                          : 'Access is restricted to allowlisted student & parent accounts.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#F7F8F3] border border-[#E0E4D9] rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#707969]">Signed in as:</span>
                      <span className="font-semibold text-[#2D3329] truncate">{currentUser.email}</span>
                    </div>
                    <p className="text-[#42473E] leading-relaxed pt-1 border-t border-[#E0E4D9]">
                      {authError ? (
                        authError
                      ) : (
                        <>
                          This Google email has not been added to any student profile yet. Please ask <strong>Sir Ali</strong> to add your email in the Student Profile or Google Sheet, then sign in again.
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-[#5C6652] hover:bg-[#4D5644] text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out &amp; Try Another Email</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold font-serif text-[#2D3329]">
                      Sign in to Portal
                    </h3>
                    <p className="text-xs text-[#707969] leading-relaxed">
                      Use your allowlisted Google email (Student, Parent, or Admin) to continue.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    id="portal-google-signin-btn"
                    onClick={handleSignIn}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white hover:bg-[#F7F8F3] text-[#2D3329] border border-[#CAD3C0] rounded-xl text-sm font-semibold transition flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
                  </button>

                  <div className="pt-4 border-t border-[#E0E4D9] space-y-2.5 text-xs text-[#707969]">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#5C6652] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#2D3329]">Students &amp; Parents:</strong> Once Sir Ali adds your email to your profile or Google Sheet, sign in directly anytime.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#5C6652] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#2D3329]">Private Access:</strong> You only see your own linked student records.
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
          <span>Authorized Email Access</span>
        </div>
      </footer>
    </div>
  );
};

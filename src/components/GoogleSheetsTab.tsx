import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Users,
  FolderKanban,
  CalendarCheck,
  GraduationCap,
  BookOpen,
  Receipt,
  Copy,
  Check,
  Search,
  Eye,
  ShieldCheck,
  KeyRound,
  Link2,
  Code2,
  Share2,
  Lock,
} from 'lucide-react';
import {
  Student,
  StudentGroup,
  AttendanceRecord,
  TestScore,
  SubjectSyllabus,
  FeeRecord,
  GoogleSheetsConfig,
  PortalUserSession,
} from '../types';
import {
  fetchSpreadsheetInfo,
  syncAllTablesToGoogleSheets,
  pullAllTablesFromGoogleSheets,
  readSheetValues,
  addSheetTab,
  deleteSheetTab,
  SpreadsheetDetails,
  SheetTabInfo,
  FullTuitionDataset,
} from '../services/googleSheets';
import { getAccessToken } from '../services/googleAuth';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  buildShareablePortalUrl,
  cacheLoginAccountsLocally,
  isValidBridgeUrl,
  loginViaSheetsBridge,
  pingSheetsBridge,
  refreshViaSheetsBridge,
  syncAllViaSheetsBridge,
} from '../services/sheetsAuth';

interface GoogleSheetsTabProps {
  students: Student[];
  groups: StudentGroup[];
  attendance: AttendanceRecord[];
  testScores: TestScore[];
  syllabus: SubjectSyllabus[];
  fees: FeeRecord[];
  sheetsConfig: GoogleSheetsConfig | null;
  session: PortalUserSession;
  onSessionUpdate: (session: PortalUserSession) => void;
  onUpdateConfig: (config: GoogleSheetsConfig | null) => void;
  onApplyPulledData: (data: FullTuitionDataset) => void;
  showToast: (msg: string) => void;
}

export const GoogleSheetsTab: React.FC<GoogleSheetsTabProps> = ({
  students,
  groups,
  attendance,
  testScores,
  syllabus,
  fees,
  sheetsConfig,
  session,
  onSessionUpdate,
  onUpdateConfig,
  onApplyPulledData,
  showToast,
}) => {
  const [spreadsheetDetails, setSpreadsheetDetails] = useState<SpreadsheetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apps Script Bridge State
  const [webAppInput, setWebAppInput] = useState(sheetsConfig?.webAppUrl || '');
  const [bridgeLoginCount, setBridgeLoginCount] = useState<number | null>(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  // Bridge session activation (for Admin who signed in locally before connecting Web App URL)
  const [bridgeAuthEmail, setBridgeAuthEmail] = useState(session.email || '');
  const [bridgeAuthPass, setBridgeAuthPass] = useState('');
  const [isActivatingBridge, setIsActivatingBridge] = useState(false);

  // Tab Manager state (available when Google OAuth Drive token is present)
  const [newTabTitle, setNewTabTitle] = useState('');
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [selectedInspectTab, setSelectedInspectTab] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any[][] | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectSearch, setInspectSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Destructive Action Modal state
  const [deleteTabConfirm, setDeleteTabConfirm] = useState<SheetTabInfo | null>(null);
  const [pullConfirmOpen, setPullConfirmOpen] = useState(false);

  // Activity logs
  const [activityLogs, setActivityLogs] = useState<
    { id: string; time: string; text: string; type: 'success' | 'info' | 'error' }[]
  >([
    {
      id: '1',
      time: new Date().toLocaleTimeString(),
      text: 'Google Sheets LoginAccess & Database engine ready',
      type: 'info',
    },
  ]);

  const addLog = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setActivityLogs((prev) => [
      { id: `log-${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 25),
    ]);
  };

  useEffect(() => {
    if (sheetsConfig?.webAppUrl && !webAppInput) {
      setWebAppInput(sheetsConfig.webAppUrl);
    }
  }, [sheetsConfig?.webAppUrl]);

  // Load Spreadsheet Details if OAuth token + spreadsheetId are available
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !sheetsConfig?.spreadsheetId || sheetsConfig.spreadsheetId === 'apps-script-linked') {
      return;
    }

    const loadDetails = async () => {
      try {
        setIsLoading(true);
        const details = await fetchSpreadsheetInfo(token, sheetsConfig.spreadsheetId);
        setSpreadsheetDetails(details);
      } catch (err: any) {
        console.error('Failed to load spreadsheet details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
  }, [sheetsConfig?.spreadsheetId]);

  const hasValidBridge = Boolean(sheetsConfig?.webAppUrl && isValidBridgeUrl(sheetsConfig.webAppUrl));
  const hasBridgeSession = Boolean(hasValidBridge && session.bridgeToken);
  const hasOAuthToken = Boolean(getAccessToken() && sheetsConfig?.spreadsheetId && sheetsConfig.spreadsheetId !== 'apps-script-linked');

  const handleCopyAppsScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
      showToast('Apps Script code copied! Paste it in Google Sheets → Extensions → Apps Script.');
      addLog('Copied Apps Script Web App code to clipboard', 'info');
    } catch {
      setShowScriptModal(true);
    }
  };

  const handleConnectBridgeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = webAppInput.trim();
    if (!isValidBridgeUrl(url)) {
      setErrorMessage('Please enter a valid Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec).');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      addLog('Verifying Google Sheets Web App connection...', 'info');
      const info = await pingSheetsBridge(url);
      setBridgeLoginCount(info.loginCount);

      const nextConfig: GoogleSheetsConfig = {
        spreadsheetId: info.spreadsheetId || sheetsConfig?.spreadsheetId || 'apps-script-linked',
        spreadsheetTitle: info.sheetTitle || sheetsConfig?.spreadsheetTitle || 'Google Sheets Portal Database',
        spreadsheetUrl: info.spreadsheetUrl || sheetsConfig?.spreadsheetUrl || '',
        autoSync: sheetsConfig?.autoSync ?? true,
        lastSyncedAt: new Date().toLocaleTimeString(),
        webAppUrl: url,
      };
      onUpdateConfig(nextConfig);

      showToast(`Connected to "${nextConfig.spreadsheetTitle}"`);
      addLog(`Connected Google Sheet "${nextConfig.spreadsheetTitle}" (${info.loginCount} LoginAccess rows)`, 'success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to Google Apps Script Web App URL.');
      addLog(`Bridge error: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyBridgeSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsConfig?.webAppUrl) return;
    try {
      setIsActivatingBridge(true);
      setErrorMessage(null);
      const res = await loginViaSheetsBridge(
        sheetsConfig.webAppUrl,
        bridgeAuthEmail.trim().toLowerCase(),
        bridgeAuthPass
      );
      if (res.session.role !== 'admin') {
        setErrorMessage('This account is not marked as role "admin" in the LoginAccess tab.');
        return;
      }
      onSessionUpdate(res.session);
      setBridgeAuthPass('');
      showToast('Google Sheet Admin sync session activated!');
      addLog(`Activated Google Sheet Admin sync for ${res.session.email}`, 'success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Email or password did not match the LoginAccess tab.');
    } finally {
      setIsActivatingBridge(false);
    }
  };

  const handleCopyShareableLink = async () => {
    if (!sheetsConfig?.webAppUrl) return;
    const shareUrl = buildShareablePortalUrl(sheetsConfig.webAppUrl);
    await navigator.clipboard.writeText(shareUrl);
    setCopiedPortalLink(true);
    setTimeout(() => setCopiedPortalLink(false), 2500);
    showToast('Student & Parent login link copied!');
  };

  const handlePushAllData = async () => {
    try {
      setIsSyncing(true);
      setErrorMessage(null);
      addLog('Pushing all database tables to Google Sheets...', 'info');

      if (hasBridgeSession && sheetsConfig?.webAppUrl && session.bridgeToken) {
        await syncAllViaSheetsBridge(sheetsConfig.webAppUrl, session.bridgeToken, {
          students,
          groups,
          attendance,
          testScores,
          syllabus,
          fees,
        });
      } else if (hasOAuthToken && sheetsConfig?.spreadsheetId) {
        const token = getAccessToken()!;
        await syncAllTablesToGoogleSheets(token, sheetsConfig.spreadsheetId, {
          students,
          groups,
          attendance,
          testScores,
          syllabus,
          fees,
        });
      } else {
        setErrorMessage(
          hasValidBridge
            ? 'Please verify your Admin password from the LoginAccess tab below to enable Push Sync.'
            : 'Please connect your Google Sheet Web App URL first.'
        );
        return;
      }

      const time = new Date().toLocaleTimeString();
      if (sheetsConfig) {
        onUpdateConfig({
          ...sheetsConfig,
          lastSyncedAt: time,
        });
      }

      showToast('All tables successfully synced to Google Sheets!');
      addLog(
        `Pushed ${students.length} students, ${groups.length} batches, ${attendance.length} attendance logs, ${fees.length} fee records to Google Sheets`,
        'success'
      );
    } catch (err: any) {
      console.error('Push failed:', err);
      setErrorMessage(err.message || 'Failed to sync data to Google Sheets');
      showToast('Push to Google Sheets failed');
      addLog(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecutePullData = async () => {
    try {
      setIsSyncing(true);
      setErrorMessage(null);
      setPullConfirmOpen(false);
      addLog('Pulling fresh database rows from Google Sheets...', 'info');

      let pulled: FullTuitionDataset;
      if (hasBridgeSession && sheetsConfig?.webAppUrl && session.bridgeToken) {
        pulled = await refreshViaSheetsBridge(sheetsConfig.webAppUrl, session.bridgeToken);
      } else if (hasOAuthToken && sheetsConfig?.spreadsheetId) {
        const token = getAccessToken()!;
        pulled = await pullAllTablesFromGoogleSheets(token, sheetsConfig.spreadsheetId);
        if (pulled.loginAccounts && pulled.loginAccounts.length > 0) {
          await cacheLoginAccountsLocally(pulled.loginAccounts);
        }
      } else {
        setErrorMessage(
          hasValidBridge
            ? 'Please verify your Admin password from the LoginAccess tab to enable Pull Sync.'
            : 'Please connect your Google Sheet Web App URL first.'
        );
        return;
      }

      onApplyPulledData(pulled);

      if (sheetsConfig) {
        onUpdateConfig({
          ...sheetsConfig,
          lastSyncedAt: new Date().toLocaleTimeString(),
        });
      }

      showToast(`Loaded ${pulled.students.length} students & ${pulled.groups.length} batches from Google Sheets!`);
      addLog(
        `Imported ${pulled.students.length} students, ${pulled.groups.length} batches, ${pulled.fees.length} fee records from Google Sheets`,
        'success'
      );
    } catch (err: any) {
      console.error('Pull failed:', err);
      setErrorMessage(err.message || 'Failed to pull data from Google Sheets');
      showToast('Failed to pull from Google Sheets');
      addLog(`Pull error: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCustomTab = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !sheetsConfig?.spreadsheetId || !newTabTitle.trim()) return;

    try {
      setIsLoading(true);
      await addSheetTab(token, sheetsConfig.spreadsheetId, newTabTitle.trim());
      showToast(`Added tab "${newTabTitle.trim()}" to Google Sheets`);
      addLog(`Created sheet tab: "${newTabTitle.trim()}" in Google Sheets`, 'success');
      setNewTabTitle('');
      setIsAddingTab(false);

      const updatedDetails = await fetchSpreadsheetInfo(token, sheetsConfig.spreadsheetId);
      setSpreadsheetDetails(updatedDetails);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add tab');
      showToast('Failed to add tab');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteDeleteTab = async () => {
    const token = getAccessToken();
    if (!token || !sheetsConfig?.spreadsheetId || !deleteTabConfirm) return;

    try {
      setIsLoading(true);
      await deleteSheetTab(token, sheetsConfig.spreadsheetId, deleteTabConfirm.sheetId);
      showToast(`Deleted tab "${deleteTabConfirm.title}"`);
      addLog(`Deleted sheet tab "${deleteTabConfirm.title}" from Google Sheets`, 'info');
      setDeleteTabConfirm(null);

      const updatedDetails = await fetchSpreadsheetInfo(token, sheetsConfig.spreadsheetId);
      setSpreadsheetDetails(updatedDetails);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete tab');
      showToast('Failed to delete tab');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectTab = async (tabTitle: string) => {
    const token = getAccessToken();
    if (!token || !sheetsConfig?.spreadsheetId) return;

    try {
      setIsInspecting(true);
      setSelectedInspectTab(tabTitle);
      setInspectData(null);
      const rows = await readSheetValues(token, sheetsConfig.spreadsheetId, `${tabTitle}!A1:Z100`);
      setInspectData(rows);
    } catch (err: any) {
      showToast(`Could not read data from tab "${tabTitle}"`);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleToggleAutoSync = () => {
    if (!sheetsConfig) return;
    const updated = {
      ...sheetsConfig,
      autoSync: !sheetsConfig.autoSync,
    };
    onUpdateConfig(updated);
    showToast(updated.autoSync ? 'Auto-Sync enabled: Changes will save to Google Sheets' : 'Auto-Sync disabled: Local-only mode');
  };

  const copySpreadsheetLink = () => {
    if (!sheetsConfig?.spreadsheetUrl) return;
    navigator.clipboard.writeText(sheetsConfig.spreadsheetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast('Spreadsheet URL copied to clipboard');
  };

  const standardTabsMeta = [
    {
      name: 'LoginAccess',
      icon: KeyRound,
      count: bridgeLoginCount ?? 'Sheet',
      unit: 'login rows',
      color: 'from-violet-500/10 to-purple-500/10 border-violet-500/30 text-violet-400',
    },
    {
      name: 'Students',
      icon: Users,
      count: students.length,
      unit: 'students',
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-400',
    },
    {
      name: 'Groups',
      icon: FolderKanban,
      count: groups.length,
      unit: 'batches',
      color: 'from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-400',
    },
    {
      name: 'Attendance',
      icon: CalendarCheck,
      count: attendance.length,
      unit: 'records',
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      name: 'TestScores',
      icon: GraduationCap,
      count: testScores.length,
      unit: 'quizzes',
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-400',
    },
    {
      name: 'Syllabus',
      icon: BookOpen,
      count: syllabus.length,
      unit: 'subjects',
      color: 'from-cyan-500/10 to-sky-500/10 border-cyan-500/30 text-cyan-400',
    },
    {
      name: 'Fees',
      icon: Receipt,
      count: fees.length,
      unit: 'invoices',
      color: 'from-rose-500/10 to-red-500/10 border-rose-500/30 text-rose-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 flex flex-wrap items-center gap-2">
                  Google Sheets Database &amp; LoginAccess
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    No Firebase Required
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Manage Admin, Student &amp; Parent emails + passwords directly inside your Google Sheet&apos;s{' '}
                  <strong className="text-emerald-300">LoginAccess</strong> tab and sync all portal records live.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyAppsScript}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedScript ? 'Apps Script Copied!' : 'Copy Apps Script Code'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowScriptModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>View Script</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-rose-200">Google Sheets Notice</p>
            <p className="text-rose-300/90 mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-rose-200 underline font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Web App Connection, Sync & Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection & Web App Bridge Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    hasValidBridge ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    {sheetsConfig?.spreadsheetTitle || 'Connect Your Google Sheet'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {hasValidBridge
                      ? 'Google Apps Script Web App connected for LoginAccess verification & data sync'
                      : 'Paste your Google Apps Script Web App URL below to connect your spreadsheet'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {sheetsConfig?.spreadsheetUrl && (
                  <>
                    <a
                      href={sheetsConfig.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Sheet
                    </a>
                    <button
                      type="button"
                      onClick={copySpreadsheetLink}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                      title="Copy Sheet URL"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Web App URL Form */}
            <form onSubmit={handleConnectBridgeUrl} className="space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Google Apps Script Web App URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={webAppInput}
                    onChange={(e) => setWebAppInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !webAppInput.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap"
                >
                  {isLoading ? 'Verifying...' : 'Connect & Test Sheet'}
                </button>
              </div>
            </form>

            {/* Shareable Student/Parent Portal Link */}
            {hasValidBridge && sheetsConfig?.webAppUrl && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4" />
                    Direct Student &amp; Parent Login Link
                  </p>
                  <p className="text-[11px] text-emerald-200/80">
                    Share this link on WhatsApp — Students &amp; Parents will connect automatically and log in with their email &amp; password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareableLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shrink-0"
                >
                  {copiedPortalLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPortalLink ? 'Link Copied!' : 'Copy Portal Link'}</span>
                </button>
              </div>
            )}

            {/* Activate Admin Sync Session if connected locally before bridge login */}
            {hasValidBridge && !hasBridgeSession && (
              <form
                onSubmit={handleVerifyBridgeSession}
                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-200">
                      Verify Admin Login from Sheet to Enable Push &amp; Pull Sync
                    </p>
                    <p className="text-[11px] text-amber-200/80 mt-0.5">
                      Enter your Admin Email &amp; Password from the <strong className="text-white">LoginAccess</strong>{' '}
                      tab in Google Sheets to unlock live cloud sync.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="email"
                    value={bridgeAuthEmail}
                    onChange={(e) => setBridgeAuthEmail(e.target.value)}
                    placeholder="Admin Email in Sheet"
                    required
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="password"
                    value={bridgeAuthPass}
                    onChange={(e) => setBridgeAuthPass(e.target.value)}
                    placeholder="Password in LoginAccess tab"
                    required
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={isActivatingBridge}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    {isActivatingBridge ? 'Verifying...' : 'Activate Sheet Sync'}
                  </button>
                </div>
              </form>
            )}

            {/* Sync Control Bar */}
            {(hasBridgeSession || hasOAuthToken) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePushAllData}
                  disabled={isSyncing || isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30 disabled:opacity-50 cursor-pointer"
                >
                  <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  Push to Sheets (Sync Now)
                </button>

                <button
                  type="button"
                  onClick={() => setPullConfirmOpen(true)}
                  disabled={isSyncing || isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <CloudDownload className="w-4 h-4 text-blue-400" />
                  Pull from Sheets (Restore)
                </button>

                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${sheetsConfig?.autoSync ? 'text-emerald-400' : 'text-slate-500'}`}
                    />
                    <span className="font-medium text-slate-300">Auto-Sync</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoSync}
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      sheetsConfig?.autoSync ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        sheetsConfig?.autoSync ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LoginAccess Tab Structure Guide */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-violet-400" />
                  How to Enter Logins in Google Sheets (<span className="text-violet-300 font-mono">LoginAccess</span>{' '}
                  Tab)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sir Ali can add or update Admin, Student, and Parent accounts directly inside Google Sheets. Pushing data never overwrites your LoginAccess rows.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Email</th>
                    <th className="px-3 py-2.5 font-semibold">Password</th>
                    <th className="px-3 py-2.5 font-semibold">Role</th>
                    <th className="px-3 py-2.5 font-semibold">Student ID</th>
                    <th className="px-3 py-2.5 font-semibold">Student Name</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60 font-mono text-[11px] text-slate-300">
                  <tr>
                    <td className="px-3 py-2 text-emerald-300">2331975ali@gmail.com</td>
                    <td className="px-3 py-2">your_admin_pass</td>
                    <td className="px-3 py-2 text-amber-300">admin</td>
                    <td className="px-3 py-2">ALL</td>
                    <td className="px-3 py-2">Sir Ali (Admin)</td>
                    <td className="px-3 py-2 text-emerald-400">active</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-blue-300">student@gmail.com</td>
                    <td className="px-3 py-2">student_pass</td>
                    <td className="px-3 py-2 text-blue-300">student</td>
                    <td className="px-3 py-2">AUTO (or stu-1)</td>
                    <td className="px-3 py-2">Ahmed Raza</td>
                    <td className="px-3 py-2 text-emerald-400">active</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-violet-300">parent@gmail.com</td>
                    <td className="px-3 py-2">parent_pass</td>
                    <td className="px-3 py-2 text-violet-300">parent</td>
                    <td className="px-3 py-2">stu-1, stu-2</td>
                    <td className="px-3 py-2">Parent of Ahmed</td>
                    <td className="px-3 py-2 text-emerald-400">active</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tip: Leave <code className="text-slate-200">Student ID</code> as{' '}
              <code className="text-slate-200">AUTO</code> to match any student whose{' '}
              <strong className="text-slate-200">Email</strong> or <strong className="text-slate-200">Parent Email</strong>{' '}
              matches, or enter specific Student ID(s) separated by commas. Set{' '}
              <code className="text-slate-200">Status</code> to <code className="text-rose-300">disabled</code> anytime to block access immediately.
            </p>
          </div>

          {/* Manageable Tabs Overview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Google Sheets Tables ({standardTabsMeta.length} Tabs)
                </h2>
                <p className="text-xs text-slate-400">
                  Structured tabs synced between the portal and your Google Spreadsheet.
                </p>
              </div>

              {hasOAuthToken && (
                <button
                  type="button"
                  onClick={() => setIsAddingTab(!isAddingTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Add Custom Tab
                </button>
              )}
            </div>

            {isAddingTab && hasOAuthToken && (
              <form onSubmit={handleAddCustomTab} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-300">Add New Sheet Tab to Google Spreadsheet</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTabTitle}
                    onChange={(e) => setNewTabTitle(e.target.value)}
                    placeholder="e.g. PastPapers_2026, Homework_Tracker..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !newTabTitle.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Create Tab
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {standardTabsMeta.map((tab) => {
                const Icon = tab.icon;
                const isConfigured =
                  hasValidBridge ||
                  spreadsheetDetails?.sheets.some((s) => s.title.toLowerCase() === tab.name.toLowerCase());
                return (
                  <div
                    key={tab.name}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg bg-slate-900 border ${tab.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                            {tab.name}
                            {isConfigured && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {tab.count} {tab.unit}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                      {hasOAuthToken ? (
                        <button
                          type="button"
                          onClick={() => handleInspectTab(tab.name)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect Data
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Managed in Sheet</span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">Tab: {tab.name}</span>
                    </div>
                  </div>
                );
              })}

              {spreadsheetDetails?.sheets
                .filter((s) => !standardTabsMeta.some((std) => std.name.toLowerCase() === s.title.toLowerCase()))
                .map((customSheet) => (
                  <div
                    key={customSheet.sheetId}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-400">
                          <Table className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-200">{customSheet.title}</h3>
                          <p className="text-[11px] text-slate-400">Custom Sheet Tab</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteTabConfirm(customSheet)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Tab"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleInspectTab(customSheet.title)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Data
                      </button>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {customSheet.sheetId}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Col: Setup Checklist, Sync Status & Activity Log */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <Database className="w-4 h-4 text-emerald-400" />
              3-Step Setup Guide
            </h2>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-300">1. Paste Script into Google Sheet</p>
                <p className="text-slate-400 leading-relaxed">
                  Open a Google Sheet → <strong>Extensions → Apps Script</strong> → Paste copied code → Save → Run{' '}
                  <code className="text-slate-200">setupTabs</code> once.
                </p>
              </li>
              <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-300">2. Deploy as Web App</p>
                <p className="text-slate-400 leading-relaxed">
                  Click <strong>Deploy → New deployment → Web app</strong>. Set <em>Execute as: Me</em> and{' '}
                  <em>Who has access: Anyone</em>. Copy the Web App URL.
                </p>
              </li>
              <li className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-300">3. Enter Logins &amp; Connect</p>
                <p className="text-slate-400 leading-relaxed">
                  Add emails &amp; passwords in the <strong className="text-slate-200">LoginAccess</strong> tab, paste the Web App URL here, and click{' '}
                  <strong>Push to Sheets</strong>.
                </p>
              </li>
            </ol>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Sync Status</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {hasBridgeSession ? 'Live Bridge Active' : hasValidBridge ? 'Bridge Connected' : 'Local Mode'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Last Synced</span>
                <span className="text-xs font-semibold text-slate-300 font-mono">
                  {sheetsConfig?.lastSyncedAt || 'Not yet synced'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                Database Activity Log
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">{activityLogs.length} events</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{log.time}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        log.type === 'success'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : log.type === 'error'
                          ? 'text-rose-400 bg-rose-500/10'
                          : 'text-blue-400 bg-blue-500/10'
                      }`}
                    >
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] break-words">{log.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Apps Script Viewer Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Google Apps Script Web App Code (Code.gs)</h3>
                <p className="text-xs text-slate-400">
                  Paste this into Google Sheets → Extensions → Apps Script, then Deploy as Web App (Anyone).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copied' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="p-5 overflow-auto flex-1 text-xs font-mono text-emerald-300 bg-slate-950 leading-relaxed">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          </div>
        </div>
      )}

      {/* Raw Data & Cell Inspector Modal */}
      {selectedInspectTab && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Tab Inspector: <span className="text-emerald-400">{selectedInspectTab}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live raw rows queried from Google Sheets range{' '}
                    <code className="text-slate-300">{selectedInspectTab}!A1:Z100</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inspectSearch}
                    onChange={(e) => setInspectSearch(e.target.value)}
                    placeholder="Filter rows..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInspectTab(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto flex-1">
              {isInspecting ? (
                <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  Fetching live cells from Google Sheets...
                </div>
              ) : !inspectData || inspectData.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  This tab has no data or has not been pushed yet. Click &quot;Push to Sheets&quot; to populate it.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-300 border-b border-slate-800 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="p-3 w-12 text-slate-500 font-mono text-center">#</th>
                        {inspectData[0]?.map((headerCol: any, idx: number) => (
                          <th key={idx} className="p-3 border-r border-slate-800/80 whitespace-nowrap">
                            {String(headerCol)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono text-slate-300">
                      {inspectData
                        .slice(1)
                        .filter(
                          (row) =>
                            !inspectSearch ||
                            row.some((cell) => String(cell).toLowerCase().includes(inspectSearch.toLowerCase()))
                        )
                        .map((row: any[], rowIdx: number) => (
                          <tr key={rowIdx} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 text-slate-500 text-center border-r border-slate-800/80">
                              {rowIdx + 1}
                            </td>
                            {row.map((cell: any, cellIdx: number) => (
                              <td
                                key={cellIdx}
                                className="p-3 border-r border-slate-800/80 whitespace-nowrap max-w-xs truncate"
                              >
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {inspectData ? Math.max(0, inspectData.length - 1) : 0} row(s)</span>
              <button
                type="button"
                onClick={() => setSelectedInspectTab(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pull Confirmation Modal */}
      {pullConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CloudDownload className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">Pull Data from Google Sheets?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will pull all rows from your connected Google Spreadsheet and update the portal&apos;s local data.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPullConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePullData}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {isSyncing ? 'Pulling...' : 'Yes, Pull from Sheets'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tab Confirmation Modal */}
      {deleteTabConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">Delete Google Sheet Tab?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete the tab{' '}
                <strong className="text-rose-300 font-mono">&quot;{deleteTabConfirm.title}&quot;</strong> from your Google
                Spreadsheet?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTabConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteTab}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                {isLoading ? 'Deleting...' : 'Confirm Delete Tab'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

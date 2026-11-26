import {
  LoginAccount,
  LoginAccountRole,
  PortalUserSession,
  Student,
  StudentGroup,
  AttendanceRecord,
  TestScore,
  SubjectSyllabus,
  FeeRecord,
} from '../types';
import { FullTuitionDataset } from './googleSheets';
import { getStoredSheetsConfig, setStoredSheetsConfig } from '../utils/storage';

const LOCAL_ACCOUNTS_KEY = 'sir_ali_prep_login_hashes_v1';

interface StoredHashedAccount {
  email: string;
  passwordHash: string;
  role: LoginAccountRole;
  studentId: string;
  studentName?: string;
  status: 'active' | 'disabled';
}

export function isValidBridgeUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'script.google.com' || parsed.hostname.endsWith('.googleusercontent.com'))
    );
  } catch {
    return false;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`sap_v1:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getSavedBridgeUrl(): string {
  const cfg = getStoredSheetsConfig();
  return cfg?.webAppUrl?.trim() || '';
}

export function saveBridgeUrlToConfig(
  webAppUrl: string,
  meta?: { spreadsheetId?: string; spreadsheetTitle?: string; spreadsheetUrl?: string }
): void {
  const current = getStoredSheetsConfig();
  setStoredSheetsConfig({
    spreadsheetId: meta?.spreadsheetId || current?.spreadsheetId || 'apps-script-linked',
    spreadsheetTitle: meta?.spreadsheetTitle || current?.spreadsheetTitle || 'Google Sheets Portal Database',
    spreadsheetUrl: meta?.spreadsheetUrl || current?.spreadsheetUrl || '',
    autoSync: current?.autoSync ?? true,
    lastSyncedAt: current?.lastSyncedAt,
    webAppUrl: webAppUrl.trim(),
  });
}

export function extractBridgeUrlFromLocation(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get('bridge') || params.get('api') || '';
    if (candidate && isValidBridgeUrl(candidate)) {
      saveBridgeUrlToConfig(candidate);
      return candidate.trim();
    }
  } catch {
    // Ignore malformed query strings
  }
  return getSavedBridgeUrl();
}

export function buildShareablePortalUrl(webAppUrl: string): string {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?bridge=${encodeURIComponent(webAppUrl.trim())}`;
}

function getStoredHashedAccounts(): StoredHashedAccount[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredHashedAccounts(accounts: StoredHashedAccount[]): void {
  try {
    window.localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not persist hashed login accounts locally:', e);
  }
}

export function hasAnyLocalCredentials(): boolean {
  return getStoredHashedAccounts().length > 0;
}

export async function saveLocalAdminCredential(email: string, password: string): Promise<PortalUserSession> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  const passwordHash = await hashPassword(password);
  const existing = getStoredHashedAccounts().filter((a) => a.email !== normalizedEmail);
  const adminAccount: StoredHashedAccount = {
    email: normalizedEmail,
    passwordHash,
    role: 'admin',
    studentId: 'ALL',
    studentName: 'Sir Ali (Admin)',
    status: 'active',
  };

  setStoredHashedAccounts([adminAccount, ...existing]);

  return {
    email: normalizedEmail,
    name: 'Sir Ali (Admin)',
    role: 'admin',
    studentIds: [],
    authSource: 'local_credentials',
  };
}

export async function cacheLoginAccountsLocally(accounts: LoginAccount[]): Promise<void> {
  const existingAdmins = getStoredHashedAccounts().filter((a) => a.role === 'admin');
  const hashed: StoredHashedAccount[] = [];

  for (const acc of accounts) {
    const email = acc.email.trim().toLowerCase();
    if (!email || !acc.password) continue;
    const passwordHash = await hashPassword(acc.password);
    hashed.push({
      email,
      passwordHash,
      role: acc.role,
      studentId: acc.studentId || '',
      studentName: acc.studentName,
      status: acc.status,
    });
  }

  // Keep any locally claimed admin if sheet didn't have one with a real password
  const hasSheetAdmin = hashed.some((a) => a.role === 'admin');
  const merged = hasSheetAdmin ? hashed : [...existingAdmins, ...hashed];
  setStoredHashedAccounts(merged);
}

export async function verifyLocalCredentials(
  email: string,
  password: string,
  allStudents: Student[]
): Promise<PortalUserSession> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getStoredHashedAccounts();
  if (accounts.length === 0) {
    throw new Error('No login accounts configured yet. Connect your Google Sheet Web App URL or complete First-Time Admin Setup.');
  }

  const inputHash = await hashPassword(password);
  const match = accounts.find(
    (a) => a.email === normalizedEmail && a.passwordHash === inputHash
  );

  if (!match) {
    throw new Error('Email ID or password does not match.');
  }
  if (match.status === 'disabled') {
    throw new Error('This account has been disabled by the Admin.');
  }

  let studentIds: string[] = [];
  if (match.role !== 'admin') {
    const explicitIds = (match.studentId || '')
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s && s.toUpperCase() !== 'AUTO' && s.toUpperCase() !== 'ALL');

    if (explicitIds.length > 0) {
      studentIds = explicitIds;
    } else {
      studentIds = allStudents
        .filter((s) => {
          const se = (s.email || '').toLowerCase();
          const pe = (s.parentEmail || '').toLowerCase();
          return se.includes(normalizedEmail) || pe.includes(normalizedEmail);
        })
        .map((s) => s.id);
    }
  }

  return {
    email: match.email,
    name: match.studentName || (match.role === 'admin' ? 'Sir Ali (Admin)' : match.email),
    role: match.role,
    studentIds,
    authSource: 'local_credentials',
  };
}

async function callBridge(webAppUrl: string, payload: Record<string, any>): Promise<any> {
  if (!isValidBridgeUrl(webAppUrl)) {
    throw new Error('Please enter a valid Google Apps Script Web App URL (https://script.google.com/...).');
  }

  const res = await fetch(webAppUrl.trim(), {
    method: 'POST',
    headers: {
      // text/plain avoids CORS preflight OPTIONS requests, which Apps Script does not answer
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Google Sheet server returned HTTP ${res.status}`);
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid response from Google Sheet Web App. Make sure deployment access is set to "Anyone".');
  }

  if (!data || data.ok === false) {
    throw new Error(data?.error || 'Google Sheet verification failed.');
  }

  return data;
}

export async function pingSheetsBridge(webAppUrl: string): Promise<{
  ok: boolean;
  sheetTitle: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  loginCount: number;
}> {
  const data = await callBridge(webAppUrl, { action: 'ping' });
  return {
    ok: true,
    sheetTitle: String(data.sheetTitle || 'Google Sheets Portal Database'),
    spreadsheetId: String(data.spreadsheetId || 'apps-script-linked'),
    spreadsheetUrl: String(data.spreadsheetUrl || ''),
    loginCount: Number(data.loginCount || 0),
  };
}

export async function loginViaSheetsBridge(
  webAppUrl: string,
  email: string,
  password: string
): Promise<{
  session: PortalUserSession;
  dataset: FullTuitionDataset;
  sheetMeta?: { spreadsheetId?: string; spreadsheetTitle?: string; spreadsheetUrl?: string };
}> {
  const data = await callBridge(webAppUrl, {
    action: 'login',
    email: email.trim().toLowerCase(),
    password,
  });

  const user = data.user || {};
  const role: LoginAccountRole =
    user.role === 'admin' ? 'admin' : user.role === 'parent' ? 'parent' : 'student';

  const session: PortalUserSession = {
    email: String(user.email || email.trim().toLowerCase()),
    name: String(user.name || (role === 'admin' ? 'Sir Ali (Admin)' : email)),
    role,
    studentIds: Array.isArray(user.studentIds) ? user.studentIds.map(String) : [],
    authSource: 'sheets_bridge',
    bridgeToken: String(data.token || ''),
  };

  const ds = data.dataset || {};
  const dataset: FullTuitionDataset = {
    students: Array.isArray(ds.students) ? ds.students : [],
    groups: Array.isArray(ds.groups) ? ds.groups : [],
    attendance: Array.isArray(ds.attendance) ? ds.attendance : [],
    testScores: Array.isArray(ds.testScores) ? ds.testScores : [],
    syllabus: Array.isArray(ds.syllabus) ? ds.syllabus : [],
    fees: Array.isArray(ds.fees) ? ds.fees : [],
  };

  return {
    session,
    dataset,
    sheetMeta: data.sheetMeta,
  };
}

export async function refreshViaSheetsBridge(
  webAppUrl: string,
  token: string
): Promise<FullTuitionDataset> {
  const data = await callBridge(webAppUrl, {
    action: 'refresh',
    token,
  });
  const ds = data.dataset || {};
  return {
    students: Array.isArray(ds.students) ? ds.students : [],
    groups: Array.isArray(ds.groups) ? ds.groups : [],
    attendance: Array.isArray(ds.attendance) ? ds.attendance : [],
    testScores: Array.isArray(ds.testScores) ? ds.testScores : [],
    syllabus: Array.isArray(ds.syllabus) ? ds.syllabus : [],
    fees: Array.isArray(ds.fees) ? ds.fees : [],
  };
}

export async function syncAllViaSheetsBridge(
  webAppUrl: string,
  token: string,
  dataset: FullTuitionDataset
): Promise<void> {
  await callBridge(webAppUrl, {
    action: 'syncAll',
    token,
    dataset: {
      students: dataset.students,
      groups: dataset.groups,
      attendance: dataset.attendance,
      testScores: dataset.testScores,
      syllabus: dataset.syllabus,
      fees: dataset.fees,
    },
  });
}

export function filterDatasetForStudentIds(
  dataset: {
    students: Student[];
    groups: StudentGroup[];
    attendance: AttendanceRecord[];
    testScores: TestScore[];
    syllabus: SubjectSyllabus[];
    fees: FeeRecord[];
  },
  studentIds: string[],
  userEmail: string
): FullTuitionDataset {
  const emailLower = userEmail.trim().toLowerCase();
  const idSet = new Set(studentIds);

  const matchedStudents = dataset.students.filter((s) => {
    if (idSet.size > 0) return idSet.has(s.id);
    const se = (s.email || '').toLowerCase();
    const pe = (s.parentEmail || '').toLowerCase();
    return se.includes(emailLower) || pe.includes(emailLower);
  });

  const allowedIds = new Set(matchedStudents.map((s) => s.id));

  return {
    students: matchedStudents,
    groups: dataset.groups.filter((g) => g.studentIds.some((sid) => allowedIds.has(sid))),
    attendance: dataset.attendance.filter((a) => allowedIds.has(a.studentId)),
    testScores: dataset.testScores.filter((t) => allowedIds.has(t.studentId)),
    syllabus: dataset.syllabus,
    fees: dataset.fees.filter((f) => allowedIds.has(f.studentId)),
  };
}

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * Sir Ali Preparations - Google Sheets Login & Database Bridge
 * 1. Open your Google Sheet -> Extensions -> Apps Script
 * 2. Paste this entire code and Save
 * 3. Run "setupTabs" once (or Deploy directly)
 * 4. Click Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL and paste it in the Portal's Google Sheets DB tab
 */

var HEADERS = {
  LoginAccess: ['Email', 'Password', 'Role', 'Student ID', 'Student Name', 'Status'],
  Students: ['ID', 'Roll No', 'Full Name', 'Phone', 'Parent Name', 'Parent Phone', 'Email', 'Grade', 'Board', 'Tuition Mode', 'Time Slot', 'Subjects', 'Monthly Fee', 'Fee Due Day', 'Joining Date', 'Address / Meeting Link', 'Notes', 'Is Active', 'Parent Email'],
  Groups: ['ID', 'Batch Name', 'Grade', 'Subject', 'Tuition Mode', 'Time Slot', 'Monthly Fee Per Student', 'Enrolled Student IDs', 'Meeting Link / Location', 'Created At'],
  Attendance: ['ID', 'Date', 'Student ID', 'Status', 'Topic Covered', 'Remarks'],
  TestScores: ['ID', 'Student ID', 'Subject', 'Test Title', 'Test Date', 'Max Marks', 'Obtained Marks', 'Percentage', 'Grade', 'Remarks'],
  Syllabus: ['ID', 'Subject', 'Grade', 'Chapters JSON'],
  Fees: ['ID', 'Student ID', 'Month', 'Year', 'Total Fee', 'Discount', 'Paid Amount', 'Due Amount', 'Status', 'Due Date', 'Paid Date', 'Payment Method', 'Receipt No', 'Remarks']
};

function setupTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[name]);
      sheet.setFrozenRows(1);
      if (name === 'LoginAccess') {
        sheet.appendRow(['2331975ali@gmail.com', 'CHANGE_THIS_PASSWORD', 'admin', 'ALL', 'Sir Ali (Admin)', 'active']);
      }
    }
  });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonOut({ ok: true, service: 'Sir Ali Preparations Google Sheets Auth Bridge' });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      setupTabs();
      var loginSheet = ss.getSheetByName('LoginAccess');
      var count = Math.max(0, loginSheet.getLastRow() - 1);
      return jsonOut({
        ok: true,
        sheetTitle: ss.getName(),
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        loginCount: count
      });
    }

    if (action === 'login') {
      setupTabs();
      var email = String(body.email || '').trim().toLowerCase();
      var password = String(body.password || '');
      if (!email || !password) {
        return jsonOut({ ok: false, error: 'Email and password are required.' });
      }

      var loginSheet = ss.getSheetByName('LoginAccess');
      var rows = loginSheet.getDataRange().getValues();
      var matched = null;
      for (var i = 1; i < rows.length; i++) {
        var rEmail = String(rows[i][0] || '').trim().toLowerCase();
        var rPass = String(rows[i][1] || '');
        var rRole = String(rows[i][2] || 'student').trim().toLowerCase();
        var rStudentId = String(rows[i][3] || '').trim();
        var rStudentName = String(rows[i][4] || '').trim();
        var rStatus = String(rows[i][5] || 'active').trim().toLowerCase();

        if (rEmail && rEmail === email && rPass === password) {
          matched = {
            email: rEmail,
            role: rRole === 'admin' ? 'admin' : (rRole === 'parent' ? 'parent' : 'student'),
            studentId: rStudentId,
            name: rStudentName || (rRole === 'admin' ? 'Sir Ali (Admin)' : rEmail),
            status: rStatus
          };
          break;
        }
      }

      if (!matched) {
        return jsonOut({ ok: false, error: 'Email ID or password does not match the LoginAccess sheet.' });
      }
      if (matched.status === 'disabled' || matched.status === 'inactive' || matched.status === 'false') {
        return jsonOut({ ok: false, error: 'This account is currently disabled in Google Sheets.' });
      }

      var fullDataset = readFullDataset(ss);
      var resolvedStudentIds = [];
      if (matched.role !== 'admin') {
        if (matched.studentId && matched.studentId.toUpperCase() !== 'AUTO' && matched.studentId.toUpperCase() !== 'ALL') {
          resolvedStudentIds = matched.studentId.split(/[,;\\s]+/).filter(Boolean);
        } else {
          fullDataset.students.forEach(function(st) {
            var se = String(st.email || '').toLowerCase();
            var pe = String(st.parentEmail || '').toLowerCase();
            if (se.indexOf(matched.email) !== -1 || pe.indexOf(matched.email) !== -1) {
              resolvedStudentIds.push(st.id);
            }
          });
        }
      }

      var token = Utilities.getUuid();
      CacheService.getScriptCache().put('tok_' + token, JSON.stringify({
        email: matched.email,
        role: matched.role,
        studentIds: resolvedStudentIds
      }), 21600);

      var scopedDataset = matched.role === 'admin'
        ? fullDataset
        : filterDataset(fullDataset, resolvedStudentIds);

      return jsonOut({
        ok: true,
        token: token,
        user: {
          email: matched.email,
          name: matched.name,
          role: matched.role,
          studentIds: resolvedStudentIds
        },
        dataset: scopedDataset,
        sheetMeta: {
          spreadsheetId: ss.getId(),
          spreadsheetTitle: ss.getName(),
          spreadsheetUrl: ss.getUrl()
        }
      });
    }

    var token = String(body.token || '');
    var sessionRaw = token ? CacheService.getScriptCache().get('tok_' + token) : null;
    if (!sessionRaw) {
      return jsonOut({ ok: false, error: 'Session expired. Please sign in again.' });
    }
    var session = JSON.parse(sessionRaw);

    if (action === 'refresh') {
      var ds = readFullDataset(ss);
      var out = session.role === 'admin' ? ds : filterDataset(ds, session.studentIds || []);
      return jsonOut({ ok: true, dataset: out });
    }

    if (action === 'syncAll') {
      if (session.role !== 'admin') {
        return jsonOut({ ok: false, error: 'Only Admin accounts can update Google Sheets.' });
      }
      writeDataset(ss, body.dataset || {});
      return jsonOut({ ok: true });
    }

    return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function getTabRows(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getDataRange().getValues().slice(1);
}

function readFullDataset(ss) {
  var students = getTabRows(ss, 'Students').filter(function(r) { return r[0] && r[2]; }).map(function(r) {
    return {
      id: String(r[0]),
      rollNo: String(r[1] || 'SAP-001'),
      name: String(r[2]),
      phone: String(r[3] || ''),
      parentName: String(r[4] || 'Parent'),
      parentPhone: String(r[5] || ''),
      email: r[6] ? String(r[6]) : undefined,
      grade: String(r[7] || '9th / IX'),
      board: String(r[8] || 'Federal Board'),
      tuitionMode: r[9] === 'online' ? 'online' : 'home',
      timeSlot: String(r[10] || ''),
      subjects: r[11] ? String(r[11]).split(',').map(function(x) { return x.trim(); }).filter(Boolean) : ['General'],
      monthlyFee: Number(r[12]) || 0,
      feeDueDay: Number(r[13]) || 5,
      joiningDate: String(r[14] || ''),
      addressOrLocation: r[15] ? String(r[15]) : undefined,
      notes: r[16] ? String(r[16]) : undefined,
      isActive: String(r[17]).toUpperCase() !== 'FALSE',
      parentEmail: r[18] ? String(r[18]).trim() : undefined
    };
  });

  var groups = getTabRows(ss, 'Groups').filter(function(r) { return r[0] && r[1]; }).map(function(r) {
    return {
      id: String(r[0]),
      name: String(r[1]),
      grade: String(r[2] || ''),
      subject: String(r[3] || ''),
      tuitionMode: r[4] === 'online' ? 'online' : 'home',
      timeSlot: String(r[5] || ''),
      monthlyFeePerStudent: Number(r[6]) || 0,
      studentIds: r[7] ? String(r[7]).split(',').map(function(x) { return x.trim(); }).filter(Boolean) : [],
      meetingLinkOrLocation: r[8] ? String(r[8]) : undefined,
      createdAt: String(r[9] || '')
    };
  });

  var attendance = getTabRows(ss, 'Attendance').filter(function(r) { return r[0] && r[1] && r[2]; }).map(function(r) {
    return {
      id: String(r[0]),
      date: formatSheetDate(r[1]),
      studentId: String(r[2]),
      status: String(r[3] || 'present'),
      topicCovered: r[4] ? String(r[4]) : undefined,
      remarks: r[5] ? String(r[5]) : undefined
    };
  });

  var testScores = getTabRows(ss, 'TestScores').filter(function(r) { return r[0] && r[1]; }).map(function(r) {
    return {
      id: String(r[0]),
      studentId: String(r[1]),
      subject: String(r[2] || 'Physics'),
      testTitle: String(r[3] || 'Test'),
      testDate: formatSheetDate(r[4]),
      maxMarks: Number(r[5]) || 100,
      obtainedMarks: Number(r[6]) || 0,
      percentage: Number(r[7]) || 0,
      grade: String(r[8] || 'A'),
      remarks: r[9] ? String(r[9]) : undefined
    };
  });

  var syllabus = getTabRows(ss, 'Syllabus').filter(function(r) { return r[0] && r[1]; }).map(function(r) {
    var chapters = [];
    try { if (r[3]) chapters = JSON.parse(r[3]); } catch (e) {}
    return { id: String(r[0]), subject: String(r[1]), grade: String(r[2] || ''), chapters: chapters };
  });

  var fees = getTabRows(ss, 'Fees').filter(function(r) { return r[0] && r[1]; }).map(function(r) {
    return {
      id: String(r[0]),
      studentId: String(r[1]),
      month: String(r[2] || ''),
      year: Number(r[3]) || 2026,
      totalFee: Number(r[4]) || 0,
      discount: Number(r[5]) || 0,
      paidAmount: Number(r[6]) || 0,
      dueAmount: Number(r[7]) || 0,
      status: String(r[8] || 'pending'),
      dueDate: formatSheetDate(r[9]),
      paidDate: r[10] ? formatSheetDate(r[10]) : undefined,
      paymentMethod: r[11] ? String(r[11]) : undefined,
      receiptNo: r[12] ? String(r[12]) : undefined,
      remarks: r[13] ? String(r[13]) : undefined
    };
  });

  return { students: students, groups: groups, attendance: attendance, testScores: testScores, syllabus: syllabus, fees: fees };
}

function formatSheetDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '');
}

function filterDataset(ds, studentIds) {
  var map = {};
  (studentIds || []).forEach(function(id) { map[id] = true; });
  return {
    students: ds.students.filter(function(s) { return map[s.id]; }),
    groups: ds.groups.filter(function(g) { return g.studentIds.some(function(id) { return map[id]; }); }),
    attendance: ds.attendance.filter(function(a) { return map[a.studentId]; }),
    testScores: ds.testScores.filter(function(t) { return map[t.studentId]; }),
    syllabus: ds.syllabus,
    fees: ds.fees.filter(function(f) { return map[f.studentId]; })
  };
}

function writeTab(ss, name, headers, rows) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  var values = [headers].concat(rows);
  sh.getRange(1, 1, values.length, headers.length).setValues(values);
  sh.setFrozenRows(1);
}

function writeDataset(ss, ds) {
  writeTab(ss, 'Students', HEADERS.Students, (ds.students || []).map(function(s) {
    return [s.id, s.rollNo, s.name, s.phone || '', s.parentName || '', s.parentPhone || '', s.email || '', s.grade || '', s.board || '', s.tuitionMode || 'home', s.timeSlot || '', (s.subjects || []).join(', '), s.monthlyFee || 0, s.feeDueDay || 5, s.joiningDate || '', s.addressOrLocation || '', s.notes || '', s.isActive !== false ? 'TRUE' : 'FALSE', s.parentEmail || ''];
  }));
  writeTab(ss, 'Groups', HEADERS.Groups, (ds.groups || []).map(function(g) {
    return [g.id, g.name, g.grade || '', g.subject || '', g.tuitionMode || 'home', g.timeSlot || '', g.monthlyFeePerStudent || 0, (g.studentIds || []).join(','), g.meetingLinkOrLocation || '', g.createdAt || ''];
  }));
  writeTab(ss, 'Attendance', HEADERS.Attendance, (ds.attendance || []).map(function(a) {
    return [a.id, a.date, a.studentId, a.status, a.topicCovered || '', a.remarks || ''];
  }));
  writeTab(ss, 'TestScores', HEADERS.TestScores, (ds.testScores || []).map(function(t) {
    return [t.id, t.studentId, t.subject, t.testTitle, t.testDate, t.maxMarks, t.obtainedMarks, t.percentage, t.grade, t.remarks || ''];
  }));
  writeTab(ss, 'Syllabus', HEADERS.Syllabus, (ds.syllabus || []).map(function(s) {
    return [s.id, s.subject, s.grade, JSON.stringify(s.chapters || [])];
  }));
  writeTab(ss, 'Fees', HEADERS.Fees, (ds.fees || []).map(function(f) {
    return [f.id, f.studentId, f.month, f.year, f.totalFee, f.discount, f.paidAmount, f.dueAmount, f.status, f.dueDate, f.paidDate || '', f.paymentMethod || '', f.receiptNo || '', f.remarks || ''];
  }));
}
`;

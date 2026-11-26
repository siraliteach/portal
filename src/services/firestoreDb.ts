import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { activeFirebaseConfig } from './firebaseConfig';
import { app, auth } from './googleAuth';
import {
  Student,
  StudentGroup,
  AttendanceRecord,
  TestScore,
  SubjectSyllabus,
  FeeRecord,
  PortalAccessEntry,
  PortalRole,
} from '../types';

// Pass firestoreDatabaseId when targeting the Enterprise Firestore instance; omit for default DB
export const db = activeFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, activeFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const BOOTSTRAPPED_ADMIN_EMAIL = '2331975ali@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Boot-time Firestore connectivity validation
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore client is offline.');
    }
  }
}

/**
 * Ensure document IDs strictly comply with ^[a-zA-Z0-9_\-]+$
 */
export function sanitizeFirestoreId(rawId: string, fallbackPrefix = 'doc'): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
}

/**
 * Parse and normalize all allowed login emails for a student (supports comma-separated lists in email & parentEmail)
 */
export function extractStudentAllowedEmails(student: Student): string[] {
  const rawParts: string[] = [];
  if (student.email) {
    rawParts.push(...student.email.split(/[,;\s]+/));
  }
  if (student.parentEmail) {
    rawParts.push(...student.parentEmail.split(/[,;\s]+/));
  }
  const normalized = rawParts
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length >= 3 && e.length <= 200 && e.includes('@'));
  return Array.from(new Set(normalized)).slice(0, 10);
}

/**
 * Build a map of studentId -> allowedEmails[]
 */
export function buildStudentEmailMap(students: Student[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  students.forEach((st) => {
    map[sanitizeFirestoreId(st.id, 'std')] = extractStudentAllowedEmails(st);
  });
  return map;
}

/**
 * Remove undefined and null fields deeply so Firestore writes never fail schema string/map checks
 */
function stripNullish<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      out[k] = v
        .filter((item) => item !== undefined && item !== null)
        .map((item) =>
          item && typeof item === 'object' && !(item instanceof Date) ? stripNullish(item) : item
        );
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      out[k] = stripNullish(v);
    } else {
      out[k] = v;
    }
  });
  return out;
}

function cleanStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') {
    if (val === undefined || val === null) return fallback.slice(0, maxLen);
    return String(val).slice(0, maxLen);
  }
  return val.slice(0, maxLen);
}

function cleanNonEmptyStr(val: unknown, maxLen: number, fallback: string): string {
  const s = cleanStr(val, maxLen).trim();
  return s.length > 0 ? s : fallback.slice(0, maxLen);
}

function cleanOptionalStr(val: unknown, maxLen: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).slice(0, maxLen);
  return s;
}

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function toFirestoreStudent(st: Student, id: string, allowedEmails: string[]): Record<string, any> {
  const docData: Record<string, any> = {
    id,
    rollNo: cleanNonEmptyStr(st.rollNo, 40, id),
    name: cleanNonEmptyStr(st.name, 120, 'Student'),
    phone: cleanStr(st.phone, 40, ''),
    parentName: cleanStr(st.parentName, 120, 'Parent'),
    parentPhone: cleanStr(st.parentPhone, 40, ''),
    allowedEmails: allowedEmails.slice(0, 10),
    grade: cleanNonEmptyStr(st.grade, 80, 'General'),
    board: cleanNonEmptyStr(st.board, 80, 'Cambridge - CAIE'),
    tuitionMode: st.tuitionMode === 'online' ? 'online' : 'home',
    timeSlot: cleanStr(st.timeSlot, 120, 'Flexible Time'),
    subjects: Array.isArray(st.subjects)
      ? st.subjects.map((s) => cleanStr(s, 100)).filter(Boolean).slice(0, 20)
      : ['General'],
    monthlyFee: clampNum(st.monthlyFee, 0, 1000000, 0),
    feeDueDay: Math.round(clampNum(st.feeDueDay, 1, 31, 5)),
    joiningDate: cleanStr(st.joiningDate, 30, new Date().toISOString().slice(0, 10)),
    isActive: st.isActive !== false,
    updatedAt: serverTimestamp(),
  };

  const email = cleanOptionalStr(st.email, 200);
  if (email !== undefined) docData.email = email;
  const parentEmail = cleanOptionalStr(st.parentEmail, 200);
  if (parentEmail !== undefined) docData.parentEmail = parentEmail;
  const addressOrLocation = cleanOptionalStr(st.addressOrLocation, 300);
  if (addressOrLocation !== undefined) docData.addressOrLocation = addressOrLocation;
  const avatarBg = cleanOptionalStr(st.avatarBg, 40);
  if (avatarBg !== undefined) docData.avatarBg = avatarBg;
  const notes = cleanOptionalStr(st.notes, 1000);
  if (notes !== undefined) docData.notes = notes;
  const groupId = cleanOptionalStr(st.groupId, 128);
  if (groupId !== undefined) docData.groupId = groupId;
  const groupName = cleanOptionalStr(st.groupName, 120);
  if (groupName !== undefined) docData.groupName = groupName;
  if (st.syllabusProgress && typeof st.syllabusProgress === 'object' && !Array.isArray(st.syllabusProgress)) {
    docData.syllabusProgress = stripNullish(st.syllabusProgress);
  }

  return docData;
}

function toFirestoreGroup(g: StudentGroup, id: string, groupStudentIds: string[], groupEmails: string[]): Record<string, any> {
  const docData: Record<string, any> = {
    id,
    name: cleanNonEmptyStr(g.name, 140, 'Tuition Group'),
    grade: cleanStr(g.grade, 80, ''),
    subject: cleanStr(g.subject, 140, ''),
    tuitionMode: g.tuitionMode === 'online' ? 'online' : 'home',
    timeSlot: cleanStr(g.timeSlot, 120, ''),
    monthlyFeePerStudent: clampNum(g.monthlyFeePerStudent, 0, 1000000, 0),
    studentIds: groupStudentIds.slice(0, 100),
    allowedEmails: groupEmails.slice(0, 200),
    createdAt: cleanStr(g.createdAt, 40, new Date().toISOString().slice(0, 10)),
    updatedAt: serverTimestamp(),
  };

  const description = cleanOptionalStr(g.description, 500);
  if (description !== undefined) docData.description = description;
  const avatarBg = cleanOptionalStr(g.avatarBg, 40);
  if (avatarBg !== undefined) docData.avatarBg = avatarBg;
  const meetingLinkOrLocation = cleanOptionalStr(g.meetingLinkOrLocation, 300);
  if (meetingLinkOrLocation !== undefined) docData.meetingLinkOrLocation = meetingLinkOrLocation;

  return docData;
}

function toFirestoreAttendance(a: AttendanceRecord, id: string, studentId: string, allowedEmails: string[]): Record<string, any> {
  const validStatuses = ['present', 'absent', 'late', 'excused'] as const;
  const status = validStatuses.includes(a.status as any) ? a.status : 'present';
  const docData: Record<string, any> = {
    id,
    date: cleanNonEmptyStr(a.date, 30, new Date().toISOString().slice(0, 10)),
    studentId,
    status,
    allowedEmails: allowedEmails.slice(0, 10),
    updatedAt: serverTimestamp(),
  };

  const topicCovered = cleanOptionalStr(a.topicCovered, 300);
  if (topicCovered !== undefined) docData.topicCovered = topicCovered;
  const remarks = cleanOptionalStr(a.remarks, 500);
  if (remarks !== undefined) docData.remarks = remarks;

  return docData;
}

function toFirestoreTestScore(t: TestScore, id: string, studentId: string, allowedEmails: string[]): Record<string, any> {
  const docData: Record<string, any> = {
    id,
    studentId,
    subject: cleanNonEmptyStr(t.subject, 120, 'General'),
    testTitle: cleanNonEmptyStr(t.testTitle, 200, 'Assessment'),
    testDate: cleanNonEmptyStr(t.testDate, 30, new Date().toISOString().slice(0, 10)),
    maxMarks: clampNum(t.maxMarks, 1, 10000, 100),
    obtainedMarks: clampNum(t.obtainedMarks, 0, 10000, 0),
    percentage: clampNum(t.percentage, 0, 100, 0),
    grade: cleanNonEmptyStr(t.grade, 20, 'A'),
    allowedEmails: allowedEmails.slice(0, 10),
    updatedAt: serverTimestamp(),
  };

  const remarks = cleanOptionalStr(t.remarks, 500);
  if (remarks !== undefined) docData.remarks = remarks;

  return docData;
}

function toFirestoreSyllabus(s: SubjectSyllabus, id: string, allowedEmails: string[]): Record<string, any> {
  const chapters = Array.isArray(s.chapters)
    ? s.chapters.slice(0, 100).map((ch) => stripNullish(ch))
    : [];
  return {
    id,
    subject: cleanNonEmptyStr(s.subject, 140, 'Subject'),
    grade: cleanNonEmptyStr(s.grade, 80, 'General'),
    chapters,
    allowedEmails: allowedEmails.slice(0, 500),
    updatedAt: serverTimestamp(),
  };
}

function toFirestoreFeeRecord(f: FeeRecord, id: string, studentId: string, allowedEmails: string[]): Record<string, any> {
  const validStatuses = ['paid', 'partial', 'pending', 'overdue'] as const;
  const status = validStatuses.includes(f.status as any) ? f.status : 'pending';
  const docData: Record<string, any> = {
    id,
    studentId,
    month: cleanNonEmptyStr(f.month, 40, 'Current Month'),
    year: Math.round(clampNum(f.year, 2020, 2100, new Date().getFullYear())),
    totalFee: clampNum(f.totalFee, 0, 1000000, 0),
    discount: clampNum(f.discount, 0, 1000000, 0),
    paidAmount: clampNum(f.paidAmount, 0, 1000000, 0),
    dueAmount: clampNum(f.dueAmount, 0, 1000000, 0),
    status,
    dueDate: cleanNonEmptyStr(f.dueDate, 30, new Date().toISOString().slice(0, 10)),
    allowedEmails: allowedEmails.slice(0, 10),
    updatedAt: serverTimestamp(),
  };

  const paidDate = cleanOptionalStr(f.paidDate, 30);
  if (paidDate !== undefined) docData.paidDate = paidDate;
  const paymentMethod = cleanOptionalStr(f.paymentMethod, 40);
  if (paymentMethod !== undefined) docData.paymentMethod = paymentMethod;
  const receiptNo = cleanOptionalStr(f.receiptNo, 60);
  if (receiptNo !== undefined) docData.receiptNo = receiptNo;
  const remarks = cleanOptionalStr(f.remarks, 500);
  if (remarks !== undefined) docData.remarks = remarks;

  return docData;
}

/**
 * Resolve signed-in user's role: 'admin', 'student_parent', or 'unauthorized'.
 */
export async function resolveUserPortalRole(user: User): Promise<{
  role: PortalRole;
  accessEntries: PortalAccessEntry[];
}> {
  const rawEmail = user.email || user.providerData?.find((p) => p.email)?.email || '';
  const emailLower = rawEmail.trim().toLowerCase();
  const isGoogleUser = user.providerData?.some((p) => p.providerId === 'google.com');

  if (!emailLower || (!user.emailVerified && !isGoogleUser)) {
    return { role: 'unauthorized', accessEntries: [] };
  }

  if (emailLower === BOOTSTRAPPED_ADMIN_EMAIL) {
    // Ensure admin doc exists for traceability
    try {
      const adminRef = doc(db, 'admins', sanitizeFirestoreId(user.uid, 'admin'));
      await setDoc(adminRef, {
        uid: sanitizeFirestoreId(user.uid, 'admin'),
        email: emailLower,
        displayName: (user.displayName || 'Sir Ali').slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      // Non-fatal if admin doc check fails temporarily
      console.warn('Could not upsert admin profile:', e);
    }
    return { role: 'admin', accessEntries: [] };
  }

  // Check admins collection
  try {
    const adminDocRef = doc(db, 'admins', sanitizeFirestoreId(user.uid, 'admin'));
    const adminSnap = await getDoc(adminDocRef);
    if (adminSnap.exists()) {
      return { role: 'admin', accessEntries: [] };
    }
  } catch {
    // Not an admin, continue to portal_access check
  }

  // Query portal_access strictly filtered by user's own lowercase verified email
  const accessPath = 'portal_access';
  try {
    const q = query(collection(db, accessPath), where('email', '==', emailLower));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const entries: PortalAccessEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id || d.id),
          email: String(data.email || emailLower),
          studentId: String(data.studentId || ''),
          studentName: String(data.studentName || ''),
          role: data.role === 'parent' ? 'parent' : 'student',
        };
      });
      return { role: 'student_parent', accessEntries: entries };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, accessPath);
  }

  return { role: 'unauthorized', accessEntries: [] };
}

/**
 * Helper to commit Firestore batch writes in safe chunks of <= 400 operations
 */
async function commitOperationsInChunks(
  ops: Array<{
    type: 'set' | 'delete';
    path: string;
    id: string;
    data?: Record<string, any>;
  }>
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, op.path, op.id);
      if (op.type === 'delete') {
        batch.delete(ref);
      } else if (op.data) {
        batch.set(ref, op.data);
      }
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, chunk[0]?.path || 'batch');
    }
  }
}

/**
 * Build portal_access documents for a single student
 */
function buildPortalAccessOpsForStudent(student: Student): Array<{
  id: string;
  email: string;
  studentId: string;
  studentName: string;
  role: 'student' | 'parent';
}> {
  const studentId = sanitizeFirestoreId(student.id, 'std');
  const studentEmails = (student.email || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length >= 3 && e.length <= 200 && e.includes('@'));
  const parentEmails = (student.parentEmail || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length >= 3 && e.length <= 200 && e.includes('@'));

  const seen = new Set<string>();
  const entries: Array<{
    id: string;
    email: string;
    studentId: string;
    studentName: string;
    role: 'student' | 'parent';
  }> = [];

  studentEmails.forEach((email) => {
    if (!seen.has(email) && entries.length < 10) {
      seen.add(email);
      entries.push({
        id: sanitizeFirestoreId(`pa-${studentId}-${entries.length}`, 'pa'),
        email,
        studentId,
        studentName: (student.name || 'Student').slice(0, 120),
        role: 'student',
      });
    }
  });

  parentEmails.forEach((email) => {
    if (!seen.has(email) && entries.length < 10) {
      seen.add(email);
      entries.push({
        id: sanitizeFirestoreId(`pa-${studentId}-${entries.length}`, 'pa'),
        email,
        studentId,
        studentName: (student.name || 'Student').slice(0, 120),
        role: 'parent',
      });
    }
  });

  return entries;
}

/**
 * Full dataset sync to Firestore (used on initial bootstrap, Google Sheets pull, or full restore).
 */
export async function syncFullDatasetToFirestore(dataset: {
  students: Student[];
  groups: StudentGroup[];
  attendance: AttendanceRecord[];
  testScores: TestScore[];
  syllabus: SubjectSyllabus[];
  fees: FeeRecord[];
}): Promise<void> {
  const emailMap = buildStudentEmailMap(dataset.students);
  const allActiveEmails = Array.from(new Set(Object.values(emailMap).flat())).slice(0, 500);

  const ops: Array<{
    type: 'set' | 'delete';
    path: string;
    id: string;
    data?: Record<string, any>;
  }> = [];

  // Fetch existing portal_access docs to clean up stale entries
  try {
    const existingAccessSnap = await getDocs(collection(db, 'portal_access'));
    const nextAccessIds = new Set<string>();

    dataset.students.forEach((st) => {
      const entries = buildPortalAccessOpsForStudent(st);
      entries.forEach((entry) => {
        nextAccessIds.add(entry.id);
        ops.push({
          type: 'set',
          path: 'portal_access',
          id: entry.id,
          data: {
            ...entry,
            updatedAt: serverTimestamp(),
          },
        });
      });
    });

    existingAccessSnap.docs.forEach((d) => {
      if (!nextAccessIds.has(d.id)) {
        ops.push({ type: 'delete', path: 'portal_access', id: d.id });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'portal_access');
  }

  // Students
  dataset.students.forEach((st) => {
    const id = sanitizeFirestoreId(st.id, 'std');
    const allowedEmails = emailMap[id] || [];
    ops.push({
      type: 'set',
      path: 'students',
      id,
      data: toFirestoreStudent(st, id, allowedEmails),
    });
  });

  // Groups
  dataset.groups.forEach((g) => {
    const id = sanitizeFirestoreId(g.id, 'grp');
    const groupStudentIds = (g.studentIds || []).map((sid) => sanitizeFirestoreId(sid, 'std')).slice(0, 100);
    const groupEmails = Array.from(
      new Set(groupStudentIds.flatMap((sid) => emailMap[sid] || []))
    ).slice(0, 200);
    ops.push({
      type: 'set',
      path: 'groups',
      id,
      data: toFirestoreGroup(g, id, groupStudentIds, groupEmails),
    });
  });

  // Attendance
  dataset.attendance.forEach((a) => {
    const id = sanitizeFirestoreId(a.id, 'att');
    const studentId = sanitizeFirestoreId(a.studentId, 'std');
    ops.push({
      type: 'set',
      path: 'attendance',
      id,
      data: toFirestoreAttendance(a, id, studentId, emailMap[studentId] || []),
    });
  });

  // Test Scores
  dataset.testScores.forEach((t) => {
    const id = sanitizeFirestoreId(t.id, 'test');
    const studentId = sanitizeFirestoreId(t.studentId, 'std');
    ops.push({
      type: 'set',
      path: 'testScores',
      id,
      data: toFirestoreTestScore(t, id, studentId, emailMap[studentId] || []),
    });
  });

  // Syllabus
  dataset.syllabus.forEach((s) => {
    const id = sanitizeFirestoreId(s.id, 'syl');
    ops.push({
      type: 'set',
      path: 'syllabus',
      id,
      data: toFirestoreSyllabus(s, id, allActiveEmails),
    });
  });

  // Fees
  dataset.fees.forEach((f) => {
    const id = sanitizeFirestoreId(f.id, 'fee');
    const studentId = sanitizeFirestoreId(f.studentId, 'std');
    ops.push({
      type: 'set',
      path: 'fees',
      id,
      data: toFirestoreFeeRecord(f, id, studentId, emailMap[studentId] || []),
    });
  });

  await commitOperationsInChunks(ops);
}

/**
 * Bootstrap Firestore from local data if Firestore `students` collection is currently empty.
 */
export async function bootstrapFirestoreIfEmpty(localDataset: {
  students: Student[];
  groups: StudentGroup[];
  attendance: AttendanceRecord[];
  testScores: TestScore[];
  syllabus: SubjectSyllabus[];
  fees: FeeRecord[];
}): Promise<boolean> {
  try {
    const existingSnap = await getDocs(collection(db, 'students'));
    if (existingSnap.empty && localDataset.students.length > 0) {
      await syncFullDatasetToFirestore(localDataset);
      return true;
    }
    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }
}

/**
 * Save/update a student and refresh their portal_access & related records' allowedEmails.
 */
export async function saveStudentToFirestore(
  student: Student,
  allStudents: Student[],
  relatedData: {
    groups: StudentGroup[];
    attendance: AttendanceRecord[];
    testScores: TestScore[];
    syllabus: SubjectSyllabus[];
    fees: FeeRecord[];
  }
): Promise<void> {
  const id = sanitizeFirestoreId(student.id, 'std');
  const allowedEmails = extractStudentAllowedEmails(student);
  const ops: Array<{
    type: 'set' | 'delete';
    path: string;
    id: string;
    data?: Record<string, any>;
  }> = [];

  // 1. Update Student document
  ops.push({
    type: 'set',
    path: 'students',
    id,
    data: toFirestoreStudent(student, id, allowedEmails),
  });

  // 2. Sync portal_access entries for this student
  try {
    const existingPA = await getDocs(
      query(collection(db, 'portal_access'), where('studentId', '==', id))
    );
    const nextEntries = buildPortalAccessOpsForStudent({ ...student, id });
    const nextIds = new Set(nextEntries.map((e) => e.id));

    nextEntries.forEach((entry) => {
      ops.push({
        type: 'set',
        path: 'portal_access',
        id: entry.id,
        data: { ...entry, updatedAt: serverTimestamp() },
      });
    });

    existingPA.docs.forEach((d) => {
      if (!nextIds.has(d.id)) {
        ops.push({ type: 'delete', path: 'portal_access', id: d.id });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'portal_access');
  }

  // 3. Propagate updated allowedEmails to this student's attendance, testScores, fees
  relatedData.attendance
    .filter((a) => sanitizeFirestoreId(a.studentId, 'std') === id)
    .forEach((a) => {
      const attId = sanitizeFirestoreId(a.id, 'att');
      ops.push({
        type: 'set',
        path: 'attendance',
        id: attId,
        data: toFirestoreAttendance(a, attId, id, allowedEmails),
      });
    });

  relatedData.testScores
    .filter((t) => sanitizeFirestoreId(t.studentId, 'std') === id)
    .forEach((t) => {
      const testId = sanitizeFirestoreId(t.id, 'test');
      ops.push({
        type: 'set',
        path: 'testScores',
        id: testId,
        data: toFirestoreTestScore(t, testId, id, allowedEmails),
      });
    });

  relatedData.fees
    .filter((f) => sanitizeFirestoreId(f.studentId, 'std') === id)
    .forEach((f) => {
      const feeId = sanitizeFirestoreId(f.id, 'fee');
      ops.push({
        type: 'set',
        path: 'fees',
        id: feeId,
        data: toFirestoreFeeRecord(f, feeId, id, allowedEmails),
      });
    });

  // 4. Update syllabus allowedEmails so new emails can read syllabus
  const updatedStudents = allStudents.some((s) => s.id === student.id)
    ? allStudents.map((s) => (s.id === student.id ? student : s))
    : [student, ...allStudents];
  const emailMap = buildStudentEmailMap(updatedStudents);
  const allActiveEmails = Array.from(new Set(Object.values(emailMap).flat())).slice(0, 500);

  relatedData.syllabus.forEach((s) => {
    const sylId = sanitizeFirestoreId(s.id, 'syl');
    ops.push({
      type: 'set',
      path: 'syllabus',
      id: sylId,
      data: toFirestoreSyllabus(s, sylId, allActiveEmails),
    });
  });

  // 5. Update groups allowedEmails if student belongs to any groups
  relatedData.groups
    .filter((g) => g.studentIds.includes(student.id) || g.studentIds.includes(id))
    .forEach((g) => {
      const grpId = sanitizeFirestoreId(g.id, 'grp');
      const groupStudentIds = g.studentIds.map((sid) => sanitizeFirestoreId(sid, 'std')).slice(0, 100);
      const groupEmails = Array.from(new Set(groupStudentIds.flatMap((sid) => emailMap[sid] || []))).slice(0, 200);
      ops.push({
        type: 'set',
        path: 'groups',
        id: grpId,
        data: toFirestoreGroup(g, grpId, groupStudentIds, groupEmails),
      });
    });

  await commitOperationsInChunks(ops);
}

/**
 * Delete a student and their portal_access records from Firestore.
 */
export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const id = sanitizeFirestoreId(studentId, 'std');
  const ops: Array<{ type: 'set' | 'delete'; path: string; id: string }> = [
    { type: 'delete', path: 'students', id },
  ];

  try {
    const paSnap = await getDocs(query(collection(db, 'portal_access'), where('studentId', '==', id)));
    paSnap.docs.forEach((d) => {
      ops.push({ type: 'delete', path: 'portal_access', id: d.id });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'portal_access');
  }

  await commitOperationsInChunks(ops);
}

/**
 * Save a group to Firestore
 */
export async function saveGroupToFirestore(group: StudentGroup, students: Student[]): Promise<void> {
  const id = sanitizeFirestoreId(group.id, 'grp');
  const emailMap = buildStudentEmailMap(students);
  const groupStudentIds = (group.studentIds || []).map((sid) => sanitizeFirestoreId(sid, 'std')).slice(0, 100);
  const allowedEmails = Array.from(new Set(groupStudentIds.flatMap((sid) => emailMap[sid] || []))).slice(0, 200);

  try {
    await setDoc(
      doc(db, 'groups', id),
      toFirestoreGroup(group, id, groupStudentIds, allowedEmails)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `groups/${id}`);
  }
}

export async function deleteGroupFromFirestore(groupId: string): Promise<void> {
  const id = sanitizeFirestoreId(groupId, 'grp');
  try {
    await deleteDoc(doc(db, 'groups', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `groups/${id}`);
  }
}

/**
 * Sync updated array of attendance records to Firestore
 */
export async function syncAttendanceToFirestore(
  records: AttendanceRecord[],
  students: Student[]
): Promise<void> {
  const emailMap = buildStudentEmailMap(students);
  const ops = records.map((a) => {
    const id = sanitizeFirestoreId(a.id, 'att');
    const studentId = sanitizeFirestoreId(a.studentId, 'std');
    return {
      type: 'set' as const,
      path: 'attendance',
      id,
      data: toFirestoreAttendance(a, id, studentId, emailMap[studentId] || []),
    };
  });
  await commitOperationsInChunks(ops);
}

/**
 * Save or sync test scores to Firestore
 */
export async function syncTestScoresToFirestore(
  records: TestScore[],
  students: Student[],
  deletedIds: string[] = []
): Promise<void> {
  const emailMap = buildStudentEmailMap(students);
  const ops: Array<{ type: 'set' | 'delete'; path: string; id: string; data?: Record<string, any> }> = [
    ...records.map((t) => {
      const id = sanitizeFirestoreId(t.id, 'test');
      const studentId = sanitizeFirestoreId(t.studentId, 'std');
      return {
        type: 'set' as const,
        path: 'testScores',
        id,
        data: toFirestoreTestScore(t, id, studentId, emailMap[studentId] || []),
      };
    }),
    ...deletedIds.map((delId) => ({
      type: 'delete' as const,
      path: 'testScores',
      id: sanitizeFirestoreId(delId, 'test'),
    })),
  ];
  await commitOperationsInChunks(ops);
}

/**
 * Sync syllabus list to Firestore
 */
export async function syncSyllabusToFirestore(
  syllabusList: SubjectSyllabus[],
  students: Student[]
): Promise<void> {
  const emailMap = buildStudentEmailMap(students);
  const allActiveEmails = Array.from(new Set(Object.values(emailMap).flat())).slice(0, 500);
  const ops = syllabusList.map((s) => {
    const id = sanitizeFirestoreId(s.id, 'syl');
    return {
      type: 'set' as const,
      path: 'syllabus',
      id,
      data: toFirestoreSyllabus(s, id, allActiveEmails),
    };
  });
  await commitOperationsInChunks(ops);
}

/**
 * Sync fee records to Firestore
 */
export async function syncFeesToFirestore(
  fees: FeeRecord[],
  students: Student[]
): Promise<void> {
  const emailMap = buildStudentEmailMap(students);
  const ops = fees.map((f) => {
    const id = sanitizeFirestoreId(f.id, 'fee');
    const studentId = sanitizeFirestoreId(f.studentId, 'std');
    return {
      type: 'set' as const,
      path: 'fees',
      id,
      data: toFirestoreFeeRecord(f, id, studentId, emailMap[studentId] || []),
    };
  });
  await commitOperationsInChunks(ops);
}

/**
 * Subscribe to all collections as Admin
 */
export function subscribeAdminFirestoreData(callbacks: {
  onStudents: (data: Student[]) => void;
  onGroups: (data: StudentGroup[]) => void;
  onAttendance: (data: AttendanceRecord[]) => void;
  onTestScores: (data: TestScore[]) => void;
  onSyllabus: (data: SubjectSyllabus[]) => void;
  onFees: (data: FeeRecord[]) => void;
}): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      collection(db, 'students'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onStudents(snap.docs.map((d) => d.data() as Student));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'students')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'groups'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onGroups(snap.docs.map((d) => d.data() as StudentGroup));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'groups')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'attendance'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onAttendance(snap.docs.map((d) => d.data() as AttendanceRecord));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'testScores'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onTestScores(snap.docs.map((d) => d.data() as TestScore));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'testScores')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'syllabus'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onSyllabus(snap.docs.map((d) => d.data() as SubjectSyllabus));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'syllabus')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'fees'),
      (snap) => {
        if (!snap.empty) {
          callbacks.onFees(snap.docs.map((d) => d.data() as FeeRecord));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'fees')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * Subscribe ONLY to the allowlisted student/parent's own records using array-contains security queries
 */
export function subscribeStudentParentData(
  emailLower: string,
  callbacks: {
    onStudents: (data: Student[]) => void;
    onGroups: (data: StudentGroup[]) => void;
    onAttendance: (data: AttendanceRecord[]) => void;
    onTestScores: (data: TestScore[]) => void;
    onSyllabus: (data: SubjectSyllabus[]) => void;
    onFees: (data: FeeRecord[]) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'students'), where('allowedEmails', 'array-contains', emailLower)),
      (snap) => callbacks.onStudents(snap.docs.map((d) => d.data() as Student)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'students')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'groups'), where('allowedEmails', 'array-contains', emailLower)),
      (snap) => callbacks.onGroups(snap.docs.map((d) => d.data() as StudentGroup)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'groups')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'attendance'), where('allowedEmails', 'array-contains', emailLower)),
      (snap) => callbacks.onAttendance(snap.docs.map((d) => d.data() as AttendanceRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'attendance')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'testScores'), where('allowedEmails', 'array-contains', emailLower)),
      (snap) => callbacks.onTestScores(snap.docs.map((d) => d.data() as TestScore)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'testScores')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'syllabus'), where('allowedEmails', 'array-contains', emailLower)),
      (snap) => callbacks.onSyllabus(snap.docs.map((d) => d.data() as SubjectSyllabus)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'syllabus')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'fees'), where('allowedEmails', 'array-contains', emailLower)),
      (snap) => callbacks.onFees(snap.docs.map((d) => d.data() as FeeRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'fees')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  getStoredStudents, 
  setStoredStudents, 
  getStoredAttendance, 
  setStoredAttendance, 
  getStoredTests, 
  setStoredTests, 
  getStoredSyllabus, 
  setStoredSyllabus, 
  getStoredFees, 
  setStoredFees,
  getStoredGroups,
  setStoredGroups,
  getStoredMasterPin,
  setStoredMasterPin,
  getStoredIsLocked,
  setStoredIsLocked,
  getStoredSheetsConfig,
  setStoredSheetsConfig,
  exportAllDataJSON,
  resetToInitialSampleData 
} from './utils/storage';
import { 
  Student, 
  AttendanceRecord, 
  TestScore, 
  SubjectSyllabus, 
  FeeRecord, 
  ActiveTab, 
  TuitionMode, 
  StudentGroup,
  GoogleSheetsConfig 
} from './types';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { StudentsTab } from './components/StudentsTab';
import { AttendanceTab } from './components/AttendanceTab';
import { SyllabusTab } from './components/SyllabusTab';
import { ProgressTab } from './components/ProgressTab';
import { FeesTab } from './components/FeesTab';
import { GroupsTab } from './components/GroupsTab';
import { GoogleSheetsTab } from './components/GoogleSheetsTab';
import { StudentDetailModal } from './components/StudentDetailModal';
import { AddStudentModal } from './components/AddStudentModal';
import { RecordFeeModal } from './components/RecordFeeModal';
import { AddTestModal } from './components/AddTestModal';
import { FeeReceiptModal } from './components/FeeReceiptModal';
import { ReportCardModal } from './components/ReportCardModal';
import { PinAuthModal } from './components/PinAuthModal';
import { LoginScreen } from './components/LoginScreen';
import { StudentParentPortal } from './components/StudentParentPortal';
import { getTodayDateString } from './utils/formatters';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { subscribeAuth, googleSignOut } from './services/googleAuth';
import { syncAllTablesToGoogleSheets, FullTuitionDataset } from './services/googleSheets';
import {
  testConnection,
  resolveUserPortalRole,
  bootstrapFirestoreIfEmpty,
  syncFullDatasetToFirestore,
  saveStudentToFirestore,
  deleteStudentFromFirestore,
  saveGroupToFirestore,
  deleteGroupFromFirestore,
  syncAttendanceToFirestore,
  syncTestScoresToFirestore,
  syncSyllabusToFirestore,
  syncFeesToFirestore,
  subscribeAdminFirestoreData,
  subscribeStudentParentData,
} from './services/firestoreDb';
import { PortalAccessEntry, PortalRole } from './types';

export default function App() {
  // Current system date dynamically initialized and automatically updated daily
  const [todayDate, setTodayDate] = useState<string>(() => getTodayDateString());

  useEffect(() => {
    const checkDate = () => {
      const current = getTodayDateString();
      setTodayDate(prev => (prev !== current ? current : prev));
    };

    // Check periodically every minute for midnight roll-over and on window focus/tab switch
    const interval = setInterval(checkDate, 60000);
    window.addEventListener('focus', checkDate);
    document.addEventListener('visibilitychange', checkDate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDate);
      document.removeEventListener('visibilitychange', checkDate);
    };
  }, []);

  // Core Data States with localStorage persistence
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [groups, setGroups] = useState<StudentGroup[]>(() => getStoredGroups());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => getStoredAttendance());
  const [testScores, setTestScores] = useState<TestScore[]>(() => getStoredTests());
  const [syllabus, setSyllabus] = useState<SubjectSyllabus[]>(() => getStoredSyllabus());
  const [fees, setFees] = useState<FeeRecord[]>(() => getStoredFees());

  // Security Lock & PIN State (Guards editing & deleting on GitHub Pages / Client Side)
  const [masterPin, setMasterPin] = useState<string>(() => getStoredMasterPin());
  const [isLocked, setIsLocked] = useState<boolean>(() => getStoredIsLocked());
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<'unlock' | 'change_pin'>('unlock');
  const [pinActionReason, setPinActionReason] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedModeFilter, setSelectedModeFilter] = useState<'all' | TuitionMode>('all');

  // Modal States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isRecordFeeOpen, setIsRecordFeeOpen] = useState(false);
  const [preSelectedFeeStudent, setPreSelectedFeeStudent] = useState<Student | null>(null);
  const [preSelectedFee, setPreSelectedFee] = useState<FeeRecord | null>(null);

  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [preSelectedTestStudent, setPreSelectedTestStudent] = useState<Student | null>(null);

  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [receiptFee, setReceiptFee] = useState<FeeRecord | null>(null);

  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [reportCardStudent, setReportCardStudent] = useState<Student | null>(null);

  // Custom in-app confirmation dialog (avoids browser iframe window.confirm blocking)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Sheets DB & Portal Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [portalRole, setPortalRole] = useState<PortalRole | null>(null);
  const [accessEntries, setAccessEntries] = useState<PortalAccessEntry[]>([]);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getStoredSheetsConfig());

  // Validate Firestore connection on initial boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen for Firebase Auth state & resolve Admin vs Student/Parent role + live Firestore sync
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    let cancelled = false;

    const unsubAuth = subscribeAuth(async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      setCurrentUser(user);
      setAuthReady(true);
      setAuthError(null);

      if (!user) {
        setPortalRole(null);
        setAccessEntries([]);
        setAuthChecking(false);
        return;
      }

      setAuthChecking(true);
      try {
        const resolved = await resolveUserPortalRole(user);
        if (cancelled) return;

        setPortalRole(resolved.role);
        setAccessEntries(resolved.accessEntries);

        if (resolved.role === 'admin') {
          try {
            await bootstrapFirestoreIfEmpty({
              students: getStoredStudents(),
              groups: getStoredGroups(),
              attendance: getStoredAttendance(),
              testScores: getStoredTests(),
              syllabus: getStoredSyllabus(),
              fees: getStoredFees(),
            });
          } catch (syncErr) {
            console.error('Initial Firestore bootstrap sync error:', syncErr);
            if (!cancelled) {
              setToastMessage('Signed in as Admin. Initial cloud sync will retry on next save.');
              setTimeout(() => setToastMessage(null), 4000);
            }
          }

          if (cancelled) return;

          unsubFirestore = subscribeAdminFirestoreData({
            onStudents: (data) => setStudents(data),
            onGroups: (data) => setGroups(data),
            onAttendance: (data) => setAttendance(data),
            onTestScores: (data) => setTestScores(data),
            onSyllabus: (data) => setSyllabus(data),
            onFees: (data) => setFees(data),
          });
        } else if (resolved.role === 'student_parent' && user.email) {
          unsubFirestore = subscribeStudentParentData(user.email.trim().toLowerCase(), {
            onStudents: (data) => setStudents(data),
            onGroups: (data) => setGroups(data),
            onAttendance: (data) => setAttendance(data),
            onTestScores: (data) => setTestScores(data),
            onSyllabus: (data) => setSyllabus(data),
            onFees: (data) => setFees(data),
          });
        }
      } catch (err: any) {
        console.error('Role resolution error:', err);
        if (!cancelled) {
          setPortalRole('unauthorized');
          setAuthError(err?.message || 'Unable to verify portal access with Cloud Database.');
        }
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handlePortalSignOut = async () => {
    await googleSignOut();
    setPortalRole(null);
    setAccessEntries([]);
    setCurrentUser(null);
  };

  const handleUpdateSheetsConfig = (newConfig: GoogleSheetsConfig | null) => {
    setSheetsConfig(newConfig);
    setStoredSheetsConfig(newConfig);
  };

  const handleApplyPulledData = (dataset: FullTuitionDataset) => {
    requireUnlock('Enter PIN to restore and replace database from Google Sheets', async () => {
      const nextStudents = dataset.students.length > 0 ? dataset.students : students;
      const nextGroups = dataset.groups.length > 0 ? dataset.groups : groups;
      const nextAttendance = dataset.attendance.length > 0 ? dataset.attendance : attendance;
      const nextTests = dataset.testScores.length > 0 ? dataset.testScores : testScores;
      const nextSyllabus = dataset.syllabus.length > 0 ? dataset.syllabus : syllabus;
      const nextFees = dataset.fees.length > 0 ? dataset.fees : fees;

      setStudents(nextStudents);
      setGroups(nextGroups);
      setAttendance(nextAttendance);
      setTestScores(nextTests);
      setSyllabus(nextSyllabus);
      setFees(nextFees);

      await syncFullDatasetToFirestore({
        students: nextStudents,
        groups: nextGroups,
        attendance: nextAttendance,
        testScores: nextTests,
        syllabus: nextSyllabus,
        fees: nextFees,
      });

      showToast('Master dataset & portal email allowlist synced to Cloud Database.');
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync to localStorage only for Admin
  useEffect(() => {
    if (portalRole === 'admin') setStoredStudents(students);
  }, [students, portalRole]);

  useEffect(() => {
    if (portalRole === 'admin') setStoredGroups(groups);
  }, [groups, portalRole]);

  useEffect(() => {
    if (portalRole === 'admin') setStoredAttendance(attendance);
  }, [attendance, portalRole]);

  useEffect(() => {
    if (portalRole === 'admin') setStoredTests(testScores);
  }, [testScores, portalRole]);

  useEffect(() => {
    if (portalRole === 'admin') setStoredSyllabus(syllabus);
  }, [syllabus, portalRole]);

  useEffect(() => {
    if (portalRole === 'admin') setStoredFees(fees);
  }, [fees, portalRole]);

  // Unlock check
  const requireUnlock = (reason: string, action?: () => void): boolean => {
    if (!isLocked) {
      if (action) action();
      return true;
    }
    setPinActionReason(reason);
    setPinModalMode('unlock');
    setPendingAction(() => action || null);
    setIsPinModalOpen(true);
    return false;
  };

  const handleUnlockSuccess = () => {
    setIsLocked(false);
    setStoredIsLocked(false);
    showToast('Admin Mode Unlocked! Editing & deleting enabled.');
    if (pendingAction) {
      const actionToRun = pendingAction;
      setPendingAction(null);
      actionToRun();
    }
  };

  const handleToggleLock = () => {
    if (isLocked) {
      requireUnlock('Unlock Admin Mode for full editing & deleting');
    } else {
      setIsLocked(true);
      setStoredIsLocked(true);
      showToast('Locked in View-Only Mode. Records are protected from editing.');
    }
  };

  const handleOpenChangePin = () => {
    setPinModalMode('change_pin');
    setIsPinModalOpen(true);
  };

  const handleUpdateMasterPin = (newPin: string) => {
    setMasterPin(newPin);
    setStoredMasterPin(newPin);
    setIsLocked(false);
    setStoredIsLocked(false);
    showToast('Master Security Password updated successfully! Admin Mode unlocked.');
  };

  // Student CRUD
  const handleSaveStudent = async (savedStudent: Student, assignedGroupId?: string) => {
    const exists = students.some(s => s.id === savedStudent.id);
    let updated: Student[];
    if (exists) {
      updated = students.map(s => s.id === savedStudent.id ? savedStudent : s);
      showToast(`Updated student: ${savedStudent.name}`);
    } else {
      updated = [savedStudent, ...students];
      showToast(`Enrolled new student: ${savedStudent.name}`);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      } catch (e) {
        // Safe fallback
      }
    }
    setStudents(updated);

    // Sync group membership if assigned
    let nextGroups = groups;
    if (assignedGroupId) {
      nextGroups = groups.map(g => {
        if (g.id === assignedGroupId) {
          if (!g.studentIds.includes(savedStudent.id)) {
            return { ...g, studentIds: [...g.studentIds, savedStudent.id] };
          }
          return g;
        } else {
          return { ...g, studentIds: g.studentIds.filter(id => id !== savedStudent.id) };
        }
      });
      setGroups(nextGroups);
    }

    await saveStudentToFirestore(savedStudent, updated, {
      groups: nextGroups,
      attendance,
      testScores,
      syllabus,
      fees,
    });
  };

  const handleUpdateStudentsList = async (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    const changed = updatedStudents.filter((st) => {
      const prev = students.find((p) => p.id === st.id);
      return !prev || JSON.stringify(prev) !== JSON.stringify(st);
    });
    for (const st of changed) {
      await saveStudentToFirestore(st, updatedStudents, {
        groups,
        attendance,
        testScores,
        syllabus,
        fees,
      });
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    requireUnlock(`Enter PIN to delete student: ${student.name}`, () => {
      setConfirmDialog({
        isOpen: true,
        title: 'Remove Student',
        message: `Are you sure you want to permanently remove ${student.name} from Sir Ali Preparations?`,
        onConfirm: async () => {
          const nextStudents = students.filter(s => s.id !== studentId);
          const nextGroups = groups.map(g => ({
            ...g,
            studentIds: g.studentIds.filter(id => id !== studentId)
          }));
          setStudents(nextStudents);
          setGroups(nextGroups);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          await deleteStudentFromFirestore(studentId);
          for (const g of nextGroups) {
            if (groups.find(orig => orig.id === g.id)?.studentIds.includes(studentId)) {
              await saveGroupToFirestore(g, nextStudents);
            }
          }
          showToast(`Removed ${student.name} from active roster.`);
        }
      });
    });
  };

  const handleEditStudent = (student: Student) => {
    requireUnlock(`Enter PIN to edit profile for ${student.name}`, () => {
      setStudentToEdit(student);
      setIsAddStudentOpen(true);
      setSelectedDetailStudent(null);
    });
  };

  // Group Management Handlers
  const handleSaveGroup = (group: StudentGroup) => {
    requireUnlock('Enter PIN to create/edit group batch', async () => {
      setGroups(prev => {
        const idx = prev.findIndex(g => g.id === group.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = group;
          return clone;
        }
        return [...prev, group];
      });
      await saveGroupToFirestore(group, students);
      showToast(`Saved Group Batch: ${group.name}`);
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    requireUnlock('Enter PIN to delete group batch', async () => {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      await deleteGroupFromFirestore(groupId);
      showToast('Group batch removed.');
    });
  };

  const handleAssignStudentsToGroup = (groupId: string, studentIds: string[]) => {
    requireUnlock('Enter PIN to assign students to group', async () => {
      let updatedGroup: StudentGroup | null = null;
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          const set = new Set([...g.studentIds, ...studentIds]);
          updatedGroup = { ...g, studentIds: Array.from(set) };
          return updatedGroup;
        }
        return g;
      }));
      if (updatedGroup) {
        await saveGroupToFirestore(updatedGroup, students);
      }
      showToast(`Assigned ${studentIds.length} student(s) to group.`);
    });
  };

  const handleGroupBatchAttendance = (groupId: string, status: 'present' | 'absent', date: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || group.studentIds.length === 0) return;

    requireUnlock(`Enter PIN to mark 1-Click attendance for ${group.name}`, async () => {
      const updated = [...attendance];
      group.studentIds.forEach(stId => {
        const idx = updated.findIndex(a => a.studentId === stId && a.date === date);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], status };
        } else {
          updated.push({
            id: `att-${Date.now()}-${stId}`,
            studentId: stId,
            date,
            status,
          });
        }
      });
      setAttendance(updated);
      await syncAttendanceToFirestore(updated, students);
      showToast(`1-Click Attendance logged: Marked ${group.studentIds.length} students as ${status.toUpperCase()}`);
    });
  };

  const handleGroupBatchFee = (groupId: string, month: string, amount: number, dueDate: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || group.studentIds.length === 0) return;

    requireUnlock(`Enter PIN to generate 1-Click fee bills for ${group.name}`, async () => {
      const newFees = [...fees];
      group.studentIds.forEach(stId => {
        const existing = newFees.find(f => f.studentId === stId && f.month === month);
        if (!existing) {
          const feeAmt = amount > 0 ? amount : (students.find(s => s.id === stId)?.monthlyFee || 15000);
          newFees.push({
            id: `fee-${Date.now()}-${stId}`,
            studentId: stId,
            month,
            year: new Date().getFullYear(),
            totalFee: feeAmt,
            discount: 0,
            paidAmount: 0,
            dueAmount: feeAmt,
            dueDate,
            status: 'pending',
          });
        }
      });
      setFees(newFees);
      await syncFeesToFirestore(newFees, students);
      showToast(`1-Click Fee invoices generated for ${group.studentIds.length} students (${month})`);
    });
  };

  const handleGroupBatchTest = (groupId: string, testTitle: string, totalMarks: number, date: string, subject: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || group.studentIds.length === 0) return;

    requireUnlock(`Enter PIN to schedule 1-Click test for ${group.name}`, async () => {
      const newTests = [...testScores];
      group.studentIds.forEach(stId => {
        newTests.push({
          id: `test-${Date.now()}-${stId}`,
          studentId: stId,
          subject: subject || group.subject,
          testTitle,
          testDate: date,
          maxMarks: totalMarks,
          obtainedMarks: 0,
          percentage: 0,
          grade: 'Pending',
          remarks: `Batch Test: ${group.name}`,
        });
      });
      setTestScores(newTests);
      await syncTestScoresToFirestore(newTests, students);
      showToast(`1-Click Test scheduled for all ${group.studentIds.length} students in ${group.name}`);
    });
  };

  const handleGroupBatchSyllabus = (groupId: string, subject: string, chapterTitle: string, notes: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    requireUnlock(`Enter PIN to assign 1-Click syllabus for ${group.name}`, async () => {
      let nextSyllabus: SubjectSyllabus[];
      const sub = syllabus.find(s => s.subject.toLowerCase() === subject.toLowerCase());
      if (!sub) {
        const newSub: SubjectSyllabus = {
          id: `syl-${Date.now()}`,
          subject,
          grade: group.grade,
          chapters: [
            {
              id: `chap-${Date.now()}`,
              chapterNumber: 1,
              title: chapterTitle,
              topics: [
                {
                  id: `top-${Date.now()}`,
                  title: 'Key Concepts & Theory Review',
                  status: 'in-progress',
                  notes: notes || `Assigned to ${group.name}`,
                }
              ]
            }
          ]
        };
        nextSyllabus = [...syllabus, newSub];
      } else {
        const nextChapterNumber = sub.chapters.length + 1;
        nextSyllabus = syllabus.map(s => {
          if (s.id === sub.id) {
            return {
              ...s,
              chapters: [
                ...s.chapters,
                {
                  id: `chap-${Date.now()}`,
                  chapterNumber: nextChapterNumber,
                  title: chapterTitle,
                  topics: [
                    {
                      id: `top-${Date.now()}`,
                      title: 'Key Concepts & Theory Review',
                      status: 'in-progress',
                      notes: notes || `Assigned to ${group.name}`,
                    }
                  ]
                }
              ]
            };
          }
          return s;
        });
      }
      setSyllabus(nextSyllabus);
      await syncSyllabusToFirestore(nextSyllabus, students);
      showToast(`1-Click Chapter '${chapterTitle}' assigned to syllabus (${subject})`);
    });
  };

  // Quick Attendance
  const handleQuickMarkAttendance = (studentId: string, status: 'present' | 'absent') => {
    const perform = async () => {
      const existingIndex = attendance.findIndex(a => a.studentId === studentId && a.date === todayDate);
      const updated = [...attendance];

      if (existingIndex >= 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          status,
        };
      } else {
        updated.push({
          id: `att-${Date.now()}-${studentId}`,
          studentId,
          date: todayDate,
          status,
        });
      }

      setAttendance(updated);
      await syncAttendanceToFirestore(updated, students);
      const student = students.find(s => s.id === studentId);
      showToast(`Marked ${student?.name || 'Student'} as ${status.toUpperCase()} for today.`);
    };

    requireUnlock('Enter PIN to mark student attendance', perform);
  };

  const handleUpdateAttendance = (newRecords: AttendanceRecord[]) => {
    requireUnlock('Enter PIN to update attendance records', async () => {
      setAttendance(newRecords);
      await syncAttendanceToFirestore(newRecords, students);
      showToast('Attendance records saved.');
    });
  };

  // Syllabus
  const handleUpdateSyllabus = (newSyllabus: SubjectSyllabus[]) => {
    requireUnlock('Enter PIN to modify syllabus progress', async () => {
      setSyllabus(newSyllabus);
      await syncSyllabusToFirestore(newSyllabus, students);
      showToast('Syllabus progress updated.');
    });
  };

  // Fees
  const handleSaveFee = async (savedFee: FeeRecord) => {
    const existingIdx = fees.findIndex(f => f.id === savedFee.id);
    let updated: FeeRecord[];
    if (existingIdx >= 0) {
      updated = fees.map(f => f.id === savedFee.id ? savedFee : f);
    } else {
      updated = [savedFee, ...fees];
    }
    setFees(updated);
    await syncFeesToFirestore([savedFee], students);
    showToast(`Fee record updated: ${savedFee.month}`);
    if (savedFee.status === 'paid') {
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch (e) {
        // Safe fallback
      }
    }
  };

  const handleOpenRecordFee = (student?: Student, fee?: FeeRecord) => {
    requireUnlock('Enter PIN to record or edit fee payments', () => {
      setPreSelectedFeeStudent(student || null);
      setPreSelectedFee(fee || null);
      setIsRecordFeeOpen(true);
    });
  };

  const handleOpenReceiptModal = (student: Student, fee: FeeRecord) => {
    setReceiptStudent(student);
    setReceiptFee(fee);
    setIsReceiptOpen(true);
  };

  // Tests
  const handleSaveTest = async (savedTest: TestScore) => {
    const updated = [savedTest, ...testScores];
    setTestScores(updated);
    await syncTestScoresToFirestore([savedTest], students);
    showToast(`Logged test marks: ${savedTest.testTitle}`);
  };

  const handleOpenAddTest = (student?: Student) => {
    requireUnlock('Enter PIN to add new test marks', () => {
      setPreSelectedTestStudent(student || null);
      setIsAddTestOpen(true);
    });
  };

  const handleDeleteTest = (testId: string) => {
    requireUnlock('Enter PIN to delete test score record', async () => {
      const nextTests = testScores.filter(t => t.id !== testId);
      setTestScores(nextTests);
      await syncTestScoresToFirestore([], students, [testId]);
      showToast('Deleted test record.');
    });
  };

  const handleUpdateTestScores = (newScores: TestScore[]) => {
    requireUnlock('Enter PIN to modify test score records', async () => {
      const newIds = new Set(newScores.map(t => t.id));
      const deletedIds = testScores.filter(t => !newIds.has(t.id)).map(t => t.id);
      setTestScores(newScores);
      await syncTestScoresToFirestore(newScores, students, deletedIds);
      showToast('Test scores updated.');
    });
  };

  const handleUpdateFees = (newFees: FeeRecord[]) => {
    requireUnlock('Enter PIN to modify fee records', async () => {
      setFees(newFees);
      await syncFeesToFirestore(newFees, students);
      showToast('Fee ledger updated.');
    });
  };

  // Report Cards
  const handleGenerateReportCard = (student: Student) => {
    setReportCardStudent(student);
    setIsReportCardOpen(true);
  };

  const handleResetData = () => {
    requireUnlock('Enter PIN to reset database to initial sample records', () => {
      setConfirmDialog({
        isOpen: true,
        title: 'Reset Portal Data',
        message: 'Reset database back to initial sample records for Sir Ali Preparations?',
        onConfirm: async () => {
          resetToInitialSampleData();
          const initStudents = getStoredStudents();
          const initGroups = getStoredGroups();
          const initAttendance = getStoredAttendance();
          const initTests = getStoredTests();
          const initSyllabus = getStoredSyllabus();
          const initFees = getStoredFees();

          setStudents(initStudents);
          setGroups(initGroups);
          setAttendance(initAttendance);
          setTestScores(initTests);
          setSyllabus(initSyllabus);
          setFees(initFees);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));

          await syncFullDatasetToFirestore({
            students: initStudents,
            groups: initGroups,
            attendance: initAttendance,
            testScores: initTests,
            syllabus: initSyllabus,
            fees: initFees,
          });
          showToast('Database reset to authentic initial sample data.');
        }
      });
    });
  };

  // Counts for header badge
  const studentCounts = {
    total: students.length,
    home: students.filter(s => s.tuitionMode === 'home').length,
    online: students.filter(s => s.tuitionMode === 'online').length,
  };

  // Gate UI by Authentication & Role
  if (!authReady || authChecking) {
    return <LoginScreen currentUser={currentUser} authChecking />;
  }

  if (!currentUser) {
    return <LoginScreen currentUser={null} />;
  }

  if (portalRole === 'unauthorized' || !portalRole) {
    return <LoginScreen currentUser={currentUser} isUnauthorized authError={authError} />;
  }

  if (portalRole === 'student_parent') {
    return (
      <StudentParentPortal
        currentUser={currentUser}
        accessEntries={accessEntries}
        students={students}
        groups={groups}
        attendance={attendance}
        testScores={testScores}
        syllabus={syllabus}
        fees={fees}
        onSignOut={handlePortalSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F3] text-[#42473E] flex flex-col font-sans selection:bg-[#CAD3C0] selection:text-[#2D3329]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#3A4035] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-[#4E5745] flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#CAD3C0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedModeFilter={selectedModeFilter}
        setSelectedModeFilter={setSelectedModeFilter}
        onOpenAddStudent={() => {
          requireUnlock('Enter PIN to enroll new student', () => {
            setStudentToEdit(null);
            setIsAddStudentOpen(true);
          });
        }}
        onOpenRecordFee={() => handleOpenRecordFee()}
        onOpenAddTest={() => handleOpenAddTest()}
        onResetData={handleResetData}
        studentCounts={studentCounts}
        groupCount={groups.length}
        isLocked={isLocked}
        onToggleLock={handleToggleLock}
        onOpenChangePin={handleOpenChangePin}
        sheetsConfig={sheetsConfig}
        adminEmail={currentUser.email}
        onSignOut={handlePortalSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <OverviewTab
            students={students}
            attendance={attendance}
            testScores={testScores}
            syllabus={syllabus}
            fees={fees}
            todayDate={todayDate}
            selectedModeFilter={selectedModeFilter}
            isLocked={isLocked}
            onNavigateTab={setActiveTab}
            onQuickMarkAttendance={handleQuickMarkAttendance}
            onSelectStudent={(student) => setSelectedDetailStudent(student)}
            onOpenAddStudent={() => {
              requireUnlock('Enter PIN to enroll new student', () => {
                setStudentToEdit(null);
                setIsAddStudentOpen(true);
              });
            }}
            onOpenRecordFee={() => handleOpenRecordFee()}
            onOpenAddTest={() => handleOpenAddTest()}
          />
        )}

        {/* GROUPS & BATCHES TAB */}
        {activeTab === 'groups' && (
          <GroupsTab
            groups={groups}
            students={students}
            attendance={attendance}
            testScores={testScores}
            fees={fees}
            syllabus={syllabus}
            todayDate={todayDate}
            isLocked={isLocked}
            onSaveGroup={handleSaveGroup}
            onDeleteGroup={handleDeleteGroup}
            onAssignStudentsToGroup={handleAssignStudentsToGroup}
            onGroupBatchAttendance={handleGroupBatchAttendance}
            onGroupBatchFee={handleGroupBatchFee}
            onGroupBatchTest={handleGroupBatchTest}
            onGroupBatchSyllabus={handleGroupBatchSyllabus}
            onSelectStudent={(student) => setSelectedDetailStudent(student)}
          />
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <StudentsTab
            students={students}
            groups={groups}
            attendance={attendance}
            testScores={testScores}
            fees={fees}
            selectedModeFilter={selectedModeFilter}
            onSelectStudent={(student) => setSelectedDetailStudent(student)}
            onOpenAddStudent={() => {
              requireUnlock('Enter PIN to enroll new student', () => {
                setStudentToEdit(null);
                setIsAddStudentOpen(true);
              });
            }}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onGenerateReportCard={handleGenerateReportCard}
            onRecordFeeForStudent={(student) => handleOpenRecordFee(student)}
            onAssignStudentsToGroup={handleAssignStudentsToGroup}
          />
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <AttendanceTab
            students={students}
            attendance={attendance}
            selectedModeFilter={selectedModeFilter}
            onUpdateAttendance={handleUpdateAttendance}
            todayDate={todayDate}
            onSelectStudent={(student) => setSelectedDetailStudent(student)}
          />
        )}

        {/* SYLLABUS TAB */}
        {activeTab === 'syllabus' && (
          <SyllabusTab
            syllabusList={syllabus}
            students={students}
            onUpdateSyllabus={handleUpdateSyllabus}
            onUpdateStudents={handleUpdateStudentsList}
            todayDate={todayDate}
            onSelectStudent={(student) => setSelectedDetailStudent(student)}
          />
        )}

        {/* PROGRESS TAB */}
        {activeTab === 'progress' && (
          <ProgressTab
            students={students}
            testScores={testScores}
            attendance={attendance}
            syllabus={syllabus}
            onOpenAddTest={() => handleOpenAddTest()}
            onDeleteTest={handleDeleteTest}
            onGenerateReportCard={handleGenerateReportCard}
            onSelectStudent={(student) => setSelectedDetailStudent(student)}
          />
        )}

        {/* FEES TAB */}
        {activeTab === 'fees' && (
          <FeesTab
            students={students}
            fees={fees}
            selectedModeFilter={selectedModeFilter}
            isLocked={isLocked}
            onOpenRecordFee={handleOpenRecordFee}
            onOpenReceiptModal={handleOpenReceiptModal}
          />
        )}

        {/* GOOGLE SHEETS LIVE DATABASE TAB */}
        {activeTab === 'sheets' && (
          <GoogleSheetsTab
            students={students}
            groups={groups}
            attendance={attendance}
            testScores={testScores}
            syllabus={syllabus}
            fees={fees}
            sheetsConfig={sheetsConfig}
            onUpdateConfig={handleUpdateSheetsConfig}
            onApplyPulledData={handleApplyPulledData}
            showToast={showToast}
            currentUser={currentUser}
            onUserAuthChange={(user) => setCurrentUser(user)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E0E4D9] py-4 text-center text-xs text-[#707969] print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-[#2D3329]">
            Sir Ali Preparations © 2026 • Private Home & Online Tuitions Management System
          </p>
          <div className="flex items-center gap-4 text-xs text-[#707969]">
            <span>CAIE | Karachi & Federal Board | AKU-EB</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <StudentDetailModal
        student={selectedDetailStudent}
        onClose={() => setSelectedDetailStudent(null)}
        attendance={attendance}
        testScores={testScores}
        fees={fees}
        syllabus={syllabus}
        isLocked={isLocked}
        todayDate={todayDate}
        onUpdateAttendance={handleUpdateAttendance}
        onUpdateTestScores={handleUpdateTestScores}
        onUpdateSyllabus={handleUpdateSyllabus}
        onUpdateStudents={handleUpdateStudentsList}
        onUpdateFees={handleUpdateFees}
        onEditStudent={handleEditStudent}
        onDeleteStudent={handleDeleteStudent}
        onGenerateReportCard={handleGenerateReportCard}
        onRecordFee={(st) => {
          setSelectedDetailStudent(null);
          handleOpenRecordFee(st);
        }}
        onOpenReceiptModal={handleOpenReceiptModal}
      />

      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => {
          setIsAddStudentOpen(false);
          setStudentToEdit(null);
        }}
        onSave={handleSaveStudent}
        studentToEdit={studentToEdit}
        groups={groups}
      />

      <RecordFeeModal
        isOpen={isRecordFeeOpen}
        onClose={() => {
          setIsRecordFeeOpen(false);
          setPreSelectedFeeStudent(null);
          setPreSelectedFee(null);
        }}
        students={students}
        onSaveFee={handleSaveFee}
        preSelectedStudent={preSelectedFeeStudent}
        preSelectedFee={preSelectedFee}
      />

      <AddTestModal
        isOpen={isAddTestOpen}
        onClose={() => {
          setIsAddTestOpen(false);
          setPreSelectedTestStudent(null);
        }}
        students={students}
        onSaveTest={handleSaveTest}
        preSelectedStudent={preSelectedTestStudent}
      />

      <FeeReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setReceiptStudent(null);
          setReceiptFee(null);
        }}
        student={receiptStudent}
        fee={receiptFee}
      />

      <ReportCardModal
        isOpen={isReportCardOpen}
        onClose={() => {
          setIsReportCardOpen(false);
          setReportCardStudent(null);
        }}
        student={reportCardStudent}
        tests={testScores}
        attendance={attendance}
        syllabus={syllabus}
      />

      {/* Master PIN Authentication / Security Modal */}
      <PinAuthModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleUnlockSuccess}
        masterPin={masterPin}
        onUpdateMasterPin={handleUpdateMasterPin}
        mode={pinModalMode}
        actionReason={pinActionReason}
      />

      {/* In-App Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-[#1F231D]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E0E4D9] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF1EC] text-[#9E6547] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2D3329] font-serif">{confirmDialog.title}</h3>
                <p className="text-xs text-[#707969] mt-0.5">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0E4D9]">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 rounded-xl border border-[#E0E4D9] text-[#707969] hover:text-[#2D3329] hover:bg-[#F0F2EA] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-3.5 py-1.5 rounded-xl bg-[#9E6547] hover:bg-[#8A5538] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

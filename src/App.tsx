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
import { FullTuitionDataset } from './services/googleSheets';
import {
  extractBridgeUrlFromLocation,
  refreshViaSheetsBridge,
  syncAllViaSheetsBridge,
  filterDatasetForStudentIds,
  cacheLoginAccountsLocally,
  isValidBridgeUrl,
} from './services/sheetsAuth';
import { PortalUserSession } from './types';

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

  // Google Sheets DB & Portal Auth States (in-memory session only)
  const [session, setSession] = useState<PortalUserSession | null>(null);
  const [isRefreshingPortal, setIsRefreshingPortal] = useState<boolean>(false);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(() => getStoredSheetsConfig());

  // Extract optional ?bridge= Web App URL on boot so shared student/parent links connect automatically
  useEffect(() => {
    const resolvedBridge = extractBridgeUrlFromLocation();
    if (resolvedBridge && resolvedBridge !== sheetsConfig?.webAppUrl) {
      setSheetsConfig(getStoredSheetsConfig());
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleUpdateSheetsConfig = (newConfig: GoogleSheetsConfig | null) => {
    setSheetsConfig(newConfig);
    setStoredSheetsConfig(newConfig);
  };

  const syncDatasetToSheetsIfEnabled = async (nextDataset: FullTuitionDataset) => {
    if (
      session?.role === 'admin' &&
      session.bridgeToken &&
      sheetsConfig?.autoSync &&
      sheetsConfig?.webAppUrl &&
      isValidBridgeUrl(sheetsConfig.webAppUrl)
    ) {
      try {
        await syncAllViaSheetsBridge(sheetsConfig.webAppUrl, session.bridgeToken, nextDataset);
        handleUpdateSheetsConfig({
          ...sheetsConfig,
          lastSyncedAt: new Date().toLocaleTimeString(),
        });
      } catch (err: any) {
        console.error('Google Sheets auto-sync failed:', err);
        showToast('Saved locally. Google Sheets auto-sync will retry on manual Push.');
      }
    }
  };

  const handleLoginSuccess = (result: {
    session: PortalUserSession;
    dataset?: FullTuitionDataset;
    sheetMeta?: { spreadsheetId?: string; spreadsheetTitle?: string; spreadsheetUrl?: string };
  }) => {
    setSession(result.session);

    if (result.sheetMeta) {
      const current = getStoredSheetsConfig();
      handleUpdateSheetsConfig({
        spreadsheetId: result.sheetMeta.spreadsheetId || current?.spreadsheetId || 'apps-script-linked',
        spreadsheetTitle: result.sheetMeta.spreadsheetTitle || current?.spreadsheetTitle || 'Google Sheets Portal Database',
        spreadsheetUrl: result.sheetMeta.spreadsheetUrl || current?.spreadsheetUrl || '',
        autoSync: current?.autoSync ?? true,
        lastSyncedAt: new Date().toLocaleTimeString(),
        webAppUrl: current?.webAppUrl,
      });
    }

    if (result.session.role === 'admin') {
      if (result.dataset) {
        const hasSheetRecords =
          result.dataset.students.length > 0 ||
          result.dataset.groups.length > 0 ||
          result.dataset.attendance.length > 0 ||
          result.dataset.testScores.length > 0 ||
          result.dataset.fees.length > 0;

        if (hasSheetRecords) {
          if (result.dataset.students.length > 0) setStudents(result.dataset.students);
          if (result.dataset.groups.length > 0) setGroups(result.dataset.groups);
          if (result.dataset.attendance.length > 0) setAttendance(result.dataset.attendance);
          if (result.dataset.testScores.length > 0) setTestScores(result.dataset.testScores);
          if (result.dataset.syllabus.length > 0) setSyllabus(result.dataset.syllabus);
          if (result.dataset.fees.length > 0) setFees(result.dataset.fees);
        }
      }
      showToast(`Signed in as Admin (${result.session.email})`);
    } else {
      if (result.dataset) {
        setStudents(result.dataset.students);
        setGroups(result.dataset.groups);
        setAttendance(result.dataset.attendance);
        setTestScores(result.dataset.testScores);
        setSyllabus(result.dataset.syllabus);
        setFees(result.dataset.fees);
      } else {
        const scoped = filterDatasetForStudentIds(
          {
            students: getStoredStudents(),
            groups: getStoredGroups(),
            attendance: getStoredAttendance(),
            testScores: getStoredTests(),
            syllabus: getStoredSyllabus(),
            fees: getStoredFees(),
          },
          result.session.studentIds,
          result.session.email
        );
        setStudents(scoped.students);
        setGroups(scoped.groups);
        setAttendance(scoped.attendance);
        setTestScores(scoped.testScores);
        setSyllabus(scoped.syllabus);
        setFees(scoped.fees);
      }
    }
  };

  const handleRefreshStudentPortal = async () => {
    if (!session || !session.bridgeToken || !sheetsConfig?.webAppUrl) return;
    try {
      setIsRefreshingPortal(true);
      const ds = await refreshViaSheetsBridge(sheetsConfig.webAppUrl, session.bridgeToken);
      setStudents(ds.students);
      setGroups(ds.groups);
      setAttendance(ds.attendance);
      setTestScores(ds.testScores);
      setSyllabus(ds.syllabus);
      setFees(ds.fees);
    } catch (err: any) {
      showToast(err?.message || 'Unable to refresh from Google Sheets');
    } finally {
      setIsRefreshingPortal(false);
    }
  };

  const handlePortalSignOut = () => {
    setSession(null);
    setStudents(getStoredStudents());
    setGroups(getStoredGroups());
    setAttendance(getStoredAttendance());
    setTestScores(getStoredTests());
    setSyllabus(getStoredSyllabus());
    setFees(getStoredFees());
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

      if (dataset.loginAccounts && dataset.loginAccounts.length > 0) {
        await cacheLoginAccountsLocally(dataset.loginAccounts);
      }

      showToast('Database & LoginAccess credentials synced from Google Sheets.');
    });
  };

  // Sync to localStorage only for Admin
  useEffect(() => {
    if (session?.role === 'admin') setStoredStudents(students);
  }, [students, session?.role]);

  useEffect(() => {
    if (session?.role === 'admin') setStoredGroups(groups);
  }, [groups, session?.role]);

  useEffect(() => {
    if (session?.role === 'admin') setStoredAttendance(attendance);
  }, [attendance, session?.role]);

  useEffect(() => {
    if (session?.role === 'admin') setStoredTests(testScores);
  }, [testScores, session?.role]);

  useEffect(() => {
    if (session?.role === 'admin') setStoredSyllabus(syllabus);
  }, [syllabus, session?.role]);

  useEffect(() => {
    if (session?.role === 'admin') setStoredFees(fees);
  }, [fees, session?.role]);

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

    await syncDatasetToSheetsIfEnabled({
      students: updated,
      groups: nextGroups,
      attendance,
      testScores,
      syllabus,
      fees,
    });
  };

  const handleUpdateStudentsList = async (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    await syncDatasetToSheetsIfEnabled({
      students: updatedStudents,
      groups,
      attendance,
      testScores,
      syllabus,
      fees,
    });
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
          await syncDatasetToSheetsIfEnabled({
            students: nextStudents,
            groups: nextGroups,
            attendance,
            testScores,
            syllabus,
            fees,
          });
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
      const idx = groups.findIndex(g => g.id === group.id);
      const nextGroups = idx >= 0
        ? groups.map(g => (g.id === group.id ? group : g))
        : [...groups, group];
      setGroups(nextGroups);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups: nextGroups,
        attendance,
        testScores,
        syllabus,
        fees,
      });
      showToast(`Saved Group Batch: ${group.name}`);
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    requireUnlock('Enter PIN to delete group batch', async () => {
      const nextGroups = groups.filter(g => g.id !== groupId);
      setGroups(nextGroups);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups: nextGroups,
        attendance,
        testScores,
        syllabus,
        fees,
      });
      showToast('Group batch removed.');
    });
  };

  const handleAssignStudentsToGroup = (groupId: string, studentIds: string[]) => {
    requireUnlock('Enter PIN to assign students to group', async () => {
      const nextGroups = groups.map(g => {
        if (g.id === groupId) {
          const set = new Set([...g.studentIds, ...studentIds]);
          return { ...g, studentIds: Array.from(set) };
        }
        return g;
      });
      setGroups(nextGroups);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups: nextGroups,
        attendance,
        testScores,
        syllabus,
        fees,
      });
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
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance: updated,
        testScores,
        syllabus,
        fees,
      });
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
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores,
        syllabus,
        fees: newFees,
      });
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
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores: newTests,
        syllabus,
        fees,
      });
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
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores,
        syllabus: nextSyllabus,
        fees,
      });
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
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance: updated,
        testScores,
        syllabus,
        fees,
      });
      const student = students.find(s => s.id === studentId);
      showToast(`Marked ${student?.name || 'Student'} as ${status.toUpperCase()} for today.`);
    };

    requireUnlock('Enter PIN to mark student attendance', perform);
  };

  const handleUpdateAttendance = (newRecords: AttendanceRecord[]) => {
    requireUnlock('Enter PIN to update attendance records', async () => {
      setAttendance(newRecords);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance: newRecords,
        testScores,
        syllabus,
        fees,
      });
      showToast('Attendance records saved.');
    });
  };

  // Syllabus
  const handleUpdateSyllabus = (newSyllabus: SubjectSyllabus[]) => {
    requireUnlock('Enter PIN to modify syllabus progress', async () => {
      setSyllabus(newSyllabus);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores,
        syllabus: newSyllabus,
        fees,
      });
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
    await syncDatasetToSheetsIfEnabled({
      students,
      groups,
      attendance,
      testScores,
      syllabus,
      fees: updated,
    });
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
    await syncDatasetToSheetsIfEnabled({
      students,
      groups,
      attendance,
      testScores: updated,
      syllabus,
      fees,
    });
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
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores: nextTests,
        syllabus,
        fees,
      });
      showToast('Deleted test record.');
    });
  };

  const handleUpdateTestScores = (newScores: TestScore[]) => {
    requireUnlock('Enter PIN to modify test score records', async () => {
      setTestScores(newScores);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores: newScores,
        syllabus,
        fees,
      });
      showToast('Test scores updated.');
    });
  };

  const handleUpdateFees = (newFees: FeeRecord[]) => {
    requireUnlock('Enter PIN to modify fee records', async () => {
      setFees(newFees);
      await syncDatasetToSheetsIfEnabled({
        students,
        groups,
        attendance,
        testScores,
        syllabus,
        fees: newFees,
      });
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

          await syncDatasetToSheetsIfEnabled({
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

  // Gate UI by Email + Password Session
  if (!session) {
    return (
      <LoginScreen
        students={students}
        bridgeUrl={sheetsConfig?.webAppUrl || ''}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (session.role === 'student' || session.role === 'parent') {
    return (
      <StudentParentPortal
        session={session}
        students={students}
        groups={groups}
        attendance={attendance}
        testScores={testScores}
        syllabus={syllabus}
        fees={fees}
        onSignOut={handlePortalSignOut}
        onRefresh={session.authSource === 'sheets_bridge' ? handleRefreshStudentPortal : undefined}
        isRefreshing={isRefreshingPortal}
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
        adminEmail={session.email}
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
            session={session}
            onSessionUpdate={setSession}
            onUpdateConfig={handleUpdateSheetsConfig}
            onApplyPulledData={handleApplyPulledData}
            showToast={showToast}
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

import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  LogOut,
  CalendarCheck,
  BookOpen,
  Award,
  Receipt,
  Clock,
  Home,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Printer,
  ChevronDown,
  ChevronRight,
  Users,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  Student,
  StudentGroup,
  AttendanceRecord,
  TestScore,
  SubjectSyllabus,
  FeeRecord,
  PortalAccessEntry,
} from '../types';
import { getStudentSyllabusList } from '../data/curriculumDatabase';
import { formatCurrency, formatDisplayDate } from '../utils/formatters';
import { FeeReceiptModal } from './FeeReceiptModal';
import { ReportCardModal } from './ReportCardModal';

interface StudentParentPortalProps {
  currentUser: User;
  accessEntries: PortalAccessEntry[];
  students: Student[];
  groups: StudentGroup[];
  attendance: AttendanceRecord[];
  testScores: TestScore[];
  syllabus: SubjectSyllabus[];
  fees: FeeRecord[];
  onSignOut: () => void;
}

type PortalTab = 'overview' | 'attendance' | 'syllabus' | 'tests' | 'fees';

export const StudentParentPortal: React.FC<StudentParentPortalProps> = ({
  currentUser,
  accessEntries,
  students,
  groups,
  attendance,
  testScores,
  syllabus,
  fees,
  onSignOut,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Modals for Report Card & Fee Receipt
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [receiptFee, setReceiptFee] = useState<FeeRecord | null>(null);

  useEffect(() => {
    if (students.length > 0 && (!selectedStudentId || !students.some((s) => s.id === selectedStudentId))) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || students[0] || null,
    [students, selectedStudentId]
  );

  const activeRoleLabel = useMemo(() => {
    if (!activeStudent) return 'Student / Parent';
    const match = accessEntries.find((e) => e.studentId === activeStudent.id);
    return match?.role === 'parent' ? 'Parent Account' : 'Student Account';
  }, [accessEntries, activeStudent]);

  // Scoped records for activeStudent
  const studentAttendance = useMemo(
    () =>
      activeStudent
        ? attendance
            .filter((a) => a.studentId === activeStudent.id)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [attendance, activeStudent]
  );

  const studentTests = useMemo(
    () =>
      activeStudent
        ? testScores
            .filter((t) => t.studentId === activeStudent.id)
            .sort((a, b) => b.testDate.localeCompare(a.testDate))
        : [],
    [testScores, activeStudent]
  );

  const studentFees = useMemo(
    () =>
      activeStudent
        ? fees
            .filter((f) => f.studentId === activeStudent.id)
            .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
        : [],
    [fees, activeStudent]
  );

  const studentGroups = useMemo(
    () =>
      activeStudent
        ? groups.filter((g) => g.studentIds.includes(activeStudent.id))
        : [],
    [groups, activeStudent]
  );

  const studentSyllabus = useMemo(
    () => (activeStudent ? getStudentSyllabusList(activeStudent, syllabus) : []),
    [activeStudent, syllabus]
  );

  // Metrics
  const attendanceStats = useMemo(() => {
    const total = studentAttendance.length;
    const present = studentAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, rate };
  }, [studentAttendance]);

  const testStats = useMemo(() => {
    if (studentTests.length === 0) return { count: 0, avg: 0, bestGrade: '—' };
    const avg = Math.round(
      studentTests.reduce((acc, t) => acc + (t.percentage || 0), 0) / studentTests.length
    );
    const best = studentTests[0]?.grade || '—';
    return { count: studentTests.length, avg, bestGrade: best };
  }, [studentTests]);

  const syllabusStats = useMemo(() => {
    let totalTopics = 0;
    let completedTopics = 0;
    studentSyllabus.forEach((sub) => {
      sub.chapters.forEach((ch) => {
        ch.topics.forEach((t) => {
          totalTopics += 1;
          const studentRecord = activeStudent?.syllabusProgress?.[t.id];
          const status = studentRecord?.status || t.status;
          if (status === 'completed' || status === 'revised') {
            completedTopics += 1;
          }
        });
      });
    });
    const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    return { totalTopics, completedTopics, pct };
  }, [studentSyllabus, activeStudent]);

  const feeStats = useMemo(() => {
    const pendingTotal = studentFees.reduce((acc, f) => acc + (f.dueAmount || 0), 0);
    const unpaidCount = studentFees.filter((f) => f.status !== 'paid').length;
    return { pendingTotal, unpaidCount };
  }, [studentFees]);

  const filteredTests = useMemo(() => {
    if (selectedSubjectFilter === 'all') return studentTests;
    return studentTests.filter((t) => t.subject === selectedSubjectFilter);
  }, [studentTests, selectedSubjectFilter]);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: prev[chapterId] === undefined ? false : !prev[chapterId],
    }));
  };

  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-[#F7F8F3] text-[#2D3329] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E0E4D9] rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <GraduationCap className="w-10 h-10 text-[#5C6652] mx-auto" />
          <h2 className="text-xl font-bold font-serif">Loading Student Profile</h2>
          <p className="text-xs text-[#707969]">
            Fetching records linked to {currentUser.email}...
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2 bg-[#F0F2EA] hover:bg-[#E0E4D9] text-[#2D3329] text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F3] text-[#42473E] flex flex-col font-sans selection:bg-[#CAD3C0] selection:text-[#2D3329]">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#E0E4D9] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#5C6652] text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-[#E9EDE0]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold font-serif text-[#2D3329] truncate">
                Sir Ali Preparations
              </h1>
              <p className="text-xs text-[#707969] truncate">
                {activeRoleLabel} · {currentUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {students.length > 1 && (
              <div className="flex items-center gap-1.5 bg-[#F0F2EA] border border-[#E0E4D9] rounded-xl px-2.5 py-1.5 text-xs">
                <Users className="w-3.5 h-3.5 text-[#5C6652]" />
                <select
                  value={activeStudent.id}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-transparent font-semibold text-[#2D3329] focus:outline-none cursor-pointer"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.rollNo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F0F2EA] hover:bg-[#E0E4D9] text-[#2D3329] border border-[#E0E4D9] text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 text-[#5C6652]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Student Identity & Summary Card */}
        <section className="bg-white rounded-2xl border border-[#E0E4D9] p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E0E4D9]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#5C6652] text-white font-bold text-lg flex items-center justify-center shrink-0">
                {activeStudent.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#707969] mb-0.5">
                  <span className="font-mono font-semibold text-[#2D3329]">{activeStudent.rollNo}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeStudent.board}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeStudent.grade}</span>
                </div>
                <h2 className="text-2xl font-bold font-serif text-[#2D3329]">
                  {activeStudent.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#707969]">
                  <span className="inline-flex items-center gap-1 text-[#2D3329] font-medium">
                    {activeStudent.tuitionMode === 'home' ? (
                      <Home className="w-3.5 h-3.5 text-[#5C6652]" />
                    ) : (
                      <Laptop className="w-3.5 h-3.5 text-[#5C6652]" />
                    )}
                    {activeStudent.tuitionMode === 'home' ? 'Home Tuition' : 'Online Live Class'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#5C6652]" />
                    {activeStudent.timeSlot}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsReportCardOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5C6652] hover:bg-[#4D5644] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Report Card</span>
              </button>
            </div>
          </div>

          {/* 4-Column KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F7F8F3] border border-[#E0E4D9]">
              <p className="text-xs text-[#707969] font-medium">Attendance Rate</p>
              <p className="text-2xl font-bold text-[#2D3329] mt-1 tabular-nums">
                {attendanceStats.rate}%
              </p>
              <p className="text-xs text-[#707969] mt-0.5 tabular-nums">
                {attendanceStats.present} of {attendanceStats.total} sessions attended
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8F3] border border-[#E0E4D9]">
              <p className="text-xs text-[#707969] font-medium">Test Average</p>
              <p className="text-2xl font-bold text-[#2D3329] mt-1 tabular-nums">
                {testStats.count > 0 ? `${testStats.avg}%` : '—'}
              </p>
              <p className="text-xs text-[#707969] mt-0.5 tabular-nums">
                {testStats.count} graded assessments
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8F3] border border-[#E0E4D9]">
              <p className="text-xs text-[#707969] font-medium">Syllabus Completed</p>
              <p className="text-2xl font-bold text-[#2D3329] mt-1 tabular-nums">
                {syllabusStats.pct}%
              </p>
              <p className="text-xs text-[#707969] mt-0.5 tabular-nums">
                {syllabusStats.completedTopics} of {syllabusStats.totalTopics} topics
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F8F3] border border-[#E0E4D9]">
              <p className="text-xs text-[#707969] font-medium">Pending Fee Balance</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${feeStats.pendingTotal > 0 ? 'text-[#9E6547]' : 'text-[#4E6B3E]'}`}>
                {formatCurrency(feeStats.pendingTotal)}
              </p>
              <p className="text-xs text-[#707969] mt-0.5 tabular-nums">
                {feeStats.unpaidCount === 0
                  ? 'All monthly dues cleared'
                  : `${feeStats.unpaidCount} invoice(s) pending`}
              </p>
            </div>
          </div>
        </section>

        {/* Portal Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto bg-white p-1.5 rounded-2xl border border-[#E0E4D9]">
          {[
            { id: 'overview', label: 'Overview', icon: GraduationCap },
            { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
            { id: 'syllabus', label: 'Syllabus Progress', icon: BookOpen },
            { id: 'tests', label: 'Test Marks', icon: Award },
            { id: 'fees', label: 'Fee Receipts', icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PortalTab)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#5C6652] text-white'
                    : 'text-[#707969] hover:text-[#2D3329] hover:bg-[#F0F2EA]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrolled Details & Teacher Remarks */}
            <div className="bg-white rounded-2xl border border-[#E0E4D9] p-6 space-y-4">
              <h3 className="text-base font-bold font-serif text-[#2D3329]">
                Enrollment &amp; Schedule Details
              </h3>
              <dl className="divide-y divide-[#E0E4D9] text-xs">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#707969]">Enrolled Subjects</dt>
                  <dd className="font-semibold text-[#2D3329] text-right">
                    {activeStudent.subjects.join(' · ')}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#707969]">Parent / Guardian</dt>
                  <dd className="font-semibold text-[#2D3329] text-right">
                    {activeStudent.parentName}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#707969]">Class Location / Meeting Link</dt>
                  <dd className="font-medium text-[#2D3329] text-right break-all">
                    {activeStudent.addressOrLocation || 'Scheduled with Sir Ali'}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#707969]">Monthly Tuition Fee</dt>
                  <dd className="font-semibold text-[#2D3329] tabular-nums">
                    {formatCurrency(activeStudent.monthlyFee)} (Due {activeStudent.feeDueDay}th)
                  </dd>
                </div>
                {studentGroups.length > 0 && (
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-[#707969]">Batch / Group</dt>
                    <dd className="font-semibold text-[#2D3329] text-right">
                      {studentGroups.map((g) => g.name).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>

              {activeStudent.notes && (
                <div className="p-3.5 rounded-xl bg-[#F7F8F3] border border-[#E0E4D9] text-xs space-y-1">
                  <p className="font-semibold text-[#2D3329]">Academic Notes from Sir Ali</p>
                  <p className="text-[#42473E] leading-relaxed">{activeStudent.notes}</p>
                </div>
              )}
            </div>

            {/* Recent Activity Summary */}
            <div className="bg-white rounded-2xl border border-[#E0E4D9] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-serif text-[#2D3329]">
                  Recent Test Scores
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('tests')}
                  className="text-xs font-semibold text-[#5C6652] hover:underline cursor-pointer"
                >
                  View all
                </button>
              </div>
              {studentTests.length === 0 ? (
                <p className="text-xs text-[#707969] py-4">No tests recorded yet.</p>
              ) : (
                <div className="divide-y divide-[#E0E4D9]">
                  {studentTests.slice(0, 4).map((test) => (
                    <div key={test.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#2D3329] truncate">{test.testTitle}</p>
                        <p className="text-[#707969] mt-0.5">
                          {test.subject} · {formatDisplayDate(test.testDate)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="font-bold text-[#2D3329]">
                          {test.obtainedMarks} / {test.maxMarks} ({test.percentage}%)
                        </p>
                        <p className="text-[#5C6652] font-semibold">Grade {test.grade}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl border border-[#E0E4D9] overflow-hidden">
            <div className="p-5 border-b border-[#E0E4D9] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif text-[#2D3329]">Attendance History</h3>
                <p className="text-xs text-[#707969]">
                  {studentAttendance.length} recorded class sessions
                </p>
              </div>
            </div>
            {studentAttendance.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#707969]">
                No attendance records logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F3] border-b border-[#E0E4D9] text-[#707969]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Topic Covered</th>
                      <th className="px-5 py-3 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E4D9]">
                    {studentAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FAFBF9]">
                        <td className="px-5 py-3 font-medium text-[#2D3329] tabular-nums whitespace-nowrap">
                          {formatDisplayDate(rec.date)}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-semibold capitalize">
                            {rec.status === 'present' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : rec.status === 'absent' ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span className="text-[#2D3329]">{rec.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#42473E]">{rec.topicCovered || '—'}</td>
                        <td className="px-5 py-3 text-[#707969]">{rec.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYLLABUS PROGRESS */}
        {activeTab === 'syllabus' && (
          <div className="space-y-5">
            {studentSyllabus.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E0E4D9] p-10 text-center text-xs text-[#707969]">
                No syllabus items configured for enrolled subjects yet.
              </div>
            ) : (
              studentSyllabus.map((sub) => {
                let subTotal = 0;
                let subDone = 0;
                sub.chapters.forEach((c) => {
                  c.topics.forEach((t) => {
                    subTotal += 1;
                    const st = activeStudent.syllabusProgress?.[t.id]?.status || t.status;
                    if (st === 'completed' || st === 'revised') subDone += 1;
                  });
                });
                const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;

                return (
                  <div key={sub.id} className="bg-white rounded-2xl border border-[#E0E4D9] overflow-hidden">
                    <div className="p-5 border-b border-[#E0E4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold font-serif text-[#2D3329]">
                          {sub.subject}
                        </h3>
                        <p className="text-xs text-[#707969]">
                          {sub.grade} · {subDone} of {subTotal} topics completed
                        </p>
                      </div>
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className="flex-1 h-2 bg-[#F0F2EA] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5C6652] rounded-full transition-all"
                            style={{ width: `${subPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#2D3329] tabular-nums">{subPct}%</span>
                      </div>
                    </div>

                    <div className="divide-y divide-[#E0E4D9]">
                      {sub.chapters.map((chapter) => {
                        const isOpen = expandedChapters[chapter.id] !== false;
                        return (
                          <div key={chapter.id}>
                            <button
                              type="button"
                              onClick={() => toggleChapter(chapter.id)}
                              className="w-full px-5 py-3.5 bg-[#FAFBF9] hover:bg-[#F0F2EA]/70 flex items-center justify-between text-left transition cursor-pointer"
                            >
                              <span className="text-xs font-bold text-[#2D3329]">
                                Unit {chapter.chapterNumber}: {chapter.title}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-[#707969]">
                                <span className="tabular-nums">{chapter.topics.length} topics</span>
                                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                            </button>
                            {isOpen && (
                              <div className="divide-y divide-[#E0E4D9]/60">
                                {chapter.topics.map((topic) => {
                                  const override = activeStudent.syllabusProgress?.[topic.id];
                                  const status = override?.status || topic.status;
                                  const completedDate = override?.completedDate || topic.completedDate;
                                  return (
                                    <div
                                      key={topic.id}
                                      className="px-5 py-2.5 flex items-center justify-between gap-4 text-xs"
                                    >
                                      <span className="text-[#2D3329]">{topic.title}</span>
                                      <div className="flex items-center gap-3 shrink-0">
                                        {completedDate && (
                                          <span className="text-[#707969] tabular-nums">
                                            {formatDisplayDate(completedDate)}
                                          </span>
                                        )}
                                        <span
                                          className={`font-semibold capitalize ${
                                            status === 'completed' || status === 'revised'
                                              ? 'text-emerald-700'
                                              : status === 'in-progress'
                                              ? 'text-amber-700'
                                              : 'text-[#707969]'
                                          }`}
                                        >
                                          {status.replace('-', ' ')}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 4: TESTS & REPORT CARD */}
        {activeTab === 'tests' && (
          <div className="bg-white rounded-2xl border border-[#E0E4D9] overflow-hidden">
            <div className="p-5 border-b border-[#E0E4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold font-serif text-[#2D3329]">
                  Assessment &amp; Test Marks
                </h3>
                <p className="text-xs text-[#707969]">
                  {filteredTests.length} test results recorded
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#F7F8F3] border border-[#E0E4D9] rounded-xl text-xs font-medium text-[#2D3329] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Subjects</option>
                  {Array.from(new Set(studentTests.map((t) => t.subject))).map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsReportCardOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#5C6652] hover:bg-[#4D5644] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Report Card</span>
                </button>
              </div>
            </div>

            {filteredTests.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#707969]">
                No test scores recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F3] border-b border-[#E0E4D9] text-[#707969]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Subject</th>
                      <th className="px-5 py-3 font-semibold">Assessment</th>
                      <th className="px-5 py-3 font-semibold text-right">Marks</th>
                      <th className="px-5 py-3 font-semibold text-right">Percentage</th>
                      <th className="px-5 py-3 font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E4D9]">
                    {filteredTests.map((t) => (
                      <tr key={t.id} className="hover:bg-[#FAFBF9]">
                        <td className="px-5 py-3 text-[#707969] tabular-nums whitespace-nowrap">
                          {formatDisplayDate(t.testDate)}
                        </td>
                        <td className="px-5 py-3 font-medium text-[#2D3329]">{t.subject}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-[#2D3329]">{t.testTitle}</p>
                          {t.remarks && <p className="text-[#707969] mt-0.5">{t.remarks}</p>}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-[#2D3329] tabular-nums whitespace-nowrap">
                          {t.obtainedMarks} / {t.maxMarks}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-[#2D3329] tabular-nums">
                          {t.percentage}%
                        </td>
                        <td className="px-5 py-3 font-bold text-[#5C6652]">{t.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FEES & RECEIPTS */}
        {activeTab === 'fees' && (
          <div className="bg-white rounded-2xl border border-[#E0E4D9] overflow-hidden">
            <div className="p-5 border-b border-[#E0E4D9]">
              <h3 className="text-base font-bold font-serif text-[#2D3329]">
                Monthly Tuition Fee Invoices &amp; Receipts
              </h3>
              <p className="text-xs text-[#707969]">
                {studentFees.length} billing record(s)
              </p>
            </div>

            {studentFees.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#707969]">
                No fee invoices found yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F8F3] border-b border-[#E0E4D9] text-[#707969]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Month</th>
                      <th className="px-5 py-3 font-semibold text-right">Net Fee</th>
                      <th className="px-5 py-3 font-semibold text-right">Paid</th>
                      <th className="px-5 py-3 font-semibold text-right">Due</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E4D9]">
                    {studentFees.map((fee) => (
                      <tr key={fee.id} className="hover:bg-[#FAFBF9]">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-[#2D3329]">{fee.month}</p>
                          <p className="text-[#707969] tabular-nums">Due: {formatDisplayDate(fee.dueDate)}</p>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-[#2D3329] tabular-nums">
                          {formatCurrency(Math.max(0, fee.totalFee - (fee.discount || 0)))}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                          {formatCurrency(fee.paidAmount)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-[#9E6547] tabular-nums">
                          {formatCurrency(fee.dueAmount)}
                        </td>
                        <td className="px-5 py-3 capitalize font-semibold">
                          <span
                            className={
                              fee.status === 'paid'
                                ? 'text-emerald-700'
                                : fee.status === 'overdue'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }
                          >
                            {fee.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setReceiptFee(fee)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F0F2EA] hover:bg-[#E0E4D9] text-[#2D3329] font-semibold transition cursor-pointer whitespace-nowrap"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#5C6652]" />
                            <span>View Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-[#E0E4D9] py-4 text-center text-xs text-[#707969] print:hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-[#2D3329]">
            Sir Ali Preparations © 2026 · Student &amp; Parent Portal
          </p>
          <span>Read-Only Verified Access</span>
        </div>
      </footer>

      {/* Report Card & Receipt Modals */}
      <ReportCardModal
        isOpen={isReportCardOpen}
        onClose={() => setIsReportCardOpen(false)}
        student={activeStudent}
        tests={testScores}
        attendance={attendance}
        syllabus={syllabus}
      />

      <FeeReceiptModal
        isOpen={Boolean(receiptFee)}
        onClose={() => setReceiptFee(null)}
        student={activeStudent}
        fee={receiptFee}
      />
    </div>
  );
};

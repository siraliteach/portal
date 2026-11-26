/**
 * Security Rule Verification Payloads ("Dirty Dozen") for Sir Ali Preparations Portal.
 * Documents adversarial payloads expected to fail with PERMISSION_DENIED under firestore.rules.
 */
export const DIRTY_DOZEN_SECURITY_CASES = [
  {
    name: '1. Unauthenticated read on students',
    auth: null,
    operation: 'get',
    path: 'students/std-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Unverified admin email spoof',
    auth: { uid: 'spoof-uid', token: { email: '2331975ali@gmail.com', email_verified: false } },
    operation: 'list',
    path: 'students',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Unauthorized user list scrape on students',
    auth: { uid: 'stranger', token: { email: 'stranger@gmail.com', email_verified: true } },
    operation: 'list',
    path: 'students',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Cross-student fee record read',
    auth: { uid: 'std1-user', token: { email: 'hamza.tariq@gmail.com', email_verified: true } },
    operation: 'get',
    path: 'fees/fee-std2-aug',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Student privilege escalation to admins',
    auth: { uid: 'std1-user', token: { email: 'hamza.tariq@gmail.com', email_verified: true } },
    operation: 'create',
    path: 'admins/std1-user',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Student test score modification',
    auth: { uid: 'std1-user', token: { email: 'hamza.tariq@gmail.com', email_verified: true } },
    operation: 'update',
    path: 'testScores/test-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Student fee payment status tampering',
    auth: { uid: 'std1-user', token: { email: 'hamza.tariq@gmail.com', email_verified: true } },
    operation: 'update',
    path: 'fees/fee-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Shadow field injection on students',
    auth: { uid: 'admin', token: { email: '2331975ali@gmail.com', email_verified: true } },
    operation: 'create',
    path: 'students/std-new',
    payload: { id: 'std-new', isSuperAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Path ID poisoning with invalid characters',
    auth: { uid: 'admin', token: { email: '2331975ali@gmail.com', email_verified: true } },
    operation: 'create',
    path: 'students/std.invalid$id',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Client-forged timestamp bypassing request.time',
    auth: { uid: 'admin', token: { email: '2331975ali@gmail.com', email_verified: true } },
    operation: 'create',
    path: 'portal_access/pa-1',
    payload: { id: 'pa-1', email: 'test@gmail.com', studentId: 'std-1', studentName: 'Test', role: 'student', updatedAt: '2026-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Unbounded allowedEmails array exhaustion',
    auth: { uid: 'admin', token: { email: '2331975ali@gmail.com', email_verified: true } },
    operation: 'create',
    path: 'students/std-overflow',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Unfiltered portal_access enumeration by student',
    auth: { uid: 'std1-user', token: { email: 'hamza.tariq@gmail.com', email_verified: true } },
    operation: 'list',
    path: 'portal_access',
    expected: 'PERMISSION_DENIED',
  },
];

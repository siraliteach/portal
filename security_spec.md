# Security Specification — Sir Ali Preparations Portal

## 1. Data Invariants
1. **Admin Authority**: Only verified administrator accounts (`2331975ali@gmail.com` or UIDs in `/admins/{uid}` with `email_verified == true`) can create, update, or delete any tuition records (`students`, `groups`, `attendance`, `testScores`, `syllabus`, `fees`, `portal_access`).
2. **Allowlist Isolation**: Students and parents (`email_verified == true`) can ONLY read (`get` / `list`) documents in `portal_access` where `resource.data.email == request.auth.token.email.lower()`, and can ONLY read documents in `students`, `groups`, `attendance`, `testScores`, `syllabus`, and `fees` where `request.auth.token.email.lower() in resource.data.allowedEmails`.
3. **Zero Unverified Email Access**: Unauthenticated users or accounts with `email_verified != true` have zero read or write access to any collection.
4. **No Cross-Student Leakage**: A parent or student cannot query or read another student's profile, attendance, test scores, or fee records even by guessing document IDs or running unfiltered queries.
5. **Strict Schema Integrity**: All writes require exact required keys, reject unknown shadow fields via `hasOnly(...)`, enforce string `.size()` and array `.size()` limits, validate ID regexes (`^[a-zA-Z0-9_\-]+$`), and enforce server timestamps (`updatedAt == request.time`).

## 2. "Dirty Dozen" Adversarial Test Payloads
1. **Unauthenticated Read**: Anonymous user attempts `getDoc(doc(db, 'students', 'std-1'))` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: Authenticated user with `email: '2331975ali@gmail.com'` and `email_verified: false` attempts read/write -> `PERMISSION_DENIED`.
3. **Unauthorized Email List Scrape**: Authenticated user (`stranger@gmail.com`) attempts `getDocs(collection(db, 'students'))` -> `PERMISSION_DENIED`.
4. **Cross-Student Direct Get**: Student A (`hamza.tariq@gmail.com`) attempts `getDoc(doc(db, 'fees', 'fee-std2-aug'))` belonging to Student B -> `PERMISSION_DENIED`.
5. **Student Privilege Escalation (Admin Write)**: Allowlisted student attempts `setDoc(doc(db, 'admins', uid), { uid, email, displayName, updatedAt })` -> `PERMISSION_DENIED`.
6. **Student Self-Grade Tampering**: Allowlisted student attempts `updateDoc(doc(db, 'testScores', 'test-1'), { obtainedMarks: 100 })` -> `PERMISSION_DENIED`.
7. **Student Self-Fee Tampering**: Allowlisted student attempts `updateDoc(doc(db, 'fees', 'fee-1'), { status: 'paid', dueAmount: 0 })` -> `PERMISSION_DENIED`.
8. **Shadow Field Injection**: Admin or malicious script attempts `setDoc` on `students/std-1` with extra ghost field `isSuperAdmin: true` -> `PERMISSION_DENIED` via `keys().hasOnly(...)`.
9. **Path ID Poisoning**: Attempt to write document with oversized or invalid ID `std/../admin` or 200-char ID -> `PERMISSION_DENIED` via `isValidId(...)`.
10. **Client Timestamp Forgery**: Write payload with client-generated `updatedAt` timestamp instead of `request.time` -> `PERMISSION_DENIED`.
11. **Unbounded Array Resource Exhaustion**: Write `students/std-1` with 100 strings in `allowedEmails` -> `PERMISSION_DENIED` via `allowedEmails.size() <= 10`.
12. **Portal Access Enumeration**: Student A queries `collection(db, 'portal_access')` without filtering by their own lowercase email -> `PERMISSION_DENIED`.

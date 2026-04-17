# Security Spec (Payload-First Security TDD)

## 1. Data Invariants
- A `user` document can only exist if its document ID strictly matches the authenticated `request.auth.uid`.
- Users can only read and write their own documents.
- `createdAt` is immutable.
- `updatedAt` and `createdAt` must strictly match `request.time`.
- `selectedVoice` must be a string and up to 50 characters.
- `outputVolume` must be a number between 0 and 2.
- `email` must be a string.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Read/Write**: Attempt to read or write without an auth token.
2. **Identity Spoofing**: Attempt to create a user document with an ID different from `request.auth.uid`.
3. **Shadow Update (Ghost Field)**: Update profile with an extra field `isAdmin: true`.
4. **Type Poisoning**: Update `outputVolume` with a string or large object.
5. **ID Poisoning**: Attempt to path-inject `{userId}` with a 1MB junk string.
6. **Denial of Wallet (Array Size)**: (No arrays used currently, but strings bounded to 128/200 chars).
7. **Immutable Field Attack**: Attempt to modify `createdAt` during an update.
8. **Time-travel Attack**: Supply a client-generated timestamp instead of `request.time`.
9. **Email Spoofing/Unverified**: Attempt to register without `request.auth.token.email_verified == true` (Ignored if Google auth only ensures verified, but rule will explicitly check or skip if we allow unverified, but instructions say "verified users MUST strictly mandate request.auth.token.email_verified == true").
10. **Blanket Read**: Attempt to read all users collection using `allow list: if isSignedIn()`.

## 3. Test Runner
Included in `firestore.rules.test.ts`.

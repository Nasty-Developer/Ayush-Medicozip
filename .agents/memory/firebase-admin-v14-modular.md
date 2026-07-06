---
name: Firebase Admin v14 modular API
description: firebase-admin v14+ dropped the legacy namespaced API; use modular subpath imports.
---

## Rule
`firebase-admin` v14 no longer exports `auth`, `credential`, or `firestore` on the default `admin` namespace import. Using `admin.auth()` or `admin.credential.cert()` will fail with TypeScript errors.

**Why:** firebase-admin v14 migrated to a fully modular API to match the client SDK pattern.

**How to apply:**
```typescript
// WRONG (v13 and earlier)
import admin from 'firebase-admin';
admin.initializeApp({ credential: admin.credential.cert(sa) });
admin.auth().verifyIdToken(token);

// CORRECT (v14+)
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
initializeApp({ credential: cert(serviceAccount) });
getAuth().verifyIdToken(token);
```

For type imports, use `import type { DecodedIdToken } from 'firebase-admin/auth'`.

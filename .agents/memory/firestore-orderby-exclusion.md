---
name: Firestore orderBy exclusion bug
description: Firestore silently drops documents missing the queried field when using orderBy(); fix by sorting client-side.
---

## The rule
Never use `orderBy("fieldName")` as a Firestore query constraint in `subscribeToCollection` / `getCollection` unless you can guarantee every document in the collection has that field.

**Why:** Firestore's documented behavior — documents that do not contain the field used in `orderBy()` are **excluded from the query results entirely**, with no error or warning. This means any category, brand, or other document created without an `order` field (e.g. added directly in Firebase Console, imported via script, or created by old code) will silently never appear in dropdowns, homepage sections, or admin lists.

**How to apply:** In `useCategories` and `useBrands` (and any similar hooks), pass `[]` as the Firestore constraints, fetch all documents, then sort client-side:

```typescript
subscribeToCollection("categories", [], (docs) => {
  const sorted = (docs as Category[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  // ...
});
```

Also make `order` optional on the type (`order?: number`) to reflect runtime reality.

This was caught because admin-created categories were not appearing in the medicine form or homepage — the `categories` collection had docs without `order` field, causing them to be excluded by the Firestore `orderBy("order")` constraint.

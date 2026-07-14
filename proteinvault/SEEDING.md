# One-time: seed Firestore with the current product data

This loads what's currently in `src/data/listings.js` and `src/data/shops.js`
(FitWin, Quest, Musashi, Go On + the 3 shops) into your live Firestore
database, so the app starts reading from Firestore instead of the
hardcoded fallback file.

You only need to do this once. After this, new products get added through
the admin panel at `#/admin` (see the README's "Admin panel" section) — no
code changes, no redeploy, no more hand-editing Firestore in the Console.

## Steps

### 1. Temporarily open up write access
Firestore → **Rules** tab → replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Click **Publish**.

This is intentionally temporary — it means anyone could write to your
database while this is live. That's fine for the ~2 minutes this takes,
but don't leave it like this.

### 2. Run the seed script
On your machine, inside the `proteinvault/` folder:

```bash
npm install
node seed.js
```

You should see it print each product and shop as it's written, ending with
"Done."

### 3. Lock the rules back down

If you've set up the admin panel (`#/admin` — see the README's "Admin
panel" section), publish its rules instead of fully closing writes, so the
admin tool keeps working:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == 'YOUR_ADMIN_EMAIL';
    }
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /shops/{shopId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /{document=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

Otherwise (no admin panel yet), fully close writes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

Click **Publish** either way.

### 4. Verify
Firestore → **Data** tab — you should see a `products` collection with 4
documents (fitwin, quest-nutrition, musashi, go-on-protein) and a `shops`
collection with 3 (shopee-thailand, tops, villa-market).

Reload the live site — the "Showing placeholder listings" notice should be
gone, since it's now reading from Firestore instead of the fallback.

## After this

`seed.js` is safe to leave in the repo (it's never bundled into the built
site — Vite only ships what `index.html` actually imports) or delete it,
your call. It won't do anything useful again unless rules are reopened,
since your data now lives in Firestore, not the local file.

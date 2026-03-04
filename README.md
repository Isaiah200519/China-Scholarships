# CN Scholarship Backend

Scaffold for Node.js backend.

Quick start:

```
npm install
npm run dev
```

Production start:

```
npm start
```

Environment & Firebase Admin:
- Create a Firebase service account JSON and place it at `serviceAccountKey.json` at the project root, or set `SERVICE_ACCOUNT_PATH` to its path.
- `serviceAccountKey.json` is ignored by `.gitignore` for security.

The scaffold includes `server.js` and `src/firebaseAdmin.js` which initialize Firebase Admin and expose `firestore` for routes.

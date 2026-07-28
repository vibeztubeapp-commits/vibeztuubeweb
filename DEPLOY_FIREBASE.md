Firebase deploy quick steps

1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

2. Login and initialize (once)

```bash
firebase login
firebase init functions firestore
```

3. Deploy rules and functions

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions:reserveUsername
```

Notes:
- Ensure `firebase.json` points `firestore.rules` to `firebase/firestore.rules` or update accordingly.
- If you use the callable function from the client, enable the Functions SDK and call `httpsCallable`.

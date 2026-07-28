Reserve username Cloud Function

Usage:
- Deploy with `firebase deploy --only functions:reserveUsername`
- Call from the client using Firebase Functions SDK (callable):

```js
import { getFunctions, httpsCallable } from 'firebase/functions'
const functions = getFunctions()
const reserve = httpsCallable(functions, 'reserveUsername')
await reserve({ username: 'desiredname' })
```

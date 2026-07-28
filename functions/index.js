const functions = require('firebase-functions')
const admin = require('firebase-admin')

try {
    admin.initializeApp()
} catch (e) { }

// Callable function to atomically reserve a username
exports.reserveUsername = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Login required')
    }
    const username = String(data.username || '').toLowerCase()
    if (!username) {
        throw new functions.https.HttpsError('invalid-argument', 'username required')
    }

    const ref = admin.firestore().doc(`username-reservations/${username}`)
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (snap.exists) {
            throw new functions.https.HttpsError('already-exists', 'username taken')
        }
        tx.set(ref, { uid: context.auth.uid, reservedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { ok: true }
    })
})

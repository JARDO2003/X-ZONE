/**
 * X-ZONE Push Notification Server
 * ================================
 * Ce serveur surveille Firestore en temps réel et envoie
 * des notifications push à chaque événement :
 *   - Nouveau message privé
 *   - Nouveau post dans le flux
 *   - Nouveau message dans le salon anonyme
 *
 * Lancement : node server.js
 * En production : pm2 start server.js --name xzone-push
 */

const webpush  = require('web-push');
const admin    = require('firebase-admin');
const express  = require('express');

// ─── CONFIGURATION ─────────────────────────────────────────────────────────
const VAPID_PUBLIC  = 'BLCbphULBOAUvzpAvs3LjmotBJiuKc_grJmqVyxDX-z8HZo46tECs5kvJU8C9ORGUKBAQRUJesF1b96EuQ885aI';
const VAPID_PRIVATE = 'BUBkVf8ok-b9o8LjpiHn_Hq2zbFXKjc7MIm3NzwJBT4';
const PORT          = process.env.PORT || 3001;

// Configurez web-push avec vos clés VAPID
webpush.setVapidDetails(
  'mailto:admin@xzone.app',  // ← changez par votre email
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

// ─── FIREBASE ADMIN INIT ───────────────────────────────────────────────────
// Téléchargez votre serviceAccountKey.json depuis Firebase Console :
// Paramètres projet → Comptes de service → Générer une nouvelle clé privée
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch(e) {
  console.error('❌  serviceAccountKey.json introuvable !');
  console.error('   → Téléchargez-le depuis Firebase Console → Paramètres → Comptes de service');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  'data-fae4a'
});

const db = admin.firestore();

// ─── HELPERS ───────────────────────────────────────────────────────────────
async function getSubscription(userId) {
  try {
    const snap = await db.collection('push_subscriptions').doc(userId).get();
    if (!snap.exists) return null;
    const sub = snap.data().subscription;
    return typeof sub === 'string' ? JSON.parse(sub) : sub;
  } catch(e) {
    console.error('getSubscription error:', e.message);
    return null;
  }
}

async function sendPush(userId, payload) {
  const sub = await getSubscription(userId);
  if (!sub) return;

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    console.log(`✅  Push → ${userId} [${payload.type}]`);
  } catch(e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription expired — remove from Firestore
      await db.collection('push_subscriptions').doc(userId).delete();
      console.log(`🗑  Subscription expirée supprimée: ${userId}`);
    } else {
      console.error(`❌  Push échoué pour ${userId}:`, e.message);
    }
  }
}

async function sendPushToAll(excludeUserId, payload) {
  try {
    const snap = await db.collection('push_subscriptions').get();
    const promises = snap.docs
      .filter(d => d.id !== excludeUserId)
      .map(d => sendPush(d.id, payload));
    await Promise.allSettled(promises);
  } catch(e) {
    console.error('sendPushToAll error:', e.message);
  }
}

// ─── WATCHERS ──────────────────────────────────────────────────────────────

// 1. MESSAGES PRIVÉS
function watchPrivateMessages() {
  console.log('👁  Surveillance messages privés...');

  db.collection('conversations').onSnapshot(async convSnap => {
    for (const convChange of convSnap.docChanges()) {
      if (convChange.type !== 'modified' && convChange.type !== 'added') continue;

      const convId = convChange.doc.id;

      // Watch new messages in each conversation
      db.collection('conversations').doc(convId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot(async msgSnap => {
          for (const change of msgSnap.docChanges()) {
            if (change.type !== 'added') continue;

            const msg  = change.doc.data();
            const conv = (await db.collection('conversations').doc(convId).get()).data();
            if (!conv || !msg.senderId) continue;

            // Get sender pseudo
            const senderDoc = await db.collection('users').doc(msg.senderId).get();
            const senderPseudo = senderDoc.exists ? senderDoc.data().pseudo : 'Quelqu\'un';

            // Send to all other participants
            const recipients = (conv.participants || []).filter(id => id !== msg.senderId);

            for (const recipientId of recipients) {
              await sendPush(recipientId, {
                type:  'message',
                title: 'X—ZONE',
                body:  `💬 @${senderPseudo} : ${(msg.text || 'Image').substring(0, 60)}`,
                url:   '/?section=msgs',
                id:    convId
              });
            }
          }
        });
    }
  });
}

// 2. NOUVEAU POST DANS LE FLUX GLOBAL
function watchPosts() {
  console.log('👁  Surveillance flux global...');

  let initialized = false;

  db.collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .onSnapshot(async snap => {
      // Skip initial load
      if (!initialized) { initialized = true; return; }

      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;

        const post = change.doc.data();
        if (!post.userId) continue;

        const userDoc = await db.collection('users').doc(post.userId).get();
        const pseudo  = userDoc.exists ? userDoc.data().pseudo : 'Anonyme';

        const body = post.text
          ? `⚡ @${pseudo} : ${post.text.substring(0, 70)}`
          : `⚡ @${pseudo} a publié une ${post.videoUrl ? 'vidéo' : 'photo'}`;

        await sendPushToAll(post.userId, {
          type:  'post',
          title: 'X—ZONE',
          body,
          url:   '/?section=flux',
          id:    change.doc.id
        });
      }
    });
}

// 3. SALON ANONYME
function watchRoomMessages() {
  console.log('👁  Surveillance salon anonyme...');

  let initialized = false;

  db.collection('room_messages')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .onSnapshot(async snap => {
      if (!initialized) { initialized = true; return; }

      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;

        const msg = change.doc.data();

        await sendPushToAll(msg.senderId, {
          type:  'room',
          title: 'X—ZONE',
          body:  `🌐 ${msg.anonName || 'Anonyme'} : ${(msg.text || '').substring(0, 70)}`,
          url:   '/?section=msgs&tab=room',
          id:    change.doc.id
        });
      }
    });
}

// ─── EXPRESS API (optionnel — pour envoyer des pushes manuellement) ─────────
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Endpoint pour envoyer un push manuel
// POST /send-push { userId, type, body, url }
app.post('/send-push', async (req, res) => {
  const { userId, type, body, url } = req.body;
  if (!userId || !body) return res.status(400).json({ error: 'userId and body required' });

  await sendPush(userId, { type: type || 'notification', title: 'X—ZONE', body, url: url || '/' });
  res.json({ success: true });
});

// Endpoint pour broadcast à tous
// POST /broadcast { type, body, url, excludeUserId }
app.post('/broadcast', async (req, res) => {
  const { type, body, url, excludeUserId } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });

  await sendPushToAll(excludeUserId || null, { type: type || 'notification', title: 'X—ZONE', body, url: url || '/' });
  res.json({ success: true });
});

// ─── START ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  X-ZONE Push Server démarré sur le port ${PORT}`);
  console.log('─'.repeat(50));

  // Start all watchers
  watchPrivateMessages();
  watchPosts();
  watchRoomMessages();

  console.log('─'.repeat(50));
  console.log('✅  Tous les watchers actifs\n');
});

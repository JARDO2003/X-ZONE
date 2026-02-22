# X-ZONE — Forum Anonyme Radical

## Structure des fichiers

```
xzone/
├── index.html      ← Application principale (tout-en-un)
├── sw.js           ← Service Worker PWA + Push Notifications
├── manifest.json   ← Config PWA (icônes, couleurs, etc.)
└── README.md
```

## Technologies utilisées

- **Firebase Firestore** — Base de données en temps réel
- **Cloudinary** — Upload et stockage des images
- **Web Push API (VAPID)** — Notifications push manuelles
- **WebAuthn** — Authentification biométrique (empreinte digitale)
- **PWA** — Progressive Web App (installable, hors ligne)

## Collections Firestore créées automatiquement

| Collection | Description |
|---|---|
| `users` | Comptes utilisateurs (nom, prénom, pseudo, hash mot de passe) |
| `posts` | Posts du flux global |
| `factions` | Groupes thématiques |
| `factions/{id}/posts` | Posts par faction |
| `listings` | Annonces du Black Market |
| `notifications` | Notifications utilisateurs |
| `push_subscriptions` | Abonnements push |

## Déploiement

### Option 1 — Firebase Hosting (recommandé)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option 2 — Serveur statique (Nginx/Apache)
Copiez les 3 fichiers dans votre dossier web.
**Important:** Le Service Worker nécessite HTTPS pour fonctionner!

### Option 3 — Vercel / Netlify
Drag & drop le dossier `xzone/` sur l'interface.

## Configuration Firestore — Règles de sécurité

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if true;
    }
    match /posts/{postId} {
      allow read, write: if true;
    }
    match /factions/{factionId} {
      allow read, write: if true;
      match /posts/{postId} {
        allow read, write: if true;
      }
    }
    match /listings/{listingId} {
      allow read, write: if true;
    }
    match /push_subscriptions/{userId} {
      allow read, write: if true;
    }
    match /notifications/{notifId} {
      allow read, write: if true;
    }
  }
}
```

## Envoi de notifications push (backend)

Pour envoyer des notifications depuis votre backend :

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@xzone.app',
  'BLCbphULBOAUvzpAvs3LjmotBJiuKc_grJmqVyxDX-z8HZo46tECs5kvJU8C9ORGUKBAQRUJesF1b96EuQ885aI',
  'BUBkVf8ok-b9o8LjpiHn_Hq2zbFXKjc7MIm3NzwJBT4'
);

// Récupérer la subscription depuis Firestore et envoyer
const subscription = JSON.parse(userDoc.subscription);
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'X-ZONE',
  body: 'Nouveau post dans votre faction!',
  url: '/'
}));
```

## Fonctionnalités

✅ Authentification (pseudo + mot de passe, sans email)
✅ Connexion par empreinte digitale (WebAuthn)
✅ Auto-login (reconnexion automatique sauf déconnexion)
✅ Flux global en temps réel (Firebase onSnapshot)
✅ Upload d'images (Cloudinary)
✅ Vote upvote/downvote
✅ Factions (groupes thématiques)
✅ Black Market avec support BTC/XMR
✅ Système de notation vendeurs
✅ Notifications push VAPID
✅ Design Dark Luxury / Gold (Syne + Playfair Display + DM Mono)
✅ Responsive mobile first
✅ PWA installable (manifest + service worker)
✅ Mode offline (cache service worker)

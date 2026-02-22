# X-ZONE Push Server — Java / Spring Boot

## Structure du projet

```
push-server-java/
├── pom.xml
├── serviceAccountKey.json          ← À copier ici (ne pas commiter !)
└── src/main/
    ├── java/app/xzone/push/
    │   ├── XZonePushApplication.java   ← Point d'entrée
    │   ├── FirebaseConfig.java         ← Init Firebase Admin (votre code)
    │   ├── WebPushService.java         ← Envoi des push VAPID
    │   ├── FirestoreWatcher.java       ← Écoute Firestore en temps réel
    │   ├── PushController.java         ← API REST
    │   └── PushPayload.java            ← DTO
    └── resources/
        └── application.properties
```

---

## Étape 1 — Prérequis

- **Java 17+** (`java -version`)
- **Maven 3.8+** (`mvn -version`)
- Votre site X-ZONE en **HTTPS** (obligatoire pour les push)

---

## Étape 2 — Clé Firebase

1. [console.firebase.google.com](https://console.firebase.google.com)
2. Projet **data-fae4a** → ⚙️ Paramètres → **Comptes de service**
3. **Générer une nouvelle clé privée** → téléchargez le JSON
4. Renommez-le `serviceAccountKey.json`
5. Copiez-le à la **racine du projet** (à côté de `pom.xml`)

> ⚠️ Ne jamais commiter ce fichier — il est dans `.gitignore`

---

## Étape 3 — Compilation et lancement

```bash
# Compiler
mvn clean package -DskipTests

# Lancer
java -jar target/xzone-push-server-1.0.0.jar
```

Ou directement avec Maven :
```bash
mvn spring-boot:run
```

Vous devriez voir :
```
✅  Firebase Admin initialisé → data-fae4a
✅  WebPushService initialisé (VAPID)
╔══════════════════════════════════════╗
║   X-ZONE Push Server  — démarré ✅   ║
╚══════════════════════════════════════╝
👁   Surveillance messages privés...
👁   Surveillance flux global...
👁   Surveillance salon anonyme...
✅  Tous les watchers Firestore actifs
```

---

## Étape 4 — En production (Linux/VPS)

### Option A — systemd (recommandé)

```bash
# Compiler d'abord
mvn clean package -DskipTests

# Créer le service systemd
sudo nano /etc/systemd/system/xzone-push.service
```

Contenu du fichier :
```ini
[Unit]
Description=X-ZONE Push Server
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/push-server-java
ExecStart=java -jar /home/ubuntu/push-server-java/target/xzone-push-server-1.0.0.jar
SuccessExitStatus=143
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable xzone-push
sudo systemctl start xzone-push
sudo systemctl status xzone-push
```

### Option B — Screen (simple)
```bash
screen -S xzone-push
java -jar target/xzone-push-server-1.0.0.jar
# Ctrl+A puis D pour détacher
```

---

## API REST

```bash
# Health check
curl http://localhost:3001/api/health

# Envoyer à un utilisateur
curl -X POST http://localhost:3001/api/send-push \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","type":"notification","body":"Test push","url":"/"}'

# Broadcast à tous
curl -X POST http://localhost:3001/api/broadcast \
  -H "Content-Type: application/json" \
  -d '{"type":"notification","body":"Annonce X-ZONE","url":"/"}'
```

---

## Ce qui déclenche une notification

| Événement | Destinataires | Emoji |
|---|---|---|
| Nouveau post Flux | Tous sauf l'auteur | ⚡ |
| Message privé (DM) | Le destinataire uniquement | 💬 |
| Salon anonyme | Tous sauf l'expéditeur | 🌐 |

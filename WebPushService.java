package app.xzone.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.Firestore;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Service
public class WebPushService {

    // ── Clés VAPID ────────────────────────────────────────────────────────
    private static final String VAPID_PUBLIC  =
        "BLCbphULBOAUvzpAvs3LjmotBJiuKc_grJmqVyxDX-z8HZo46tECs5kvJU8C9ORGUKBAQRUJesF1b96EuQ885aI";
    private static final String VAPID_PRIVATE =
        "BUBkVf8ok-b9o8LjpiHn_Hq2zbFXKjc7MIm3NzwJBT4";
    private static final String VAPID_SUBJECT =
        "mailto:admin@xzone.app";   // ← changez par votre email

    private final PushService   pushService;
    private final Firestore     db;
    private final ObjectMapper  mapper = new ObjectMapper();

    public WebPushService(Firestore db) throws Exception {
        this.db = db;

        // Bouncy Castle est requis pour les opérations ECDH (VAPID)
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        this.pushService = new PushService(VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT);
        System.out.println("✅  WebPushService initialisé (VAPID)");
    }

    // ── Récupère la subscription d'un utilisateur depuis Firestore ────────
    public Subscription getSubscription(String userId) {
        try {
            var snap = db.collection("push_subscriptions").document(userId).get().get();
            if (!snap.exists()) return null;

            String subJson = snap.getString("subscription");
            if (subJson == null) return null;

            // Désérialise le JSON sauvegardé par le navigateur
            Map<?, ?> subMap  = mapper.readValue(subJson, Map.class);
            String endpoint   = (String) subMap.get("endpoint");

            Map<?, ?> keys    = (Map<?, ?>) subMap.get("keys");
            String p256dh     = (String) keys.get("p256dh");
            String auth       = (String) keys.get("auth");

            return new Subscription(endpoint,
                new Subscription.Keys(p256dh, auth));

        } catch (InterruptedException | ExecutionException | Exception e) {
            System.err.println("❌  getSubscription(" + userId + "): " + e.getMessage());
            return null;
        }
    }

    // ── Envoie un push à un utilisateur ───────────────────────────────────
    public void sendPush(String userId, PushPayload payload) {
        Subscription sub = getSubscription(userId);
        if (sub == null) {
            System.out.println("⚠️  Pas de subscription pour: " + userId);
            return;
        }

        try {
            String json = mapper.writeValueAsString(payload);
            Notification notification = new Notification(sub, json);
            pushService.send(notification);
            System.out.println("✅  Push → " + userId + " [" + payload.getType() + "]");

        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";

            // Subscription expirée (410) ou invalide (404) → supprimer
            if (msg.contains("410") || msg.contains("404")) {
                System.out.println("🗑  Subscription expirée → suppression: " + userId);
                try {
                    db.collection("push_subscriptions").document(userId).delete().get();
                } catch (Exception ex) { /* ignore */ }
            } else {
                System.err.println("❌  Push échoué pour " + userId + ": " + msg);
            }
        }
    }

    // ── Broadcast à tous sauf l'expéditeur ────────────────────────────────
    public void sendPushToAll(String excludeUserId, PushPayload payload) {
        try {
            db.collection("push_subscriptions").get().get()
                .getDocuments()
                .stream()
                .filter(doc -> !doc.getId().equals(excludeUserId))
                .forEach(doc -> sendPush(doc.getId(), payload));
        } catch (Exception e) {
            System.err.println("❌  sendPushToAll: " + e.getMessage());
        }
    }
}

package app.xzone.push;

import com.google.cloud.firestore.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class FirestoreWatcher {

    private final Firestore      db;
    private final WebPushService push;

    // Garde trace des conversations déjà surveillées
    private final Set<String> watchedConvs = ConcurrentHashMap.newKeySet();

    public FirestoreWatcher(Firestore db, WebPushService push) {
        this.db   = db;
        this.push = push;
    }

    // Démarre tous les watchers une fois l'app prête
    @EventListener(ApplicationReadyEvent.class)
    public void startWatchers() {
        watchPrivateMessages();
        watchPosts();
        watchRoomMessages();
        System.out.println("✅  Tous les watchers Firestore actifs");
    }

    // ── 1. MESSAGES PRIVÉS ────────────────────────────────────────────────
    private void watchPrivateMessages() {
        System.out.println("👁   Surveillance messages privés...");

        db.collection("conversations")
          .addSnapshotListener((snapshots, error) -> {
              if (error != null) {
                  System.err.println("❌  conversations listener: " + error.getMessage());
                  return;
              }
              if (snapshots == null) return;

              for (DocumentChange change : snapshots.getDocumentChanges()) {
                  String convId = change.getDocument().getId();

                  // Nouvelle conversation ou modifiée → surveiller ses messages
                  if (!watchedConvs.contains(convId)) {
                      watchedConvs.add(convId);
                      watchMessagesInConv(convId, change.getDocument().getData());
                  }
              }
          });
    }

    private void watchMessagesInConv(String convId, Map<String, Object> convData) {
        db.collection("conversations")
          .document(convId)
          .collection("messages")
          .orderBy("createdAt", Query.Direction.DESCENDING)
          .limit(1)
          .addSnapshotListener((snapshots, error) -> {
              if (error != null || snapshots == null) return;

              for (DocumentChange change : snapshots.getDocumentChanges()) {
                  if (change.getType() != DocumentChange.Type.ADDED) continue;

                  // Évite de notifier les messages chargés à l'initialisation
                  if (snapshots.getMetadata().isFromCache()) continue;

                  DocumentSnapshot msgDoc = change.getDocument();
                  String senderId = msgDoc.getString("senderId");
                  String text     = msgDoc.getString("text");
                  if (senderId == null) continue;

                  // Récupère les participants de la conversation
                  try {
                      DocumentSnapshot convSnap = db.collection("conversations")
                          .document(convId).get().get();

                      if (!convSnap.exists()) continue;

                      @SuppressWarnings("unchecked")
                      List<String> participants = (List<String>) convSnap.get("participants");
                      if (participants == null) continue;

                      // Récupère le pseudo de l'expéditeur
                      DocumentSnapshot senderSnap = db.collection("users")
                          .document(senderId).get().get();
                      String pseudo = senderSnap.exists()
                          ? senderSnap.getString("pseudo") : "Quelqu'un";

                      String body = text != null
                          ? "💬 @" + pseudo + " : " + truncate(text, 70)
                          : "💬 @" + pseudo + " vous a envoyé une image";

                      // Envoie à tous les participants sauf l'expéditeur
                      for (String userId : participants) {
                          if (!userId.equals(senderId)) {
                              push.sendPush(userId, new PushPayload(
                                  "message", body, "/?section=msgs", convId
                              ));
                          }
                      }

                  } catch (Exception e) {
                      System.err.println("❌  watchMessagesInConv: " + e.getMessage());
                  }
              }
          });
    }

    // ── 2. NOUVEAU POST DANS LE FLUX GLOBAL ───────────────────────────────
    private void watchPosts() {
        System.out.println("👁   Surveillance flux global...");

        db.collection("posts")
          .orderBy("createdAt", Query.Direction.DESCENDING)
          .limit(1)
          .addSnapshotListener((snapshots, error) -> {
              if (error != null || snapshots == null) return;

              for (DocumentChange change : snapshots.getDocumentChanges()) {
                  if (change.getType() != DocumentChange.Type.ADDED) continue;
                  if (snapshots.getMetadata().isFromCache()) continue;

                  DocumentSnapshot postDoc = change.getDocument();
                  String userId   = postDoc.getString("userId");
                  String text     = postDoc.getString("text");
                  String videoUrl = postDoc.getString("videoUrl");
                  if (userId == null) continue;

                  try {
                      DocumentSnapshot userSnap = db.collection("users")
                          .document(userId).get().get();
                      String pseudo = userSnap.exists()
                          ? userSnap.getString("pseudo") : "Anonyme";

                      String body;
                      if (text != null && !text.isBlank()) {
                          body = "⚡ @" + pseudo + " : " + truncate(text, 70);
                      } else if (videoUrl != null) {
                          body = "⚡ @" + pseudo + " a publié une vidéo";
                      } else {
                          body = "⚡ @" + pseudo + " a publié une photo";
                      }

                      push.sendPushToAll(userId, new PushPayload(
                          "post", body, "/?section=flux", change.getDocument().getId()
                      ));

                  } catch (Exception e) {
                      System.err.println("❌  watchPosts: " + e.getMessage());
                  }
              }
          });
    }

    // ── 3. SALON ANONYME ──────────────────────────────────────────────────
    private void watchRoomMessages() {
        System.out.println("👁   Surveillance salon anonyme...");

        db.collection("room_messages")
          .orderBy("createdAt", Query.Direction.DESCENDING)
          .limit(1)
          .addSnapshotListener((snapshots, error) -> {
              if (error != null || snapshots == null) return;

              for (DocumentChange change : snapshots.getDocumentChanges()) {
                  if (change.getType() != DocumentChange.Type.ADDED) continue;
                  if (snapshots.getMetadata().isFromCache()) continue;

                  DocumentSnapshot msgDoc  = change.getDocument();
                  String senderId  = msgDoc.getString("senderId");
                  String anonName  = msgDoc.getString("anonName");
                  String text      = msgDoc.getString("text");

                  String senderDisplay = anonName != null ? anonName : "Anonyme";
                  String body = "🌐 " + senderDisplay + " : " + truncate(text != null ? text : "", 70);

                  push.sendPushToAll(senderId != null ? senderId : "", new PushPayload(
                      "room", body, "/?section=msgs&tab=room", change.getDocument().getId()
                  ));
              }
          });
    }

    // ── Utilitaire ────────────────────────────────────────────────────────
    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) + "…" : s;
    }
}

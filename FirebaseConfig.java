package app.xzone.push;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.firestore.Firestore;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @Bean
    public Firestore firestore() throws IOException {

        // ── Exactement le code fourni par Firebase Console ──────────────
        FileInputStream serviceAccount =
            new FileInputStream("serviceAccountKey.json");

        FirebaseOptions options = new FirebaseOptions.Builder()
            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
            .setDatabaseUrl("https://data-fae4a-default-rtdb.firebaseio.com")
            .build();

        // Initialiser seulement si pas déjà fait (évite l'erreur au redémarrage)
        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseApp.initializeApp(options);
            System.out.println("✅  Firebase Admin initialisé → data-fae4a");
        }
        // ────────────────────────────────────────────────────────────────

        return FirestoreClient.getFirestore();
    }
}

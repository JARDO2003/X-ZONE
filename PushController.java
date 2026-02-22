package app.xzone.push;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PushController {

    private final WebPushService push;

    public PushController(WebPushService push) {
        this.push = push;
    }

    // GET /api/health
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "service", "X-ZONE Push Server"
        ));
    }

    // POST /api/send-push
    // Body: { "userId": "...", "type": "message", "body": "...", "url": "/" }
    @PostMapping("/send-push")
    public ResponseEntity<?> sendPush(@RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        String text   = body.get("body");

        if (userId == null || text == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "userId et body sont requis"));
        }

        PushPayload payload = new PushPayload(
            body.getOrDefault("type", "notification"),
            text,
            body.getOrDefault("url", "/"),
            body.get("id")
        );

        push.sendPush(userId, payload);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // POST /api/broadcast
    // Body: { "type": "notification", "body": "...", "url": "/", "excludeUserId": "..." }
    @PostMapping("/broadcast")
    public ResponseEntity<?> broadcast(@RequestBody Map<String, String> body) {
        String text = body.get("body");
        if (text == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "body est requis"));
        }

        PushPayload payload = new PushPayload(
            body.getOrDefault("type", "notification"),
            text,
            body.getOrDefault("url", "/"),
            null
        );

        push.sendPushToAll(body.getOrDefault("excludeUserId", ""), payload);
        return ResponseEntity.ok(Map.of("success", true));
    }
}

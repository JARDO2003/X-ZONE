package app.xzone.push;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class XZonePushApplication {

    public static void main(String[] args) {
        SpringApplication.run(XZonePushApplication.class, args);
        System.out.println("╔══════════════════════════════════════╗");
        System.out.println("║   X-ZONE Push Server  — démarré ✅   ║");
        System.out.println("╚══════════════════════════════════════╝");
    }
}

package com.ap.backend.controller;

import com.ap.backend.service.DatabaseService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final DatabaseService databaseService;

    @Value("${ap.security.token:}")
    private String securityToken;

    public HealthController(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("version", "1.3.0");
        health.put("service", "ap-backend-spring-boot");
        health.put("timestamp", Instant.now().toString());
        health.put("uptimeMs", ManagementFactory.getRuntimeMXBean().getUptime());

        boolean isDbConnected = databaseService.isConnected();
        health.put("sqliteStatus", isDbConnected ? "CONNECTED" : "DISCONNECTED");
        health.put("databasePath", databaseService.getActiveDbPath());

        // Memory stats
        Runtime runtime = Runtime.getRuntime();
        Map<String, Object> memory = new HashMap<>();
        memory.put("totalMb", runtime.totalMemory() / (1024 * 1024));
        memory.put("freeMb", runtime.freeMemory() / (1024 * 1024));
        memory.put("maxMb", runtime.maxMemory() / (1024 * 1024));
        health.put("memory", memory);

        health.put("authRequired", securityToken != null && !securityToken.trim().isEmpty());

        return ResponseEntity.ok(health);
    }
}

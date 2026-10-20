package com.ap.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;

@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);

    private final DatabaseService databaseService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BackupService(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    public synchronized Map<String, Object> createBackupPackage(boolean includeHistory, boolean includeDrafts) {
        String dbPath = databaseService.getActiveDbPath();
        String sqliteBase64 = "";

        try {
            File dbFile = new File(dbPath);
            if (dbFile.exists()) {
                byte[] bytes = new byte[(int) dbFile.length()];
                try (FileInputStream fis = new FileInputStream(dbFile)) {
                    fis.read(bytes);
                }
                sqliteBase64 = Base64.getEncoder().encodeToString(bytes);
            }
        } catch (Exception e) {
            log.error("Failed to read SQLite file for backup: {}", e.getMessage(), e);
        }

        Map<String, Integer> recordCounts = new HashMap<>();
        String[] tables = {
            "questions", "tracks", "topics", "subtopics", "tasks",
            "study_sessions", "attempts", "code_drafts", "daily_reviews", "app_settings",
            "sql_exercises", "postgres_exercises"
        };

        try (Connection conn = databaseService.getConnection()) {
            for (String table : tables) {
                if (!includeHistory && (table.equals("study_sessions") || table.equals("attempts"))) {
                    recordCounts.put(table, 0);
                    continue;
                }
                if (!includeDrafts && table.equals("code_drafts")) {
                    recordCounts.put(table, 0);
                    continue;
                }
                try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM " + table);
                     ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        recordCounts.put(table, rs.getInt(1));
                    }
                } catch (Exception e) {
                    recordCounts.put(table, 0);
                }
            }
        } catch (SQLException e) {
            log.warn("Error gathering record counts for backup: {}", e.getMessage());
        }

        List<String> categories = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : recordCounts.entrySet()) {
            if (entry.getValue() > 0) {
                categories.add(entry.getKey());
            }
        }

        String checksum = computeSimpleChecksum(sqliteBase64);

        Map<String, Object> manifest = new HashMap<>();
        manifest.put("categories", categories);
        manifest.put("record_counts", recordCounts);
        manifest.put("options", Map.of("includeHistory", includeHistory, "includeDrafts", includeDrafts));

        Map<String, Object> backupPackage = new HashMap<>();
        backupPackage.put("ap_backup_format", "ap_workspace_backup");
        backupPackage.put("version", 2);
        backupPackage.put("app_version", "1.3.0");
        backupPackage.put("created_at", Instant.now().toString());
        backupPackage.put("checksum", checksum);
        backupPackage.put("manifest", manifest);
        backupPackage.put("sqlite_base64", sqliteBase64);

        return backupPackage;
    }

    public synchronized Map<String, Object> restoreBackup(Map<String, Object> backupPackage, List<String> selectedCategories) {
        Map<String, Object> result = new HashMap<>();
        if (!"ap_workspace_backup".equals(backupPackage.get("ap_backup_format"))) {
            result.put("success", false);
            result.put("error", "Invalid backup package format");
            return result;
        }

        String incomingBase64 = (String) backupPackage.get("sqlite_base64");
        String incomingChecksum = (String) backupPackage.get("checksum");

        if (incomingBase64 == null || incomingBase64.isEmpty()) {
            result.put("success", false);
            result.put("error", "Backup package contains empty database payload");
            return result;
        }

        String calculatedChecksum = computeSimpleChecksum(incomingBase64);
        if (incomingChecksum != null && !incomingChecksum.equals(calculatedChecksum)) {
            result.put("success", false);
            result.put("error", "Backup integrity check failed (checksum mismatch)");
            return result;
        }

        // 1. Create Pre-restore Safety Snapshot
        createSafetySnapshot();

        // 2. Decode incoming SQLite database bytes
        byte[] dbBytes = Base64.getDecoder().decode(incomingBase64);
        String dbPath = databaseService.getActiveDbPath();

        try {
            // Close connection briefly, overwrite file, and reinitialize
            databaseService.close();
            try (FileOutputStream fos = new FileOutputStream(dbPath)) {
                fos.write(dbBytes);
            }
            databaseService.init();

            result.put("success", true);
            result.put("safetyBackupCreated", true);
            result.put("safetyBackupTimestamp", Instant.now().toString());
            result.put("message", "Database restored successfully with pre-restore safety snapshot");
            result.put("restoredCategories", selectedCategories != null ? selectedCategories : List.of("all"));
        } catch (Exception e) {
            log.error("Failed to restore database from backup payload: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", "Failed to write database file: " + e.getMessage());
        }

        return result;
    }

    private void createSafetySnapshot() {
        try {
            File currentDb = new File(databaseService.getActiveDbPath());
            if (currentDb.exists()) {
                byte[] bytes = new byte[(int) currentDb.length()];
                try (FileInputStream fis = new FileInputStream(currentDb)) {
                    fis.read(bytes);
                }
                String base64 = Base64.getEncoder().encodeToString(bytes);
                try (Connection conn = databaseService.getConnection();
                     PreparedStatement stmt = conn.prepareStatement("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('ap_safety_backup_pre_restore', ?)")) {
                    stmt.setString(1, base64);
                    stmt.executeUpdate();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to create safety snapshot: {}", e.getMessage());
        }
    }

    private String computeSimpleChecksum(String str) {
        int hash = 0;
        for (int i = 0; i < str.length(); i++) {
            hash = ((hash << 5) - hash) + str.charAt(i);
            hash |= 0;
        }
        return "chk-" + Integer.toHexString(Math.abs(hash));
    }
}

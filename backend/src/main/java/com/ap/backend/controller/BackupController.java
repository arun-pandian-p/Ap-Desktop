package com.ap.backend.controller;

import com.ap.backend.service.BackupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/backup")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @PostMapping("/export")
    public ResponseEntity<Map<String, Object>> exportBackup(@RequestBody(required = false) Map<String, Object> options) {
        boolean includeHistory = true;
        boolean includeDrafts = true;
        if (options != null) {
            if (options.containsKey("includeHistory")) {
                includeHistory = Boolean.parseBoolean(options.get("includeHistory").toString());
            }
            if (options.containsKey("includeDrafts")) {
                includeDrafts = Boolean.parseBoolean(options.get("includeDrafts").toString());
            }
        }
        return ResponseEntity.ok(backupService.createBackupPackage(includeHistory, includeDrafts));
    }

    @PostMapping("/restore")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> restoreBackup(@RequestBody Map<String, Object> body) {
        Map<String, Object> packageData = body;
        if (body.containsKey("package")) {
            packageData = (Map<String, Object>) body.get("package");
        }
        List<String> selectedCategories = (List<String>) body.get("selectedCategories");

        Map<String, Object> result = backupService.restoreBackup(packageData, selectedCategories);
        return ResponseEntity.ok(result);
    }
}

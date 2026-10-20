package com.ap.backend;

import com.ap.backend.service.BackupService;
import com.ap.backend.service.DatabaseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "ap.security.token=backup-test-token",
    "ap.db.path=target/test_backup_service.sqlite"
})
public class BackupServiceTest {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private BackupService backupService;

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateBackupPackageAndRestore() throws Exception {
        // Seed dummy question
        try (Connection conn = databaseService.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("INSERT OR REPLACE INTO questions (id, title, difficulty, order_num) VALUES ('q-backup', 'Backup Problem', 'Easy', 1);");
        }

        // 1. Create backup package
        Map<String, Object> pkg = backupService.createBackupPackage(true, true);
        assertEquals("ap_workspace_backup", pkg.get("ap_backup_format"));
        assertEquals(2, pkg.get("version"));
        assertNotNull(pkg.get("checksum"));
        assertNotNull(pkg.get("manifest"));

        Map<String, Object> manifest = (Map<String, Object>) pkg.get("manifest");
        List<String> categories = (List<String>) manifest.get("categories");
        assertTrue(categories.contains("questions"));

        // 2. Restore backup
        Map<String, Object> restoreRes = backupService.restoreBackup(pkg, List.of("questions"));
        assertTrue((Boolean) restoreRes.get("success"), "Restore should succeed");
        assertTrue((Boolean) restoreRes.get("safetyBackupCreated"), "Safety backup must be created before restore");
    }
}

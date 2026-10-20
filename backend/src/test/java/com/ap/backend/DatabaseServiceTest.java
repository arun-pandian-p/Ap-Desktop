package com.ap.backend;

import com.ap.backend.service.DatabaseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "ap.security.token=test-db-token",
    "ap.db.path=target/test_database_service.sqlite"
})
public class DatabaseServiceTest {

    @Autowired
    private DatabaseService databaseService;

    @Test
    public void testSQLiteConnectionAndCanonicalTablesExist() throws Exception {
        assertTrue(databaseService.isConnected(), "Database should report connected");

        try (Connection conn = databaseService.getConnection();
             Statement stmt = conn.createStatement()) {

            // Verify canonical tables created
            String[] requiredTables = {
                "tracks", "topics", "subtopics", "questions", "tasks",
                "study_sessions", "attempts", "daily_reviews", "app_settings",
                "license_events", "integrity_events", "sql_exercises",
                "postgres_exercises", "code_drafts"
            };

            for (String table : requiredTables) {
                try (ResultSet rs = stmt.executeQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='" + table + "';")) {
                    assertTrue(rs.next(), "Table " + table + " must exist in SQLite database");
                }
            }

            // Test inserting and reading a record in app_settings
            stmt.executeUpdate("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('test_key', 'test_value');");
            try (ResultSet rs = stmt.executeQuery("SELECT value FROM app_settings WHERE key='test_key';")) {
                assertTrue(rs.next());
                assertEquals("test_value", rs.getString("value"));
            }
        }
    }
}

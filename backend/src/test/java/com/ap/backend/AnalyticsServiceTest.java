package com.ap.backend;

import com.ap.backend.service.AnalyticsService;
import com.ap.backend.service.DatabaseService;
import com.ap.backend.service.StreakService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.sql.Connection;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "ap.security.token=analytics-test-token",
    "ap.db.path=target/test_analytics_service.sqlite"
})
public class AnalyticsServiceTest {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private StreakService streakService;

    @BeforeEach
    public void setup() throws Exception {
        try (Connection conn = databaseService.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("DELETE FROM attempts;");
            stmt.executeUpdate("DELETE FROM questions;");
            stmt.executeUpdate("INSERT INTO questions (id, title, difficulty, order_num) VALUES ('q1', 'Two Sum', 'Easy', 1), ('q2', '3Sum', 'Medium', 2);");
        }
    }

    @Test
    public void testOverviewMetricsCalculation() {
        // Record 1 Accepted and 1 Failed submission
        streakService.recordAttempt("q1", "Two Sum", "Easy", "Arrays", "python", "x=1", "Accepted", 40, 10000);
        streakService.recordAttempt("q2", "3Sum", "Medium", "Arrays", "python", "x=0", "Wrong Answer", 35, 9000);

        Map<String, Object> overview = analyticsService.getOverview();
        assertEquals(2, overview.get("totalQuestions"));
        assertEquals(1, overview.get("solvedQuestions"));
        assertEquals(2, overview.get("attemptedQuestions"));
        assertEquals(1, overview.get("remainingQuestions"));
        assertEquals(2, overview.get("totalSubmissions"));
        assertEquals(1, overview.get("acceptedSubmissions"));
        assertEquals(50.0, overview.get("accuracy"));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testSnapshotGeneration() {
        streakService.recordAttempt("q1", "Two Sum", "Easy", "Arrays", "python", "x=1", "Accepted", 40, 10000);

        Map<String, Object> snapshot = analyticsService.getAnalyticsSnapshot("7d");
        assertEquals("7d", snapshot.get("dateRange"));
        List<Map<String, Object>> chart = (List<Map<String, Object>>) snapshot.get("activityChart");
        assertEquals(7, chart.size(), "Activity chart should contain 7 daily data points");
    }
}

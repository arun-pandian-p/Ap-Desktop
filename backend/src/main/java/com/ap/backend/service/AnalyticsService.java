package com.ap.backend.service;

import com.ap.backend.model.StreakState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final DatabaseService databaseService;
    private final StreakService streakService;

    public AnalyticsService(DatabaseService databaseService, StreakService streakService) {
        this.databaseService = databaseService;
        this.streakService = streakService;
    }

    public synchronized Map<String, Object> getOverview() {
        StreakState streak = streakService.getStreakState();
        int totalQuestions = 0;
        int attemptedQuestions = 0;
        int totalSubmissions = 0;
        int acceptedSubmissions = 0;

        try (Connection conn = databaseService.getConnection()) {
            // Count total questions
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM questions");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) totalQuestions = rs.getInt(1);
            }

            // Count distinct attempted questions
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(DISTINCT question_id) FROM attempts WHERE question_id IS NOT NULL");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) attemptedQuestions = rs.getInt(1);
            }

            // Total and accepted submissions
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*), SUM(CASE WHEN status = 'Accepted' OR status = 'Passed' THEN 1 ELSE 0 END) FROM attempts");
                 ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    totalSubmissions = rs.getInt(1);
                    acceptedSubmissions = rs.getInt(2);
                }
            }
        } catch (SQLException e) {
            log.error("Failed to compute analytics overview: {}", e.getMessage(), e);
        }

        int solvedQuestions = streak.getTotalSolvedUnique();
        int remainingQuestions = Math.max(0, totalQuestions - solvedQuestions);
        double accuracy = totalSubmissions > 0 ? (acceptedSubmissions * 100.0) / totalSubmissions : 0.0;

        Map<String, Object> overview = new HashMap<>();
        overview.put("totalQuestions", totalQuestions);
        overview.put("solvedQuestions", solvedQuestions);
        overview.put("attemptedQuestions", attemptedQuestions);
        overview.put("remainingQuestions", remainingQuestions);
        overview.put("totalSubmissions", totalSubmissions);
        overview.put("acceptedSubmissions", acceptedSubmissions);
        overview.put("accuracy", Math.round(accuracy * 10.0) / 10.0);
        overview.put("currentStreak", streak.getCurrentStreak());
        overview.put("longestStreak", streak.getLongestStreak());
        overview.put("totalActiveDays", streak.getTotalActiveDays());
        overview.put("dailyGoal", streak.getDailyGoal());
        overview.put("solvedToday", streak.getSolvedToday());
        overview.put("isGoalCompletedToday", streak.isGoalCompletedToday());

        return overview;
    }

    public synchronized Map<String, Object> getAnalyticsSnapshot(String dateRange) {
        String range = (dateRange == null || dateRange.trim().isEmpty()) ? "7d" : dateRange.trim();
        int numDays = 7;
        if (range.equalsIgnoreCase("30d")) numDays = 30;
        else if (range.equalsIgnoreCase("90d")) numDays = 90;
        else if (range.equalsIgnoreCase("all")) numDays = 365;

        Map<String, Object> overview = getOverview();
        LocalDate now = LocalDate.now();

        // Build Activity Chart data
        List<Map<String, Object>> activityChart = new ArrayList<>();
        Map<String, Integer> solvedByDate = new HashMap<>();
        Map<String, Integer> totalByDate = new HashMap<>();

        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT created_at, status FROM attempts ORDER BY created_at ASC");
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                String raw = rs.getString("created_at");
                String status = rs.getString("status");
                if (raw == null || raw.length() < 10) continue;
                String dStr = raw.substring(0, 10);
                totalByDate.put(dStr, totalByDate.getOrDefault(dStr, 0) + 1);
                if ("Accepted".equalsIgnoreCase(status) || "Passed".equalsIgnoreCase(status)) {
                    solvedByDate.put(dStr, solvedByDate.getOrDefault(dStr, 0) + 1);
                }
            }
        } catch (SQLException e) {
            log.error("Failed to query activity chart: {}", e.getMessage(), e);
        }

        String[] dayAbbr = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
        int dailyGoal = (int) overview.get("dailyGoal");

        for (int i = numDays - 1; i >= 0; i--) {
            LocalDate d = now.minusDays(i);
            String dStr = d.format(DATE_FORMATTER);
            String dayName = dayAbbr[d.getDayOfWeek().getValue() % 7];

            Map<String, Object> pt = new HashMap<>();
            pt.put("date", dStr);
            pt.put("day", dayName);
            pt.put("hours", 0.0);
            pt.put("goal", dailyGoal);
            pt.put("solved", solvedByDate.getOrDefault(dStr, 0));
            pt.put("totalAttempts", totalByDate.getOrDefault(dStr, 0));
            activityChart.add(pt);
        }

        overview.put("dateRange", range);
        overview.put("activityChart", activityChart);
        return overview;
    }
}

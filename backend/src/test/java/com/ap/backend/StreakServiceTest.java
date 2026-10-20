package com.ap.backend;

import com.ap.backend.model.StreakState;
import com.ap.backend.service.DatabaseService;
import com.ap.backend.service.StreakService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.sql.Connection;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "ap.security.token=streak-test-token",
    "ap.db.path=target/test_streak_service.sqlite"
})
public class StreakServiceTest {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private StreakService streakService;

    @BeforeEach
    public void setup() throws Exception {
        try (Connection conn = databaseService.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("DELETE FROM attempts;");
            stmt.executeUpdate("DELETE FROM app_settings WHERE key = 'daily_goal' OR key = 'streak_milestones_awarded';");
        }
    }

    @Test
    public void testZeroStreakOnEmptyAttempts() {
        StreakState state = streakService.getStreakState();
        assertEquals(0, state.getCurrentStreak());
        assertEquals(0, state.getLongestStreak());
        assertEquals(0, state.getSolvedToday());
        assertEquals(0, state.getTotalActiveDays());
        assertEquals(1, state.getDailyGoal());
        assertFalse(state.isGoalCompletedToday());
    }

    @Test
    public void testMultipleSolvesOnSameDayCountsAsOneActiveDay() {
        streakService.recordAttempt("q1", "Problem 1", "Easy", "Arrays", "python", "x = 1", "Accepted", 40, 10000);
        streakService.recordAttempt("q2", "Problem 2", "Medium", "Trees", "python", "y = 2", "Accepted", 50, 11000);

        StreakState state = streakService.getStreakState();
        assertEquals(1, state.getCurrentStreak());
        assertEquals(1, state.getLongestStreak());
        assertEquals(2, state.getSolvedToday());
        assertEquals(1, state.getTotalActiveDays());
        assertEquals(2, state.getTotalSolvedUnique());
        assertTrue(state.isGoalCompletedToday());
    }

    @Test
    public void testConsecutiveCalendarDaysIncrementStreak() throws Exception {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate dayBeforeYesterday = today.minusDays(2);

        try (Connection conn = databaseService.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate(String.format(
                "INSERT INTO attempts (id, question_id, problem_title, difficulty, category, language, code, status, row_hmac, created_at) " +
                "VALUES ('a1', 'q1', 'P1', 'Easy', 'Arrays', 'python', 'code', 'Accepted', 'hmac1', '%s 10:00:00'), " +
                "       ('a2', 'q2', 'P2', 'Medium', 'DP', 'python', 'code', 'Passed', 'hmac2', '%s 11:00:00'), " +
                "       ('a3', 'q3', 'P3', 'Hard', 'Graphs', 'python', 'code', 'Accepted', 'hmac3', '%s 12:00:00');",
                dayBeforeYesterday.format(dtf), yesterday.format(dtf), today.format(dtf)
            ));
        }

        StreakState state = streakService.getStreakState();
        assertEquals(3, state.getCurrentStreak(), "Streak should be 3 consecutive days");
        assertEquals(3, state.getLongestStreak(), "Longest streak should be 3 days");
        assertEquals(3, state.getTotalActiveDays());
    }

    @Test
    public void testConfigurableDailyGoal() {
        assertEquals(1, streakService.getDailyGoal());
        streakService.setDailyGoal(3);
        assertEquals(3, streakService.getDailyGoal());

        streakService.recordAttempt("q1", "P1", "Easy", "Arrays", "python", "code", "Accepted", 40, 10000);
        StreakState state = streakService.getStreakState();
        assertEquals(1, state.getSolvedToday());
        assertFalse(state.isGoalCompletedToday());

        streakService.recordAttempt("q2", "P2", "Easy", "Arrays", "python", "code", "Accepted", 40, 10000);
        streakService.recordAttempt("q3", "P3", "Easy", "Arrays", "python", "code", "Accepted", 40, 10000);

        state = streakService.getStreakState();
        assertEquals(3, state.getSolvedToday());
        assertTrue(state.isGoalCompletedToday());
    }
}

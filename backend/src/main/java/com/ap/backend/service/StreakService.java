package com.ap.backend.service;

import com.ap.backend.model.StreakState;
import com.ap.backend.model.StreakState.DayActivity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class StreakService {

    private static final Logger log = LoggerFactory.getLogger(StreakService.class);
    private static final int[] MILESTONE_TARGETS = {3, 7, 14, 30, 60, 100, 365};
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final DatabaseService databaseService;

    public StreakService(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    public synchronized int getDailyGoal() {
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT value FROM app_settings WHERE key = 'daily_goal'")) {
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    int val = Integer.parseInt(rs.getString("value"));
                    return val <= 0 ? 1 : val;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get daily goal: {}", e.getMessage());
        }
        return 1;
    }

    public synchronized void setDailyGoal(int goal) {
        int target = Math.max(1, goal);
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('daily_goal', ?)")) {
            stmt.setString(1, String.valueOf(target));
            stmt.executeUpdate();
        } catch (SQLException e) {
            log.error("Failed to save daily goal: {}", e.getMessage(), e);
        }
    }

    public synchronized List<Integer> getAwardedMilestones() {
        List<Integer> list = new ArrayList<>();
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT value FROM app_settings WHERE key = 'streak_milestones_awarded'")) {
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String json = rs.getString("value");
                    if (json != null && !json.trim().isEmpty()) {
                        String clean = json.replace("[", "").replace("]", "").trim();
                        if (!clean.isEmpty()) {
                            for (String part : clean.split(",")) {
                                list.add(Integer.parseInt(part.trim()));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get awarded milestones: {}", e.getMessage());
        }
        return list;
    }

    public synchronized StreakState getStreakState() {
        int dailyGoal = getDailyGoal();
        List<Integer> milestonesAchieved = getAwardedMilestones();
        LocalDate now = LocalDate.now();
        String todayStr = now.format(DATE_FORMATTER);

        Map<String, Integer> heatmap = new HashMap<>();
        Map<String, Set<String>> dayDistinctProblems = new HashMap<>();
        Set<String> uniqueSolved = new HashSet<>();

        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT question_id, created_at FROM attempts WHERE status = 'Accepted' OR status = 'Passed' ORDER BY created_at ASC")) {
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String qId = rs.getString("question_id");
                    String rawCreated = rs.getString("created_at");
                    if (rawCreated == null || rawCreated.isEmpty()) continue;

                    // Extract YYYY-MM-DD
                    String dateStr = rawCreated.length() >= 10 ? rawCreated.substring(0, 10) : rawCreated;
                    heatmap.put(dateStr, heatmap.getOrDefault(dateStr, 0) + 1);
                    if (qId != null) {
                        uniqueSolved.add(qId);
                        dayDistinctProblems.computeIfAbsent(dateStr, k -> new HashSet<>()).add(qId);
                    }
                }
            }
        } catch (SQLException e) {
            log.error("Failed to query attempts for streak calculation: {}", e.getMessage(), e);
        }

        StreakState state = new StreakState();
        state.setDailyGoal(dailyGoal);
        state.setMilestonesAchieved(milestonesAchieved);
        state.setHeatmap(heatmap);
        state.setTotalSolvedUnique(uniqueSolved.size());

        List<String> activeDates = new ArrayList<>(heatmap.keySet());
        Collections.sort(activeDates);
        state.setTotalActiveDays(activeDates.size());

        if (activeDates.isEmpty()) {
            state.setCurrentStreak(0);
            state.setLongestStreak(0);
            state.setSolvedToday(0);
            state.setGoalCompletedToday(false);
            state.setLastActiveDate(null);
            state.setActivityStrip(buildActivityStrip(now, dayDistinctProblems, heatmap));
            return state;
        }

        state.setLastActiveDate(activeDates.get(activeDates.size() - 1));

        // Compute Longest Streak
        List<LocalDate> sortedDates = new ArrayList<>();
        for (String d : activeDates) {
            try {
                sortedDates.add(LocalDate.parse(d, DATE_FORMATTER));
            } catch (Exception ignored) {}
        }

        int longestStreak = 0;
        int tempStreak = 0;
        LocalDate prev = null;

        for (LocalDate d : sortedDates) {
            if (prev == null) {
                tempStreak = 1;
            } else if (ChronoUnit.DAYS.between(prev, d) == 1) {
                tempStreak += 1;
            } else if (ChronoUnit.DAYS.between(prev, d) > 1) {
                tempStreak = 1;
            }
            prev = d;
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }
        }
        state.setLongestStreak(longestStreak);

        // Compute Current Streak
        Set<LocalDate> dateSet = new HashSet<>(sortedDates);
        LocalDate lastActive = sortedDates.get(sortedDates.size() - 1);
        long daysFromToday = ChronoUnit.DAYS.between(lastActive, now);

        int currentStreak = 0;
        if (daysFromToday == 0 || daysFromToday == 1) {
            LocalDate check = lastActive;
            while (dateSet.contains(check)) {
                currentStreak++;
                check = check.minusDays(1);
            }
        } else {
            currentStreak = 0;
        }
        state.setCurrentStreak(currentStreak);

        // Check milestones
        checkAndAwardMilestones(currentStreak);

        // Today's solved
        int solvedToday = dayDistinctProblems.containsKey(todayStr) ? dayDistinctProblems.get(todayStr).size() : 0;
        state.setSolvedToday(solvedToday);
        state.setGoalCompletedToday(solvedToday >= dailyGoal);
        state.setActivityStrip(buildActivityStrip(now, dayDistinctProblems, heatmap));

        return state;
    }

    private List<DayActivity> buildActivityStrip(LocalDate now, Map<String, Set<String>> dayDistinctProblems, Map<String, Integer> heatmap) {
        String[] dayAbbr = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
        List<DayActivity> strip = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate d = now.minusDays(i);
            String dStr = d.format(DATE_FORMATTER);
            int solvedCount = heatmap.getOrDefault(dStr, 0);
            int distinctCount = dayDistinctProblems.containsKey(dStr) ? dayDistinctProblems.get(dStr).size() : 0;
            String dayName = dayAbbr[d.getDayOfWeek().getValue() % 7];
            strip.add(new DayActivity(dStr, dayName, solvedCount, distinctCount, distinctCount >= 1));
        }
        return strip;
    }

    private void checkAndAwardMilestones(int currentStreak) {
        if (currentStreak < 3) return;
        List<Integer> awarded = getAwardedMilestones();
        boolean changed = false;
        for (int m : MILESTONE_TARGETS) {
            if (currentStreak >= m && !awarded.contains(m)) {
                awarded.add(m);
                changed = true;
            }
        }
        if (changed) {
            try (Connection conn = databaseService.getConnection();
                 PreparedStatement stmt = conn.prepareStatement("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('streak_milestones_awarded', ?)")) {
                stmt.setString(1, awarded.toString());
                stmt.executeUpdate();
            } catch (SQLException e) {
                log.warn("Failed to persist milestones: {}", e.getMessage());
            }
        }
    }

    public synchronized Map<String, Object> recordAttempt(String questionId, String problemTitle, String difficulty,
                                                          String category, String language, String code,
                                                          String status, int runtimeMs, int memoryKb) {
        String attemptId = "att-" + UUID.randomUUID().toString();
        String hmac = "hmac-" + UUID.randomUUID().toString().substring(0, 8);
        String createdAt = LocalDate.now().format(DATE_FORMATTER) + " 12:00:00";

        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("""
                 INSERT INTO attempts (id, question_id, problem_title, difficulty, category, language, code, status, runtime_ms, memory_kb, row_hmac, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             """)) {
            stmt.setString(1, attemptId);
            stmt.setString(2, questionId);
            stmt.setString(3, problemTitle);
            stmt.setString(4, difficulty);
            stmt.setString(5, category);
            stmt.setString(6, language);
            stmt.setString(7, code);
            stmt.setString(8, status);
            stmt.setInt(9, runtimeMs);
            stmt.setInt(10, memoryKb);
            stmt.setString(11, hmac);
            stmt.setString(12, createdAt);
            stmt.executeUpdate();
        } catch (SQLException e) {
            log.error("Failed to record attempt: {}", e.getMessage(), e);
        }

        StreakState updated = getStreakState();
        Map<String, Object> result = new HashMap<>();
        result.put("attemptId", attemptId);
        result.put("status", status);
        result.put("streak", updated);

        if (webSocketHandler != null) {
            Map<String, Object> problemPayload = new HashMap<>();
            problemPayload.put("questionId", questionId);
            problemPayload.put("problemTitle", problemTitle);
            problemPayload.put("status", status);
            problemPayload.put("language", language);
            webSocketHandler.broadcast("problem:solved", problemPayload);
            webSocketHandler.broadcast("streak:incremented", updated);
        }

        return result;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setWebSocketHandler(com.ap.backend.websocket.RealtimeWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    private com.ap.backend.websocket.RealtimeWebSocketHandler webSocketHandler;
}

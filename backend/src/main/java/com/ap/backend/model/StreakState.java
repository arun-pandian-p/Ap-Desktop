package com.ap.backend.model;

import java.util.List;
import java.util.Map;

public class StreakState {
    private int currentStreak;
    private int longestStreak;
    private int solvedToday;
    private int dailyGoal;
    private boolean isGoalCompletedToday;
    private int totalActiveDays;
    private int totalSolvedUnique;
    private String lastActiveDate;
    private List<DayActivity> activityStrip;
    private Map<String, Integer> heatmap;
    private List<Integer> milestonesAchieved;

    public StreakState() {}

    public static class DayActivity {
        private String date;
        private String dayName;
        private int solvedCount;
        private int distinctProblems;
        private boolean isCompleted;

        public DayActivity() {}

        public DayActivity(String date, String dayName, int solvedCount, int distinctProblems, boolean isCompleted) {
            this.date = date;
            this.dayName = dayName;
            this.solvedCount = solvedCount;
            this.distinctProblems = distinctProblems;
            this.isCompleted = isCompleted;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getDayName() { return dayName; }
        public void setDayName(String dayName) { this.dayName = dayName; }
        public int getSolvedCount() { return solvedCount; }
        public void setSolvedCount(int solvedCount) { this.solvedCount = solvedCount; }
        public int getDistinctProblems() { return distinctProblems; }
        public void setDistinctProblems(int distinctProblems) { this.distinctProblems = distinctProblems; }
        public boolean isCompleted() { return isCompleted; }
        public void setCompleted(boolean completed) { isCompleted = completed; }
    }

    public int getCurrentStreak() { return currentStreak; }
    public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }
    public int getLongestStreak() { return longestStreak; }
    public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }
    public int getSolvedToday() { return solvedToday; }
    public void setSolvedToday(int solvedToday) { this.solvedToday = solvedToday; }
    public int getDailyGoal() { return dailyGoal; }
    public void setDailyGoal(int dailyGoal) { this.dailyGoal = dailyGoal; }
    public boolean isGoalCompletedToday() { return isGoalCompletedToday; }
    public void setGoalCompletedToday(boolean goalCompletedToday) { isGoalCompletedToday = goalCompletedToday; }
    public int getTotalActiveDays() { return totalActiveDays; }
    public void setTotalActiveDays(int totalActiveDays) { this.totalActiveDays = totalActiveDays; }
    public int getTotalSolvedUnique() { return totalSolvedUnique; }
    public void setTotalSolvedUnique(int totalSolvedUnique) { this.totalSolvedUnique = totalSolvedUnique; }
    public String getLastActiveDate() { return lastActiveDate; }
    public void setLastActiveDate(String lastActiveDate) { this.lastActiveDate = lastActiveDate; }
    public List<DayActivity> getActivityStrip() { return activityStrip; }
    public void setActivityStrip(List<DayActivity> activityStrip) { this.activityStrip = activityStrip; }
    public Map<String, Integer> getHeatmap() { return heatmap; }
    public void setHeatmap(Map<String, Integer> heatmap) { this.heatmap = heatmap; }
    public List<Integer> getMilestonesAchieved() { return milestonesAchieved; }
    public void setMilestonesAchieved(List<Integer> milestonesAchieved) { this.milestonesAchieved = milestonesAchieved; }
}

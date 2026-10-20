package com.ap.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@Service
public class CurriculumService {

    private static final Logger log = LoggerFactory.getLogger(CurriculumService.class);

    private final DatabaseService databaseService;

    public CurriculumService(DatabaseService databaseService) {
        this.databaseService = databaseService;
    }

    public synchronized Map<String, Object> importQuestionsFromCsv(String csvContent, boolean replaceExisting) {
        int importedCount = 0;
        int errorCount = 0;

        if (csvContent == null || csvContent.trim().isEmpty()) {
            return Map.of("success", false, "importedCount", 0, "error", "Empty CSV content");
        }

        String[] lines = csvContent.split("\r?\n");
        if (lines.length <= 1) {
            return Map.of("success", false, "importedCount", 0, "error", "CSV contains only headers or no data");
        }

        String headerLine = lines[0];
        String[] headers = parseCsvRow(headerLine);
        Map<String, Integer> colMap = new HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            colMap.put(headers[i].trim().toLowerCase(), i);
        }

        try (Connection conn = databaseService.getConnection()) {
            if (replaceExisting) {
                try (PreparedStatement stmt = conn.prepareStatement("DELETE FROM questions")) {
                    stmt.executeUpdate();
                }
            }

            String insertSql = """
                INSERT OR REPLACE INTO questions (id, title, platform, difficulty, practice_link, pattern_name, subtopic_name, order_num)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """;

            try (PreparedStatement stmt = conn.prepareStatement(insertSql)) {
                for (int i = 1; i < lines.length; i++) {
                    String line = lines[i].trim();
                    if (line.isEmpty()) continue;

                    String[] row = parseCsvRow(line);
                    String title = getCol(row, colMap, "title", "problem_title", "name");
                    if (title == null || title.isEmpty()) {
                        continue;
                    }

                    String id = getCol(row, colMap, "id", "question_id");
                    if (id == null || id.isEmpty()) {
                        id = "q-csv-" + UUID.randomUUID().toString().substring(0, 8);
                    }

                    String platform = getCol(row, colMap, "platform", "source");
                    if (platform == null) platform = "LeetCode";

                    String difficulty = getCol(row, colMap, "difficulty", "level");
                    if (difficulty == null) difficulty = "Medium";

                    String link = getCol(row, colMap, "practice_link", "url", "link");
                    String pattern = getCol(row, colMap, "pattern_name", "category", "topic");
                    String subtopic = getCol(row, colMap, "subtopic_name", "subtopic");

                    int orderNum = i;
                    String orderStr = getCol(row, colMap, "order_num", "order");
                    if (orderStr != null) {
                        try { orderNum = Integer.parseInt(orderStr); } catch (Exception ignored) {}
                    }

                    stmt.setString(1, id);
                    stmt.setString(2, title);
                    stmt.setString(3, platform);
                    stmt.setString(4, difficulty);
                    stmt.setString(5, link != null ? link : "");
                    stmt.setString(6, pattern != null ? pattern : "General");
                    stmt.setString(7, subtopic != null ? subtopic : "");
                    stmt.setInt(8, orderNum);
                    stmt.addBatch();
                    importedCount++;
                }

                stmt.executeBatch();
            }
        } catch (SQLException e) {
            log.error("Failed to import CSV questions: {}", e.getMessage(), e);
            errorCount++;
        }

        int totalQuestions = 0;
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM questions");
             ResultSet rs = stmt.executeQuery()) {
            if (rs.next()) totalQuestions = rs.getInt(1);
        } catch (SQLException ignored) {}

        Map<String, Object> res = new HashMap<>();
        res.put("success", errorCount == 0);
        res.put("importedCount", importedCount);
        res.put("totalQuestions", totalQuestions);
        return res;
    }

    private String getCol(String[] row, Map<String, Integer> map, String... candidates) {
        for (String c : candidates) {
            Integer idx = map.get(c.toLowerCase());
            if (idx != null && idx < row.length) {
                String val = row[idx].trim();
                if (!val.isEmpty()) return val;
            }
        }
        return null;
    }

    private String[] parseCsvRow(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                tokens.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString().trim());
        return tokens.toArray(new String[0]);
    }
}

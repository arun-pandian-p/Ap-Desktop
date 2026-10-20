package com.ap.backend.controller;

import com.ap.backend.model.StreakState;
import com.ap.backend.service.StreakService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/streak")
public class StreakController {

    private final StreakService streakService;

    public StreakController(StreakService streakService) {
        this.streakService = streakService;
    }

    @GetMapping
    public ResponseEntity<StreakState> getStreak() {
        return ResponseEntity.ok(streakService.getStreakState());
    }

    @PostMapping("/goal")
    public ResponseEntity<Map<String, Object>> setGoal(@RequestBody Map<String, Object> body) {
        int goal = 1;
        if (body.containsKey("goal")) {
            goal = Integer.parseInt(body.get("goal").toString());
        }
        streakService.setDailyGoal(goal);
        return ResponseEntity.ok(Map.of("success", true, "dailyGoal", streakService.getDailyGoal()));
    }

    @PostMapping("/record")
    public ResponseEntity<Map<String, Object>> recordAttempt(@RequestBody Map<String, Object> body) {
        String questionId = (String) body.getOrDefault("questionId", "q-custom");
        String problemTitle = (String) body.getOrDefault("problemTitle", "Coding Problem");
        String difficulty = (String) body.getOrDefault("difficulty", "Medium");
        String category = (String) body.getOrDefault("category", "General");
        String language = (String) body.getOrDefault("language", "python");
        String code = (String) body.getOrDefault("code", "# Solution code");
        String status = (String) body.getOrDefault("status", "Accepted");
        int runtimeMs = body.containsKey("runtimeMs") ? Integer.parseInt(body.get("runtimeMs").toString()) : 50;
        int memoryKb = body.containsKey("memoryKb") ? Integer.parseInt(body.get("memoryKb").toString()) : 12000;

        Map<String, Object> res = streakService.recordAttempt(
            questionId, problemTitle, difficulty, category, language, code, status, runtimeMs, memoryKb
        );
        return ResponseEntity.ok(res);
    }
}

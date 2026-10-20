package com.ap.backend.controller;

import com.ap.backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        return ResponseEntity.ok(analyticsService.getOverview());
    }

    @GetMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> getSnapshot(@RequestParam(value = "range", defaultValue = "7d") String range) {
        return ResponseEntity.ok(analyticsService.getAnalyticsSnapshot(range));
    }
}

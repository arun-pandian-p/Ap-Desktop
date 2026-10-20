package com.ap.backend.controller;

import com.ap.backend.service.CurriculumService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/curriculum")
public class CurriculumController {

    private final CurriculumService curriculumService;

    public CurriculumController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importCsv(@RequestBody Map<String, Object> body) {
        String csvContent = (String) body.get("csvContent");
        boolean replaceExisting = body.containsKey("replaceExisting") && Boolean.parseBoolean(body.get("replaceExisting").toString());

        Map<String, Object> result = curriculumService.importQuestionsFromCsv(csvContent, replaceExisting);
        return ResponseEntity.ok(result);
    }
}

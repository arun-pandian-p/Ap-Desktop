package com.ap.backend.controller;

import com.ap.backend.service.AutomationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/automation")
public class AutomationController {

    private final AutomationService automationService;

    public AutomationController(AutomationService automationService) {
        this.automationService = automationService;
    }

    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> getServices() {
        return ResponseEntity.ok(automationService.getMaskedServicesStatus());
    }

    @PostMapping("/services/{id}")
    public ResponseEntity<Map<String, Object>> saveCredentials(
            @PathVariable("id") String serviceId,
            @RequestBody Map<String, Object> credentials) {
        boolean ok = automationService.saveServiceCredentials(serviceId, credentials);
        return ResponseEntity.ok(Map.of("success", ok, "serviceId", serviceId));
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Map<String, Object>> deleteCredentials(@PathVariable("id") String serviceId) {
        boolean ok = automationService.deleteServiceCredentials(serviceId);
        return ResponseEntity.ok(Map.of("success", ok, "serviceId", serviceId));
    }
}

package com.ap.backend;

import com.ap.backend.service.AutomationService;
import com.ap.backend.service.DatabaseService;
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
    "ap.security.token=auto-test-token",
    "ap.db.path=target/test_automation_service.sqlite"
})
public class AutomationServiceTest {

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private AutomationService automationService;

    @BeforeEach
    public void setup() throws Exception {
        try (Connection conn = databaseService.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("DELETE FROM app_settings WHERE key LIKE 'automation_creds_%';");
        }
    }

    @Test
    public void testInitialMaskedServicesUnconfigured() {
        List<Map<String, Object>> services = automationService.getMaskedServicesStatus();
        assertEquals(4, services.size());

        for (Map<String, Object> s : services) {
            assertEquals("not_configured", s.get("status"));
            assertEquals(false, s.get("isConfigured"));
        }
    }

    @Test
    public void testSaveMaskAndRetrieveCredentials() {
        boolean saved = automationService.saveServiceCredentials("telegram", Map.of(
            "botToken", "MOCK_TELEGRAM_BOT_TOKEN_12345",
            "chatId", "-100987654321"
        ));
        assertTrue(saved);

        List<Map<String, Object>> services = automationService.getMaskedServicesStatus();
        Map<String, Object> telegram = services.stream()
            .filter(s -> "telegram".equals(s.get("id")))
            .findFirst()
            .orElseThrow();

        assertEquals("connected", telegram.get("status"));
        assertEquals(true, telegram.get("isConfigured"));
        String details = (String) telegram.get("details");
        assertNotNull(details);
        assertFalse(details.contains("MOCK_TELEGRAM_BOT_TOKEN_12345"), "Raw token must never leak in masked details");
        assertTrue(details.contains("••••"));

        // Verify retrieval inside backend service
        Map<String, Object> creds = automationService.getDecryptedCredentials("telegram");
        assertNotNull(creds);
        assertEquals("MOCK_TELEGRAM_BOT_TOKEN_12345", creds.get("botToken"));
    }

    @Test
    public void testDeleteCredentialsRevertsToUnconfigured() {
        automationService.saveServiceCredentials("twilio", Map.of(
            "accountSid", "MOCK_TWILIO_ACCOUNT_SID_TEST",
            "authToken", "mock_auth_token_sample_12345",
            "fromPhone", "+15551234567"
        ));

        boolean deleted = automationService.deleteServiceCredentials("twilio");
        assertTrue(deleted);

        List<Map<String, Object>> services = automationService.getMaskedServicesStatus();
        Map<String, Object> twilio = services.stream()
            .filter(s -> "twilio".equals(s.get("id")))
            .findFirst()
            .orElseThrow();

        assertEquals("not_configured", twilio.get("status"));
        assertEquals(false, twilio.get("isConfigured"));
    }
}

package com.ap.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;

@Service
public class AutomationService {

    private static final Logger log = LoggerFactory.getLogger(AutomationService.class);
    private static final String MASTER_ENCRYPTION_PASS = "ap_automation_vault_key_2026";

    private final DatabaseService databaseService;
    private final CryptoService cryptoService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AutomationService(DatabaseService databaseService, CryptoService cryptoService) {
        this.databaseService = databaseService;
        this.cryptoService = cryptoService;
    }

    public synchronized List<Map<String, Object>> getMaskedServicesStatus() {
        List<Map<String, Object>> list = new ArrayList<>();

        Map<String, Object> telegramCreds = getDecryptedCredentials("telegram");
        Map<String, Object> twilioCreds = getDecryptedCredentials("twilio");
        Map<String, Object> googleCreds = getDecryptedCredentials("google");
        Map<String, Object> n8nCreds = getDecryptedCredentials("n8n");

        // 1. Telegram
        boolean tgConfigured = telegramCreds != null && telegramCreds.containsKey("botToken") && telegramCreds.containsKey("chatId");
        Map<String, Object> tg = new HashMap<>();
        tg.put("id", "telegram");
        tg.put("name", "Telegram Bot");
        tg.put("status", tgConfigured ? "connected" : "not_configured");
        tg.put("isConfigured", tgConfigured);
        tg.put("details", tgConfigured ? "Chat ID: " + telegramCreds.get("chatId") + " | Token: " + maskToken((String) telegramCreds.get("botToken")) : "Telegram bot credentials not configured");
        list.add(tg);

        // 2. Twilio
        boolean twilioConfigured = twilioCreds != null && twilioCreds.containsKey("accountSid") && twilioCreds.containsKey("authToken");
        Map<String, Object> tw = new HashMap<>();
        tw.put("id", "twilio");
        tw.put("name", "Twilio SMS/WhatsApp");
        tw.put("status", twilioConfigured ? "connected" : "not_configured");
        tw.put("isConfigured", twilioConfigured);
        tw.put("details", twilioConfigured ? "From: " + maskPhone((String) twilioCreds.get("fromPhone")) + " | SID: " + maskToken((String) twilioCreds.get("accountSid")) : "Twilio credentials not configured");
        list.add(tw);

        // 3. Google Sheets
        boolean googleConfigured = googleCreds != null && googleCreds.containsKey("spreadsheetId");
        Map<String, Object> gg = new HashMap<>();
        gg.put("id", "google");
        gg.put("name", "Google Sheets Sync");
        gg.put("status", googleConfigured ? "connected" : "not_configured");
        gg.put("isConfigured", googleConfigured);
        gg.put("details", googleConfigured ? "Spreadsheet ID: " + maskToken((String) googleCreds.get("spreadsheetId")) : "Google Sheets integration not configured");
        list.add(gg);

        // 4. n8n
        boolean n8nConfigured = n8nCreds != null && n8nCreds.containsKey("webhookUrl");
        Map<String, Object> n8 = new HashMap<>();
        n8.put("id", "n8n");
        n8.put("name", "n8n Webhook Trigger");
        n8.put("status", n8nConfigured ? "connected" : "not_configured");
        n8.put("isConfigured", n8nConfigured);
        n8.put("details", n8nConfigured ? "Webhook: " + maskToken((String) n8nCreds.get("webhookUrl")) : "n8n workflow webhook not configured");
        list.add(n8);

        return list;
    }

    public synchronized boolean saveServiceCredentials(String serviceId, Map<String, Object> credentials) {
        try {
            String json = objectMapper.writeValueAsString(credentials);
            String encrypted = cryptoService.encryptString(json, MASTER_ENCRYPTION_PASS);

            try (Connection conn = databaseService.getConnection();
                 PreparedStatement stmt = conn.prepareStatement("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)")) {
                stmt.setString(1, "automation_creds_" + serviceId);
                stmt.setString(2, encrypted);
                stmt.executeUpdate();
                return true;
            }
        } catch (Exception e) {
            log.error("Failed to encrypt and save credentials for {}: {}", serviceId, e.getMessage(), e);
            return false;
        }
    }

    public synchronized boolean deleteServiceCredentials(String serviceId) {
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("DELETE FROM app_settings WHERE key = ?")) {
            stmt.setString(1, "automation_creds_" + serviceId);
            stmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            log.error("Failed to delete credentials for {}: {}", serviceId, e.getMessage(), e);
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    public synchronized Map<String, Object> getDecryptedCredentials(String serviceId) {
        try (Connection conn = databaseService.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT value FROM app_settings WHERE key = ?")) {
            stmt.setString(1, "automation_creds_" + serviceId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String encrypted = rs.getString("value");
                    String decryptedJson = cryptoService.decryptString(encrypted, MASTER_ENCRYPTION_PASS);
                    return objectMapper.readValue(decryptedJson, Map.class);
                }
            }
        } catch (Exception e) {
            // Unconfigured or failed decryption
        }
        return null;
    }

    private String maskToken(String token) {
        if (token == null || token.trim().isEmpty()) return "••••";
        String s = token.trim();
        if (s.length() <= 8) return "••••••••";
        return s.substring(0, 4) + "••••" + s.substring(s.length() - 4);
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) return "••••";
        String s = phone.trim();
        if (s.length() <= 4) return "••" + s;
        return s.substring(0, 3) + "••••" + s.substring(s.length() - 4);
    }
}

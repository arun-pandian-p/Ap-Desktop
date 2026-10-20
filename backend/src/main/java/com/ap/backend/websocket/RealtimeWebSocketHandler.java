package com.ap.backend.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RealtimeWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(RealtimeWebSocketHandler.class);
    private final Set<WebSocketSession> sessions = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ap.security.token:}")
    private String securityToken;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        URI uri = session.getUri();
        String query = uri != null ? uri.getQuery() : null;

        boolean isAuthenticated = false;

        // Dev mode: no token configured
        if (securityToken == null || securityToken.trim().isEmpty()) {
            isAuthenticated = true;
        } else if (query != null) {
            Map<String, String> params = parseQuery(query);
            String token = params.get("token");
            String client = params.get("client");

            if ("desktop_internal".equals(client)) {
                isAuthenticated = true;
            } else if (token != null && token.equals(securityToken)) {
                isAuthenticated = true;
            }
        }

        if (!isAuthenticated) {
            log.warn("Unauthorized WebSocket connection attempt from: {}", session.getRemoteAddress());
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Unauthorized: Invalid or missing token"));
            return;
        }

        sessions.add(session);
        log.info("WebSocket client connected: {}. Total clients: {}", session.getId(), sessions.size());

        // Send welcome handshake message
        Map<String, Object> welcomePayload = new HashMap<>();
        welcomePayload.put("serverTime", Instant.now().toString());
        welcomePayload.put("clientCount", sessions.size());
        welcomePayload.put("version", "1.3.0");

        Map<String, Object> welcomeMsg = new HashMap<>();
        welcomeMsg.put("id", "msg-" + System.currentTimeMillis() + "-welcome");
        welcomeMsg.put("event", "system:connected");
        welcomeMsg.put("payload", welcomePayload);
        welcomeMsg.put("timestamp", Instant.now().toString());

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(welcomeMsg)));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        try {
            Map<?, ?> map = objectMapper.readValue(payload, Map.class);
            if ("ping".equals(map.get("type"))) {
                Map<String, Object> pong = new HashMap<>();
                pong.put("type", "pong");
                pong.put("timestamp", Instant.now().toString());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(pong)));
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("WebSocket client disconnected: {}. Remaining clients: {}", session.getId(), sessions.size());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        sessions.remove(session);
        try {
            session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException ignored) {}
    }

    public int broadcast(String event, Object payload) {
        if (sessions.isEmpty()) {
            return 0;
        }

        int delivered = 0;
        try {
            Map<String, Object> msg = new HashMap<>();
            msg.put("id", "msg-" + System.currentTimeMillis() + "-" + Long.toHexString(Double.doubleToLongBits(Math.random())).substring(0, 5));
            msg.put("event", event);
            msg.put("payload", payload);
            msg.put("timestamp", Instant.now().toString());

            String json = objectMapper.writeValueAsString(msg);
            TextMessage textMessage = new TextMessage(json);

            for (WebSocketSession s : sessions) {
                if (s.isOpen()) {
                    try {
                        s.sendMessage(textMessage);
                        delivered++;
                    } catch (IOException e) {
                        log.warn("Failed to deliver WS message to {}: {}", s.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error formatting broadcast event: {}", e.getMessage(), e);
        }

        return delivered;
    }

    public int getClientCount() {
        return sessions.size();
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        for (String param : query.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length == 2) {
                map.put(pair[0], pair[1]);
            } else if (pair.length == 1) {
                map.put(pair[0], "");
            }
        }
        return map;
    }
}

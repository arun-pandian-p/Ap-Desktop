package com.ap.backend;

import com.ap.backend.websocket.RealtimeWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "ap.security.token=test-realtime-token",
        "ap.db.path=target/test_realtime_ws.sqlite"
    }
)
public class RealtimeWebSocketTest {

    @LocalServerPort
    private int port;

    @Autowired
    private RealtimeWebSocketHandler handler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void testWebSocketHandshakePingPongAndBroadcast() throws Exception {
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();

        StandardWebSocketClient client = new StandardWebSocketClient();
        String wsUri = "ws://127.0.0.1:" + port + "/ws/realtime?client=desktop_internal";

        WebSocketSession session = client.execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                messages.offer(message.getPayload());
            }
        }, wsUri).get(5, TimeUnit.SECONDS);

        assertNotNull(session, "WebSocket session should be open");
        assertTrue(session.isOpen(), "WebSocket session should be active");

        // 1. Verify system:connected welcome event
        String welcome = messages.poll(5, TimeUnit.SECONDS);
        assertNotNull(welcome, "Should receive system:connected welcome message");
        Map<?, ?> welcomeMap = objectMapper.readValue(welcome, Map.class);
        assertEquals("system:connected", welcomeMap.get("event"));

        // 2. Send Ping and verify Pong
        session.sendMessage(new TextMessage("{\"type\":\"ping\"}"));
        String pong = messages.poll(5, TimeUnit.SECONDS);
        assertNotNull(pong, "Should receive pong response");
        Map<?, ?> pongMap = objectMapper.readValue(pong, Map.class);
        assertEquals("pong", pongMap.get("type"));

        // 3. Test Broadcast
        handler.broadcast("streak:incremented", Map.of("currentStreak", 5));
        String broadcast = messages.poll(5, TimeUnit.SECONDS);
        assertNotNull(broadcast, "Should receive broadcast event");
        Map<?, ?> broadcastMap = objectMapper.readValue(broadcast, Map.class);
        assertEquals("streak:incremented", broadcastMap.get("event"));

        session.close();
    }
}

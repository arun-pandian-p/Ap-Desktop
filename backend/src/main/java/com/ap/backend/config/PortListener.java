package com.ap.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.context.WebServerInitializedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileWriter;

@Component
public class PortListener implements ApplicationListener<WebServerInitializedEvent> {

    private static final Logger log = LoggerFactory.getLogger(PortListener.class);

    @Override
    public void onApplicationEvent(WebServerInitializedEvent event) {
        int port = event.getWebServer().getPort();
        System.out.println("AP_BACKEND_PORT=" + port);
        log.info("Ap Spring Boot Backend active on loopback port: {}", port);

        // Write port to temp file for discovery
        try {
            File tempFile = new File(System.getProperty("java.io.tmpdir"), "ap_backend_port.txt");
            try (FileWriter writer = new FileWriter(tempFile)) {
                writer.write(String.valueOf(port));
            }
        } catch (Exception ignored) {}
    }
}

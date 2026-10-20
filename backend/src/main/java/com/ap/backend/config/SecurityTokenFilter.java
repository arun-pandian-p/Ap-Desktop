package com.ap.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SecurityTokenFilter extends OncePerRequestFilter {

    @Value("${ap.security.token:}")
    private String securityToken;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // 1. Always allow health checks, preflight OPTIONS requests, and WebSocket upgrades
        if (request.getMethod().equalsIgnoreCase("OPTIONS") ||
            path.equals("/api/v1/health") || path.equals("/api/v1/health/") ||
            path.startsWith("/ws/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. If no security token is configured (e.g. dev mode), proceed
        if (securityToken == null || securityToken.trim().isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Allow internal desktop client
        if ("desktop_internal".equals(request.getParameter("client"))) {
            filterChain.doFilter(request, response);
            return;
        }

        // 4. Check X-Ap-Internal-Token header or query parameter
        String providedToken = request.getHeader("X-Ap-Internal-Token");
        if (providedToken == null || providedToken.trim().isEmpty()) {
            providedToken = request.getParameter("token");
        }

        if (providedToken != null && providedToken.trim().equals(securityToken.trim())) {
            filterChain.doFilter(request, response);
            return;
        }

        // 4. Unauthorized rejection
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Missing or invalid X-Ap-Internal-Token\"}");
    }
}

package com.ap.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
    "ap.security.token=secure-test-token-xyz",
    "ap.db.path=target/test_security_db.sqlite"
})
@AutoConfigureMockMvc
public class SecurityTokenFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testProtectedEndpointWithoutTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/protected-test"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testProtectedEndpointWithInvalidTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/protected-test")
                .header("X-Ap-Internal-Token", "wrong-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testHealthIsExemptFromToken() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk());
    }
}

package com.ap.backend;

import com.ap.backend.service.CryptoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "ap.security.token=crypto-test-token",
    "ap.db.path=target/test_crypto_service.sqlite"
})
public class CryptoServiceTest {

    @Autowired
    private CryptoService cryptoService;

    @Test
    public void testPbkdf2KeyDerivationDeterministic() throws Exception {
        byte[] salt = new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16};
        String key1 = cryptoService.deriveKeyHex("MySecretPassphrase", salt);
        String key2 = cryptoService.deriveKeyHex("MySecretPassphrase", salt);
        String keyDifferentPass = cryptoService.deriveKeyHex("DifferentPassphrase", salt);

        assertNotNull(key1);
        assertEquals(64, key1.length(), "256-bit key in hex must be 64 characters");
        assertEquals(key1, key2, "PBKDF2 key derivation must be deterministic");
        assertNotEquals(key1, keyDifferentPass);
    }

    @Test
    public void testAesGcmEncryptionDecryptionRoundtrip() throws Exception {
        String plaintext = "Ap Workspace sensitive payload 2026";
        String password = "SecureMasterPassword#123";

        String encryptedComposite = cryptoService.encryptString(plaintext, password);
        assertNotNull(encryptedComposite);
        assertTrue(encryptedComposite.contains(":"));
        assertFalse(encryptedComposite.contains(plaintext));

        String decrypted = cryptoService.decryptString(encryptedComposite, password);
        assertEquals(plaintext, decrypted, "Decrypted text must match original plaintext");
    }
}

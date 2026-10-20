package com.ap.backend.service;

import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.spec.KeySpec;
import java.util.HexFormat;

@Service
public class CryptoService {

    private static final int PBKDF2_ITERATIONS = 100000;
    private static final int KEY_LENGTH_BITS = 256;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;

    private final SecureRandom secureRandom = new SecureRandom();

    public byte[] generateSalt(int length) {
        byte[] salt = new byte[length];
        secureRandom.nextBytes(salt);
        return salt;
    }

    public byte[] generateIv() {
        return generateSalt(GCM_IV_LENGTH_BYTES);
    }

    public String deriveKeyHex(String password, byte[] salt) throws Exception {
        byte[] derivedKey = deriveKeyBytes(password, salt);
        return HexFormat.of().formatHex(derivedKey);
    }

    public byte[] deriveKeyBytes(String password, byte[] salt) throws Exception {
        KeySpec spec = new PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        return factory.generateSecret(spec).getEncoded();
    }

    public byte[] encryptAesGcm(byte[] plaintext, byte[] keyBytes, byte[] iv) throws Exception {
        SecretKey secretKey = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);
        return cipher.doFinal(plaintext);
    }

    public byte[] decryptAesGcm(byte[] ciphertextWithTag, byte[] keyBytes, byte[] iv) throws Exception {
        SecretKey secretKey = new SecretKeySpec(keyBytes, "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
        return cipher.doFinal(ciphertextWithTag);
    }

    public String encryptString(String plaintext, String password) throws Exception {
        byte[] salt = generateSalt(16);
        byte[] iv = generateIv();
        byte[] keyBytes = deriveKeyBytes(password, salt);
        byte[] ciphertext = encryptAesGcm(plaintext.getBytes(StandardCharsets.UTF_8), keyBytes, iv);

        return HexFormat.of().formatHex(salt) + ":" +
               HexFormat.of().formatHex(iv) + ":" +
               HexFormat.of().formatHex(ciphertext);
    }

    public String decryptString(String encryptedComposite, String password) throws Exception {
        String[] parts = encryptedComposite.split(":");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid encrypted payload format");
        }
        byte[] salt = HexFormat.of().parseHex(parts[0]);
        byte[] iv = HexFormat.of().parseHex(parts[1]);
        byte[] ciphertext = HexFormat.of().parseHex(parts[2]);

        byte[] keyBytes = deriveKeyBytes(password, salt);
        byte[] decrypted = decryptAesGcm(ciphertext, keyBytes, iv);
        return new String(decrypted, StandardCharsets.UTF_8);
    }
}

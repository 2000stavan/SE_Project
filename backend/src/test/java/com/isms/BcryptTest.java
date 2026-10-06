package com.isms;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertTrue;

class BcryptTest {

    @Test
    void generateAndVerifyHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("Password123!");
        assertTrue(encoder.matches("Password123!", hash));
    }

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("FULL_HASH=" + encoder.encode("Password123!"));
    }
}

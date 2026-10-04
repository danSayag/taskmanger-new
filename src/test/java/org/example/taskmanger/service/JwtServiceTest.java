package org.example.taskmanger.service;

import io.jsonwebtoken.JwtException;
import org.example.taskmanger.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRET = "dGVzdC1zZWNyZXQta2V5LWZvci10YXNrbWFuZ2VyLTEyMzQ1";
    private static final String OTHER_SECRET = "YW5vdGhlci1zZWNyZXQta2V5LWZvci10YXNrbWFuZ2VyLTk4NzY=";

    private JwtService jwtService;
    private final User alice = new User("alice", "hash", "alice@example.com");

    private static JwtService jwtService(String secret, long expiration) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey", secret);
        ReflectionTestUtils.setField(service, "jwtExpiration", expiration);
        return service;
    }

    @BeforeEach
    void setUp() {
        jwtService = jwtService(SECRET, 60_000);
    }

    @Test
    void tokenSubjectIsTheUsersEmail() {
        String token = jwtService.generateToken(alice);
        assertEquals("alice@example.com", jwtService.extractUsername(token));
    }

    @Test
    void tokenIsValidForItsOwner() {
        String token = jwtService.generateToken(alice);
        assertTrue(jwtService.isTokenValid(token, alice));
    }

    @Test
    void tokenIsNotValidForAnotherUser() {
        String token = jwtService.generateToken(alice);
        User bob = new User("bob", "hash", "bob@example.com");
        assertFalse(jwtService.isTokenValid(token, bob));
    }

    @Test
    void extraClaimsDoNotChangeTheSubject() {
        String token = jwtService.generateToken(Map.of("role", "ADMIN"), alice);
        assertEquals("alice@example.com", jwtService.extractUsername(token));
    }

    @Test
    void expiredTokenIsRejected() {
        String token = jwtService(SECRET, -1_000).generateToken(alice);
        assertThrows(JwtException.class, () -> jwtService.isTokenValid(token, alice));
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        String forged = jwtService(OTHER_SECRET, 60_000).generateToken(alice);
        assertThrows(JwtException.class, () -> jwtService.extractUsername(forged));
    }

    @Test
    void malformedTokenIsRejected() {
        assertThrows(JwtException.class, () -> jwtService.extractUsername("not-a-jwt"));
    }

    @Test
    void reportsConfiguredExpiration() {
        assertEquals(60_000, jwtService.getJwtExpirationTime());
    }

    @Test
    void startupFailsWhenSecretKeyIsTooShort() {
        JwtService service = jwtService("c2hvcnQ=", 60_000); // "short"
        assertThrows(IllegalStateException.class, service::validateSecretKey);
    }

    @Test
    void startupSucceedsWithValidKey() {
        assertDoesNotThrow(jwtService::validateSecretKey);
    }
}

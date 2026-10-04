package org.example.taskmanger.repository;

import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = new User("alice", "hash", "alice@example.com");
        alice.setVerificationCode("code-123");
        alice = userRepository.save(alice);
    }

    @Test
    void findByEmail() {
        assertEquals(alice.getId(), userRepository.findByEmail("alice@example.com").orElseThrow().getId());
        assertTrue(userRepository.findByEmail("nobody@example.com").isEmpty());
    }

    @Test
    void findByUsername() {
        assertEquals(alice.getId(), userRepository.findByUsername("alice").orElseThrow().getId());
        assertTrue(userRepository.findByUsername("nobody").isEmpty());
    }

    // login accepts either the username or the email
    @Test
    void findByEmailOrUsernameMatchesEither() {
        assertTrue(userRepository.findByEmailOrUsername("alice@example.com", "alice@example.com").isPresent());
        assertTrue(userRepository.findByEmailOrUsername("alice", "alice").isPresent());
        assertTrue(userRepository.findByEmailOrUsername("nobody", "nobody").isEmpty());
    }

    @Test
    void findByVerificationCode() {
        assertEquals(alice.getId(), userRepository.findByVerificationCode("code-123").orElseThrow().getId());
    }

    @Test
    void roleDefaultsToUser() {
        assertEquals(Role.USER, userRepository.findById(alice.getId()).orElseThrow().getRole());
    }

    @Test
    void emailMustBeUnique() {
        User duplicate = new User("alice2", "hash", "alice@example.com");

        assertThrows(DataIntegrityViolationException.class, () -> {
            userRepository.save(duplicate);
            userRepository.findAll(); // forces the insert to be flushed
        });
    }

    @Test
    void usernameMustBeUnique() {
        User duplicate = new User("alice", "hash", "other@example.com");

        assertThrows(DataIntegrityViolationException.class, () -> {
            userRepository.save(duplicate);
            userRepository.findAll();
        });
    }
}

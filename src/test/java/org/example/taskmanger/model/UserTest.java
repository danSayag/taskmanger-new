package org.example.taskmanger.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UserTest {

    @Test
    void securityUsernameIsTheEmail() {
        User user = new User("alice", "hash", "alice@example.com");

        assertEquals("alice@example.com", user.getUsername());
        assertEquals("alice", user.getDisplayName());
    }

    @Test
    void newUsersAreRegularUsers() {
        User user = new User("alice", "hash", "alice@example.com");

        assertEquals(Role.USER, user.getRole());
        assertEquals("ROLE_USER", user.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void adminsGetAdminAuthority() {
        User user = new User("boss", "hash", "boss@example.com");
        user.setRole(Role.ADMIN);

        assertEquals("ROLE_ADMIN", user.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void enabledFlagControlsLogin() {
        User user = new User("alice", "hash", "alice@example.com");
        assertFalse(user.isEnabled());

        user.setEnabled(true);
        assertTrue(user.isEnabled());
        assertTrue(user.isAccountNonExpired());
        assertTrue(user.isAccountNonLocked());
        assertTrue(user.isCredentialsNonExpired());
    }
}

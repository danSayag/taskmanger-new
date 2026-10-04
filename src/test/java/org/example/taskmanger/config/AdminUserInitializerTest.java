package org.example.taskmanger.config;

import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserInitializerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminUserInitializer initializer(String username, String password, String email) {
        AdminUserInitializer initializer = new AdminUserInitializer(userRepository, passwordEncoder);
        ReflectionTestUtils.setField(initializer, "adminUsername", username);
        ReflectionTestUtils.setField(initializer, "adminPassword", password);
        ReflectionTestUtils.setField(initializer, "adminEmail", email);
        return initializer;
    }

    @Test
    void doesNothingWhenNotConfigured() {
        initializer("", "", "").afterSingletonsInstantiated();
        initializer("admin", "", "admin@example.com").afterSingletonsInstantiated();

        verifyNoInteractions(userRepository);
    }

    @Test
    void createsAdminWhenMissing() {
        when(userRepository.findByEmailOrUsername("admin@example.com", "admin")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("encoded");

        initializer("admin", "secret123", "admin@example.com").afterSingletonsInstantiated();

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        User admin = saved.getValue();
        assertEquals("admin", admin.getDisplayName());
        assertEquals("encoded", admin.getPassword());
        assertTrue(admin.isEnabled());
        assertEquals(Role.ADMIN, admin.getRole());
    }

    @Test
    void promotesExistingAccountWithoutChangingPassword() {
        User existing = new User("admin", "old-hash", "admin@example.com");
        when(userRepository.findByEmailOrUsername("admin@example.com", "admin")).thenReturn(Optional.of(existing));

        initializer("admin", "secret123", "admin@example.com").afterSingletonsInstantiated();

        verify(userRepository).save(existing);
        verify(passwordEncoder, never()).encode(any());
        assertEquals(Role.ADMIN, existing.getRole());
        assertEquals("old-hash", existing.getPassword());
    }
}

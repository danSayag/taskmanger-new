package org.example.taskmanger.service;

import org.example.taskmanger.dto.LoginUserDto;
import org.example.taskmanger.dto.RegisterUserDto;
import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthenticationService authenticationService;

    private final RegisterUserDto signup = new RegisterUserDto("alice", "alice@example.com", "password123");

    @Test
    void signupSavesEnabledUserWithEncodedPassword() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("alice")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User user = authenticationService.signup(signup);

        assertEquals("alice", user.getDisplayName());
        assertEquals("alice@example.com", user.getEmail());
        assertEquals("encoded", user.getPassword());
        assertTrue(user.isEnabled());
        assertEquals(Role.USER, user.getRole(), "new accounts must not be admins");
    }

    @Test
    void signupFailsWhenEmailIsRegistered() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(new User()));

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> authenticationService.signup(signup));
        assertEquals("Email already registered", e.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void signupFailsWhenUsernameIsTaken() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(new User()));

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> authenticationService.signup(signup));
        assertEquals("Username already taken", e.getMessage());
    }

    @Test
    void authenticateReturnsTheAuthenticatedUser() {
        User alice = new User("alice", "encoded", "alice@example.com");
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(alice, null, List.of()));

        assertSame(alice, authenticationService.authenticate(new LoginUserDto("alice", "password123")));
        verify(authenticationManager).authenticate(new UsernamePasswordAuthenticationToken("alice", "password123"));
    }

    @Test
    void authenticatePropagatesBadCredentials() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

        assertThrows(BadCredentialsException.class,
                () -> authenticationService.authenticate(new LoginUserDto("alice", "wrong")));
    }
}

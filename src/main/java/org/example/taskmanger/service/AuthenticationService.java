package org.example.taskmanger.service;

import org.example.taskmanger.dto.LoginUserDto;
import org.example.taskmanger.dto.RegisterUserDto;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthenticationService(UserRepository userRepository,
                                 PasswordEncoder passwordEncoder,
                                 AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

    public User signup(RegisterUserDto input) {
        if (userRepository.findByEmail(input.email()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (userRepository.findByUsername(input.username()).isPresent()) {
            throw new IllegalArgumentException("Username already taken");
        }
        User user = new User(input.username(), passwordEncoder.encode(input.password()), input.email());
        // TODO: set to false once email verification (verificationCode) is implemented
        user.setEnabled(true);
        return userRepository.save(user);
    }

    public User authenticate(LoginUserDto input) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(input.username(), input.password()));
        return (User) authentication.getPrincipal();
    }
}

package org.example.taskmanger.config;

import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Creates the default admin account on startup if it doesn't exist yet
@Component
public class AdminUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String adminUsername;
    @Value("${app.admin.password}")
    private String adminPassword;
    @Value("${app.admin.email}")
    private String adminEmail;

    public AdminUserInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmailOrUsername(adminEmail, adminUsername).isPresent()) {
            return;
        }
        User admin = new User(adminUsername, passwordEncoder.encode(adminPassword), adminEmail);
        admin.setEnabled(true);
        userRepository.save(admin);
    }
}

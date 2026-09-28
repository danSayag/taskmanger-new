package org.example.taskmanger.config;

import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Creates the default admin account on startup if it doesn't exist yet.
// Runs before the web server starts, so logins never race the seeding.
@Component
public class AdminUserInitializer implements SmartInitializingSingleton {

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
    public void afterSingletonsInstantiated() {
        if (userRepository.findByEmailOrUsername(adminEmail, adminUsername).isPresent()) {
            return;
        }
        User admin = new User(adminUsername, passwordEncoder.encode(adminPassword), adminEmail);
        admin.setEnabled(true);
        userRepository.save(admin);
    }
}

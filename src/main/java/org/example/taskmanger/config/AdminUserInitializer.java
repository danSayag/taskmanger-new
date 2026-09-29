package org.example.taskmanger.config;

import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

// Creates the admin account from app.admin.* on startup if it doesn't exist yet.
// Optional: when those properties aren't set, nothing is seeded and existing roles are left alone.
// Runs before the web server starts, so logins never race the seeding.
@Component
public class AdminUserInitializer implements SmartInitializingSingleton {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:}")
    private String adminUsername;
    @Value("${app.admin.password:}")
    private String adminPassword;
    @Value("${app.admin.email:}")
    private String adminEmail;

    public AdminUserInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void afterSingletonsInstantiated() {
        if (adminUsername.isBlank() || adminPassword.isBlank() || adminEmail.isBlank()) {
            return;
        }
        User admin = userRepository.findByEmailOrUsername(adminEmail, adminUsername)
                .orElseGet(() -> {
                    User created = new User(adminUsername, passwordEncoder.encode(adminPassword), adminEmail);
                    created.setEnabled(true);
                    return created;
                });
        // the configured account is always an admin, so there is someone who can manage roles
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
    }
}

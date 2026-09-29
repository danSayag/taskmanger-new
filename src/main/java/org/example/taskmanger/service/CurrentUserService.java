package org.example.taskmanger.service;

import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

// The logged-in user, as set by JwtAuthenticationFilter
@Service
public class CurrentUserService {

    public User get() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public boolean isAdmin() {
        return get().getRole() == Role.ADMIN;
    }
}

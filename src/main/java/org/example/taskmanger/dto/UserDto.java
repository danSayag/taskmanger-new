package org.example.taskmanger.dto;

import org.example.taskmanger.model.Role;

public record UserDto(Long id, String username, String email, Role role, long taskCount) {
}

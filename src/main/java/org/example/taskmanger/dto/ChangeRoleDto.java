package org.example.taskmanger.dto;

import jakarta.validation.constraints.NotNull;
import org.example.taskmanger.model.Role;

public record ChangeRoleDto(@NotNull Role role) {
}

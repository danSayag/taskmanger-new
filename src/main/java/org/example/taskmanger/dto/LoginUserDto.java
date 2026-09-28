package org.example.taskmanger.dto;

import jakarta.validation.constraints.NotBlank;

// username accepts either the account's username or its email
public record LoginUserDto(
        @NotBlank String username,
        @NotBlank String password) {
}

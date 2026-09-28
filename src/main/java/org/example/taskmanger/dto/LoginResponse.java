package org.example.taskmanger.dto;

public record LoginResponse(String token, long expiresIn) {
}

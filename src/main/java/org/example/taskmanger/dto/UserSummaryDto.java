package org.example.taskmanger.dto;

// What GET /users returns: just enough to pick someone to message (no email, no role)
public record UserSummaryDto(Long id, String username) {
}

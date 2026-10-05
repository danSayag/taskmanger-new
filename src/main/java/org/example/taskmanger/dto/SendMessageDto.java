package org.example.taskmanger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Body of POST /convo/{convoId}/messages
public record SendMessageDto(
        @NotBlank @Size(max = 2000) String content) {
}

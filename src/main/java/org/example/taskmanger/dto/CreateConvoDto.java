package org.example.taskmanger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// Body of POST /convo: who to talk to and the first message
public record CreateConvoDto(
        @NotNull Long receiverId,
        @NotBlank @Size(max = 2000) String content) {
}

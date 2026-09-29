package org.example.taskmanger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Status;

import java.time.LocalDate;

// Body of POST /task and PUT /task/{taskId}
public record TaskRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        @NotNull Priority priority,
        Status status,              // optional, defaults to TODO
        @NotNull LocalDate dueDate) {
}

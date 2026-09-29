package org.example.taskmanger.dto;

import jakarta.validation.constraints.NotNull;
import org.example.taskmanger.model.Priority;

// Body of PATCH /task/{taskId}/priority
public record ChangePriorityRequest(@NotNull Priority priority) {
}

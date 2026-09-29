package org.example.taskmanger.dto;

import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Status;
import org.example.taskmanger.model.Task;

import java.time.LocalDate;

// What the API returns for a task; never exposes the owner entity (it holds the password hash)
public record TaskResponse(
        Long taskId,
        String title,
        String description,
        Priority priority,
        Status status,
        LocalDate dueDate,
        String ownerName) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                task.getPriority(),
                task.getStatus(),
                // works for java.sql.Date and java.sql.Timestamp, which is what JPA hands back
                task.getDueDate() == null ? null : new java.sql.Date(task.getDueDate().getTime()).toLocalDate(),
                task.getOwner() == null ? null : task.getOwner().getDisplayName());
    }
}

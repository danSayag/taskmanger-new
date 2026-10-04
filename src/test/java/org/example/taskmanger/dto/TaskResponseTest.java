package org.example.taskmanger.dto;

import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Status;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class TaskResponseTest {

    @Test
    void copiesTaskFieldsAndOwnerDisplayName() {
        Task task = new Task("Title", "Desc", Priority.HIGH, java.sql.Date.valueOf("2026-10-04"), Status.DONE);
        task.setTaskId(5L);
        task.setOwner(new User("alice", "hash", "alice@example.com"));

        assertEquals(new TaskResponse(5L, "Title", "Desc", Priority.HIGH, Status.DONE,
                LocalDate.of(2026, 10, 4), "alice"), TaskResponse.from(task));
    }

    // the due_date column is a TIMESTAMP, so JPA may hand back a java.sql.Timestamp
    @Test
    void convertsTimestampDueDate() {
        Task task = new Task("Title", "Desc", Timestamp.valueOf("2026-10-04 00:00:00"));

        assertEquals(LocalDate.of(2026, 10, 4), TaskResponse.from(task).dueDate());
    }

    @Test
    void handlesMissingOwnerAndDueDate() {
        TaskResponse response = TaskResponse.from(new Task());

        assertNull(response.ownerName());
        assertNull(response.dueDate());
    }
}

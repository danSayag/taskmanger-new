package org.example.taskmanger.repository;

import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Status;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.sql.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Runs the Flyway migrations on an in-memory database, so this also checks the schema matches the entities
@DataJpaTest
class TaskRepositoryTest {

    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private UserRepository userRepository;

    private User alice;
    private User bob;

    private Task save(String title, Priority priority, String dueDate, User owner) {
        Task task = new Task(title, "desc", priority, Date.valueOf(dueDate), Status.TODO);
        task.setOwner(owner);
        return taskRepository.save(task);
    }

    private static List<String> titles(List<Task> tasks) {
        return tasks.stream().map(Task::getTitle).sorted().toList();
    }

    @BeforeEach
    void setUp() {
        alice = userRepository.save(new User("alice", "hash", "alice@example.com"));
        bob = userRepository.save(new User("bob", "hash", "bob@example.com"));

        save("Alice high", Priority.HIGH, "2026-10-05", alice);
        save("Alice low", Priority.LOW, "2026-12-01", alice);
        save("Bob high", Priority.HIGH, "2026-10-20", bob);
    }

    @Test
    void savedTaskGetsAnId() {
        Task task = save("New", Priority.MEDIUM, "2026-10-10", alice);

        assertNotNull(task.getTaskId());
        assertEquals("New", taskRepository.findById(task.getTaskId()).orElseThrow().getTitle());
    }

    @Test
    void findByOwner() {
        assertEquals(List.of("Alice high", "Alice low"), titles(taskRepository.findByOwner(alice)));
        assertEquals(List.of("Bob high"), titles(taskRepository.findByOwner(bob)));
    }

    @Test
    void findByPriorityAcrossOwners() {
        assertEquals(List.of("Alice high", "Bob high"), titles(taskRepository.findByPriority(Priority.HIGH)));
    }

    @Test
    void findByOwnerAndPriority() {
        assertEquals(List.of("Alice high"), titles(taskRepository.findByOwnerAndPriority(alice, Priority.HIGH)));
        assertTrue(taskRepository.findByOwnerAndPriority(bob, Priority.LOW).isEmpty());
    }

    @Test
    void dueDateFilterIncludesTheLimitDay() {
        assertEquals(List.of("Alice high"),
                titles(taskRepository.findByOwnerAndDueDateLessThanEqual(alice, Date.valueOf("2026-10-05"))));
        assertTrue(taskRepository.findByOwnerAndDueDateLessThanEqual(alice, Date.valueOf("2026-10-04")).isEmpty());
    }

    @Test
    void dueDateFilterAcrossOwners() {
        assertEquals(List.of("Alice high", "Bob high"),
                titles(taskRepository.findByDueDateLessThanEqual(Date.valueOf("2026-10-31"))));
    }

    @Test
    void countByOwner() {
        assertEquals(2, taskRepository.countByOwner(alice));
        assertEquals(1, taskRepository.countByOwner(bob));
    }

    @Test
    void statusIsStoredAsText() {
        Task task = save("Done one", Priority.LOW, "2026-10-10", alice);
        task.setStatus(Status.IN_PROGRESS);
        taskRepository.saveAndFlush(task);

        assertEquals(Status.IN_PROGRESS, taskRepository.findById(task.getTaskId()).orElseThrow().getStatus());
    }
}

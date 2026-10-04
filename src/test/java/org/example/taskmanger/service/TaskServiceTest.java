package org.example.taskmanger.service;

import org.example.taskmanger.dto.TaskRequest;
import org.example.taskmanger.dto.TaskResponse;
import org.example.taskmanger.exception.PriorityNotChangedException;
import org.example.taskmanger.exception.TaskNotFoundException;
import org.example.taskmanger.exception.UserNotFoundException;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.Status;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserService currentUser;

    private TaskService taskService;

    private User alice;
    private User bob;
    private User admin;

    private static User user(long id, String name, Role role) {
        User user = new User(name, "hash", name + "@example.com");
        user.setId(id);
        user.setRole(role);
        return user;
    }

    private static Task task(long id, String title, String description, User owner) {
        Task task = new Task(title, description, Priority.MEDIUM, Date.valueOf("2026-10-10"));
        task.setTaskId(id);
        task.setOwner(owner);
        return task;
    }

    private static TaskRequest request(String title, Status status) {
        return new TaskRequest(title, "details", Priority.HIGH, status, LocalDate.of(2026, 11, 1));
    }

    private void loggedInAs(User user) {
        lenient().when(currentUser.get()).thenReturn(user);
        lenient().when(currentUser.isAdmin()).thenReturn(user.getRole() == Role.ADMIN);
    }

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, userRepository, currentUser,
                new LevenshteinDistance(new MinMaxService()));
        alice = user(1, "alice", Role.USER);
        bob = user(2, "bob", Role.USER);
        admin = user(3, "admin", Role.ADMIN);
        lenient().when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------- reading ----------

    @Test
    void userSeesOnlyOwnTasks() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(task(1, "Mine", "d", alice)));

        List<TaskResponse> tasks = taskService.getAllTasks();

        assertEquals(1, tasks.size());
        assertEquals("Mine", tasks.get(0).title());
        assertEquals("alice", tasks.get(0).ownerName());
        verify(taskRepository, never()).findAll();
    }

    @Test
    void adminSeesAllTasks() {
        loggedInAs(admin);
        when(taskRepository.findAll()).thenReturn(List.of(task(1, "A", "d", alice), task(2, "B", "d", bob)));

        assertEquals(2, taskService.getAllTasks().size());
        verify(taskRepository, never()).findByOwner(any());
    }

    @Test
    void userCanGetOwnTask() {
        loggedInAs(alice);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task(1, "Mine", "d", alice)));

        assertEquals("Mine", taskService.getTask(1L).title());
    }

    @Test
    void userGetsNotFoundForSomeoneElsesTask() {
        loggedInAs(alice);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5, "Bob's", "d", bob)));

        assertThrows(TaskNotFoundException.class, () -> taskService.getTask(5L));
    }

    @Test
    void adminCanGetSomeoneElsesTask() {
        loggedInAs(admin);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5, "Bob's", "d", bob)));

        assertEquals("Bob's", taskService.getTask(5L).title());
    }

    @Test
    void missingTaskThrowsNotFound() {
        loggedInAs(alice);
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        TaskNotFoundException e = assertThrows(TaskNotFoundException.class, () -> taskService.getTask(99L));
        assertEquals("Task with id 99 not found", e.getMessage());
    }

    @Test
    void taskWithoutOwnerIsHiddenFromUsers() {
        loggedInAs(alice);
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task(7, "Orphan", "d", null)));

        assertThrows(TaskNotFoundException.class, () -> taskService.getTask(7L));
    }

    @Test
    void userFiltersOwnTasksByPriority() {
        loggedInAs(alice);
        when(taskRepository.findByOwnerAndPriority(alice, Priority.HIGH)).thenReturn(List.of());

        assertTrue(taskService.getTasksByPriority(Priority.HIGH).isEmpty());
        verify(taskRepository, never()).findByPriority(any());
    }

    @Test
    void adminFiltersAllTasksByPriority() {
        loggedInAs(admin);
        when(taskRepository.findByPriority(Priority.LOW)).thenReturn(List.of(task(1, "A", "d", bob)));

        assertEquals(1, taskService.getTasksByPriority(Priority.LOW).size());
    }

    @Test
    void userFiltersOwnTasksByDueDate() {
        loggedInAs(alice);
        LocalDate limit = LocalDate.of(2026, 10, 31);
        when(taskRepository.findByOwnerAndDueDateLessThanEqual(alice, Date.valueOf(limit)))
                .thenReturn(List.of(task(1, "Soon", "d", alice)));

        List<TaskResponse> tasks = taskService.getTasksDueBy(limit);

        assertEquals(1, tasks.size());
        assertEquals(LocalDate.of(2026, 10, 10), tasks.get(0).dueDate());
    }

    @Test
    void adminFiltersAllTasksByDueDate() {
        loggedInAs(admin);
        LocalDate limit = LocalDate.of(2026, 10, 31);
        when(taskRepository.findByDueDateLessThanEqual(Date.valueOf(limit))).thenReturn(List.of());

        assertTrue(taskService.getTasksDueBy(limit).isEmpty());
    }

    // ---------- creating ----------

    @Test
    void createdTaskBelongsToCurrentUser() {
        loggedInAs(alice);

        TaskResponse created = taskService.addTask(request("  New task  ", Status.IN_PROGRESS), null);

        ArgumentCaptor<Task> saved = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(saved.capture());
        assertSame(alice, saved.getValue().getOwner());
        assertEquals("New task", created.title(), "title should be trimmed");
        assertEquals(Priority.HIGH, created.priority());
        assertEquals(Status.IN_PROGRESS, created.status());
        assertEquals(LocalDate.of(2026, 11, 1), created.dueDate());
    }

    @Test
    void statusDefaultsToTodo() {
        loggedInAs(alice);

        assertEquals(Status.TODO, taskService.addTask(request("Task", null), null).status());
    }

    @Test
    void passingOwnIdIsSameAsNoOwner() {
        loggedInAs(alice);

        taskService.addTask(request("Task", null), alice.getId());

        verify(userRepository, never()).findById(any());
    }

    @Test
    void adminCanCreateTaskForAnotherUser() {
        loggedInAs(admin);
        when(userRepository.findById(2L)).thenReturn(Optional.of(bob));

        assertEquals("bob", taskService.addTask(request("For Bob", null), 2L).ownerName());
    }

    @Test
    void userCannotCreateTaskForAnotherUser() {
        loggedInAs(alice);

        assertThrows(AccessDeniedException.class, () -> taskService.addTask(request("For Bob", null), 2L));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void adminCreatingTaskForUnknownUserFails() {
        loggedInAs(admin);
        when(userRepository.findById(42L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> taskService.addTask(request("Task", null), 42L));
    }

    // ---------- updating / deleting ----------

    @Test
    void updateKeepsIdAndOwner() {
        loggedInAs(alice);
        Task existing = task(1, "Old", "old", alice);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(existing));

        TaskResponse updated = taskService.updateTask(1L, request("New", Status.DONE));

        assertEquals(1L, updated.taskId());
        assertEquals("New", updated.title());
        assertEquals(Status.DONE, updated.status());
        assertSame(alice, existing.getOwner());
    }

    @Test
    void userCannotUpdateSomeoneElsesTask() {
        loggedInAs(alice);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5, "Bob's", "d", bob)));

        assertThrows(TaskNotFoundException.class, () -> taskService.updateTask(5L, request("Hacked", null)));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void userDeletesOwnTask() {
        loggedInAs(alice);
        Task mine = task(1, "Mine", "d", alice);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(mine));

        taskService.deleteTask(1L);

        verify(taskRepository).delete(mine);
    }

    @Test
    void userCannotDeleteSomeoneElsesTask() {
        loggedInAs(alice);
        when(taskRepository.findById(5L)).thenReturn(Optional.of(task(5, "Bob's", "d", bob)));

        assertThrows(TaskNotFoundException.class, () -> taskService.deleteTask(5L));
        verify(taskRepository, never()).delete(any());
    }

    @Test
    void changePriorityUpdatesTask() {
        loggedInAs(alice);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task(1, "Mine", "d", alice)));

        assertEquals(Priority.HIGH, taskService.changePriority(1L, Priority.HIGH).priority());
    }

    @Test
    void changingToSamePriorityFails() {
        loggedInAs(alice);
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task(1, "Mine", "d", alice)));

        assertThrows(PriorityNotChangedException.class, () -> taskService.changePriority(1L, Priority.MEDIUM));
        verify(taskRepository, never()).save(any());
    }

    // ---------- search ----------

    @Test
    void searchMatchesDescriptionIgnoringCase() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(
                task(1, "Shopping", "Buy GROCERIES today", alice),
                task(2, "Dentist", "Book appointment", alice)));

        List<TaskResponse> results = taskService.searchByDescription("groceries");

        assertEquals(List.of(1L), results.stream().map(TaskResponse::taskId).toList());
    }

    @Test
    void searchMatchesTitle() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(
                task(1, "Pay rent", "Transfer to the landlord", alice),
                task(2, "Dentist", "Book appointment", alice)));

        assertEquals(1L, taskService.searchByDescription("rent").get(0).taskId());
    }

    @Test
    void searchTrimsQuery() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(task(1, "Pay rent", "d", alice)));

        assertEquals(1, taskService.searchByDescription("  rent ").size());
    }

    @Test
    void searchFallsBackToFuzzyMatchOnTypos() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(
                task(1, "Shopping", "groceries", alice),
                task(2, "Money", "bank", alice)));

        List<TaskResponse> results = taskService.searchByDescription("grocries");

        assertEquals(List.of(1L), results.stream().map(TaskResponse::taskId).toList());
    }

    @Test
    void searchHandlesTasksWithoutDescription() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(
                task(1, "No details", null, alice),
                task(2, "Shopping", "groceries", alice)));

        assertDoesNotThrow(() -> taskService.searchByDescription("grocries"));
        assertEquals(1, taskService.searchByDescription("details").size());
    }

    @Test
    void searchReturnsEmptyWhenNothingIsClose() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of(task(1, "Shopping", "groceries", alice)));

        assertTrue(taskService.searchByDescription("xyzzy").isEmpty());
    }

    @Test
    void userSearchOnlyLooksAtOwnTasks() {
        loggedInAs(alice);
        when(taskRepository.findByOwner(alice)).thenReturn(List.of());

        taskService.searchByDescription("anything");

        verify(taskRepository, never()).findAll();
    }

    @Test
    void adminSearchLooksAtAllTasks() {
        loggedInAs(admin);
        when(taskRepository.findAll()).thenReturn(List.of(task(1, "Bob's", "groceries", bob)));

        assertEquals(1, taskService.searchByDescription("groceries").size());
    }
}

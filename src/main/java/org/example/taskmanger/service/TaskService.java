package org.example.taskmanger.service;

import org.example.taskmanger.dto.TaskRequest;
import org.example.taskmanger.dto.TaskResponse;
import org.example.taskmanger.exception.PriorityNotChangedException;
import org.example.taskmanger.exception.TaskNotFoundException;
import org.example.taskmanger.exception.UserNotFoundException;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Status;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

// Users only see and change their own tasks; admins see and change everyone's.
@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUser;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository, CurrentUserService currentUser) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    public List<TaskResponse> getAllTasks() {
        List<Task> tasks = currentUser.isAdmin()
                ? taskRepository.findAll()
                : taskRepository.findByOwner(currentUser.get());
        return toResponses(tasks);
    }

    public TaskResponse getTask(Long taskId) {
        return TaskResponse.from(findAccessibleTask(taskId));
    }

    // ownerId: create the task for another user (admins only); null means the current user
    public TaskResponse addTask(TaskRequest request, Long ownerId) {
        Task task = new Task();
        applyRequest(task, request);
        task.setOwner(resolveOwner(ownerId));
        return TaskResponse.from(taskRepository.save(task));
    }

    // updates the existing row so the task keeps its id and owner
    public TaskResponse updateTask(Long taskId, TaskRequest request) {
        Task task = findAccessibleTask(taskId);
        applyRequest(task, request);
        return TaskResponse.from(taskRepository.save(task));
    }

    public void deleteTask(Long taskId) {
        taskRepository.delete(findAccessibleTask(taskId));
    }

    public TaskResponse changePriority(Long taskId, Priority priority) {
        Task task = findAccessibleTask(taskId);
        if (priority == task.getPriority()) {
            throw new PriorityNotChangedException(taskId);
        }
        task.setPriority(priority);
        return TaskResponse.from(taskRepository.save(task));
    }

    public List<TaskResponse> getTasksByPriority(Priority priority) {
        List<Task> tasks = currentUser.isAdmin()
                ? taskRepository.findByPriority(priority)
                : taskRepository.findByOwnerAndPriority(currentUser.get(), priority);
        return toResponses(tasks);
    }

    public List<TaskResponse> getTasksDueBy(LocalDate dueDate) {
        Date date = Date.valueOf(dueDate);
        List<Task> tasks = currentUser.isAdmin()
                ? taskRepository.findByDueDateLessThanEqual(date)
                : taskRepository.findByOwnerAndDueDateLessThanEqual(currentUser.get(), date);
        return toResponses(tasks);
    }

    // ---------- helpers ----------

    // someone else's task is reported as not found, so ids of other users' tasks aren't revealed
    private Task findAccessibleTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException(taskId));
        boolean isOwner = task.getOwner() != null && task.getOwner().getId().equals(currentUser.get().getId());
        if (!isOwner && !currentUser.isAdmin()) {
            throw new TaskNotFoundException(taskId);
        }
        return task;
    }

    private User resolveOwner(Long ownerId) {
        User me = currentUser.get();
        if (ownerId == null || ownerId.equals(me.getId())) {
            return me;
        }
        if (!currentUser.isAdmin()) {
            throw new AccessDeniedException("Only admins can create tasks for other users");
        }
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new UserNotFoundException("User with id " + ownerId + " not found"));
    }

    private void applyRequest(Task task, TaskRequest request) {
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setPriority(request.priority());
        task.setStatus(request.status() == null ? Status.TODO : request.status());
        task.setDueDate(Date.valueOf(request.dueDate()));
    }

    private List<TaskResponse> toResponses(List<Task> tasks) {
        return tasks.stream().map(TaskResponse::from).toList();
    }
}

package org.example.taskmanger.controller;

import jakarta.validation.Valid;
import org.example.taskmanger.dto.ChangePriorityRequest;
import org.example.taskmanger.dto.TaskRequest;
import org.example.taskmanger.dto.TaskResponse;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.service.TaskService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/task")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<TaskResponse> getAllTasks() {
        return taskService.getAllTasks();
    }

    @GetMapping("/{taskId}")
    public TaskResponse getTask(@PathVariable Long taskId) {
        return taskService.getTask(taskId);
    }

    // ownerId lets an admin create the task for another user
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(@Valid @RequestBody TaskRequest request,
                                   @RequestParam(required = false) Long ownerId) {
        return taskService.addTask(request, ownerId);
    }

    @PutMapping("/{taskId}")
    public TaskResponse updateTask(@PathVariable Long taskId, @Valid @RequestBody TaskRequest request) {
        return taskService.updateTask(taskId, request);
    }

    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable Long taskId) {
        taskService.deleteTask(taskId);
    }

    @PatchMapping("/{taskId}/priority")
    public TaskResponse changePriority(@PathVariable Long taskId, @Valid @RequestBody ChangePriorityRequest request) {
        return taskService.changePriority(taskId, request.priority());
    }

    @GetMapping("/priority/{priority}")
    public List<TaskResponse> getTasksByPriority(@PathVariable Priority priority) {
        return taskService.getTasksByPriority(priority);
    }

    // tasks due on or before the given date (yyyy-MM-dd)
    @GetMapping("/due/{dueDate}")
    public List<TaskResponse> getTasksDueBy(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate) {
        return taskService.getTasksDueBy(dueDate);
    }

    @GetMapping("/search/{query}")
    public List<TaskResponse> searchByDescription(@PathVariable String query) {
        return taskService.searchByDescription(query);
    }
}

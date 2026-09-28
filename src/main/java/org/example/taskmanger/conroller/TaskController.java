package org.example.taskmanger.conroller;

import org.example.taskmanger.model.Task;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/task")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<Task> getAllTasks(){
        return taskService.getAllTasks();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void createTask(@RequestBody Task task){
        taskService.addTask(task);
    }

    @RequestMapping(value = "/{taskId}", method = {RequestMethod.PUT , RequestMethod.POST})
    public void updateTask(@RequestBody Task newTask, @PathVariable Long taskId){
         taskService.updateTask(newTask ,taskId);
    }

    @RequestMapping (value = "/{taskId}" , method = {RequestMethod.DELETE})
    public void deleteTask(@PathVariable Long taskId){
        taskService.deleteTask(taskId);
    }
}

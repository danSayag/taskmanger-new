package org.example.taskmanger.conroller;

import org.example.taskmanger.model.Task;
import org.example.taskmanger.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.List;
import java.util.Locale.Category;

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
    public void createTask(@RequestBody Task task, @RequestParam(required = false) Long ownerId){
        // ownerId lets an admin create the task for another user
        taskService.addTask(task, ownerId);
    }


    @RequestMapping(value = "/{taskId}", method = {RequestMethod.PUT , RequestMethod.POST})
    public void updateTask(@RequestBody Task newTask, @PathVariable Long taskId){
         taskService.updateTask(newTask ,taskId);
    }


    @RequestMapping (value = "/{taskId}" , method = {RequestMethod.DELETE})
    public void deleteTask(@PathVariable Long taskId){
        taskService.deleteTask(taskId);
    }


    @RequestMapping(value = "/{taskId}/{newPriority}" ,  method = {RequestMethod.POST})
    public void changeCategory(@PathVariable Long taskId, @PathVariable String newPriority){
        taskService.changePriority(taskId,newPriority);
    }


    @RequestMapping(value = "/priority/{priority}", method = {RequestMethod.GET})
    public List<Task> getTasksByPriority(@PathVariable String priority){
        return taskService.getTasksByPriority(priority);
    }

    @RequestMapping(value = "/due/{dueDate}", method = {RequestMethod.GET})
    public List<Task> getTaskUpToADueDate(@PathVariable Date dueDate){
        return taskService.getTaskUpToADueDate(dueDate);
    }
}

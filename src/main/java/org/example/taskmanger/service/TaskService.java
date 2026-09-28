package org.example.taskmanger.service;

import org.example.taskmanger.exeptions.TaskNotFoundException;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private HashMap<Priority , Task> priorityMap;

    public TaskService(
            TaskRepository taskRepository,
            HashMap<Priority , List<Task>> priorityMap) {
        this.taskRepository = taskRepository;
        this.priorityMap = new HashMap<>();
    }

    public List<Task> getAllTasks(){
        return (List<Task>) taskRepository.findAll();
    }

    public Task getTaskById(Long taskId){
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException(taskId));
    }

    public void addTask(Task task){
        if(task == null){
            throw new IllegalArgumentException("Task object cannot be null");
        }
        if(task.getTitle() == null || task.getDueDate() == null){
            throw new IllegalArgumentException("Task title or due date cannot be null");
        }
        priorityMap.put(task.getPriority(), task);
        taskRepository.save(task);
    }


    public void updateTask(Task newTask , Long taskId){
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException(taskId));

        taskRepository.deleteById(taskId);
        taskRepository.save(newTask);
    }

    public void deleteTask(Long taskId){
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new TaskNotFoundException(taskId));
        
        taskRepository.delete(task);
    }

}

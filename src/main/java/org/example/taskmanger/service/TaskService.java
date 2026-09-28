package org.example.taskmanger.service;

import org.example.taskmanger.exeptions.TaskNotFoundException;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private Map<Priority , List<Task>> priorityMap = new EnumMap<>(Priority.class);

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
        
        for (Priority p : Priority.values()) {
            priorityMap.put(p, new ArrayList<>());
        }
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
        taskRepository.save(task);
        updateMap(task);
    }


    public void updateTask(Task newTask , Long taskId){
        taskRepository.findById(taskId)
                      .orElseThrow(() -> new TaskNotFoundException(taskId));

        taskRepository.deleteById(taskId);
        taskRepository.save(newTask);
        updateMap(newTask);
    }


    public void deleteTask(Long taskId){
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new TaskNotFoundException(taskId));
        taskRepository.delete(task);
        deletFromMap(task);
    }



    // Map manipulation  

    // I dont think I need this but Ill leave it anyway
    // private Map<Priority, List<Task>> createMap(){
    //     return taskRepository.findAll().stream().collect(Collectors.groupingBy(Task::getPriority));
    // }


    private void updateMap(Task task){
        priorityMap.computeIfAbsent(task.getPriority(), p -> new ArrayList<>()).add(task);
    }


    private void deletFromMap(Task task){
        priorityMap.get(task.getPriority()).remove(task);
    }

}

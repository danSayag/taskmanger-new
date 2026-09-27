package org.example.taskmanger.service;

import org.example.taskmanger.exeptions.TaskNotFoundException;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> getAllTasks(){
        return (List<Task>) taskRepository.findAll();
    }

    public Task getTaskById(Long id, Task newTask){
        return taskRepository.findById(id).get();
    }

    public void addTask(Task task){
        taskRepository.save(task);
    }


    public void updateTask(Task newTask , Long taskId){
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException(taskId));

        taskRepository.deleteById(taskId);
        taskRepository.save(newTask);
    }

    public void deleteTask(Task task){
        taskRepository.delete(task);
    }

}

package org.example.taskmanger.exeptions;

public class TaskNotFoundException extends RuntimeException {


    public TaskNotFoundException(Long taskId){
        super("Task with id " + taskId + " not found");
    }
}

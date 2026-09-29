package org.example.taskmanger.exception;

public class PriorityNotChangedException extends RuntimeException {


    public PriorityNotChangedException(Long taskId){
        super("Priority of task " + taskId + " has not changed");
    }
}

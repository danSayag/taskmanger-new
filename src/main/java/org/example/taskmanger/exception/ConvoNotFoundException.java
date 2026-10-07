package org.example.taskmanger.exception;

public class ConvoNotFoundException extends RuntimeException {

    public ConvoNotFoundException(Long convoId){
        super("convo with id " + convoId + " not found");
    }
    
}

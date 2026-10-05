package org.example.taskmanger.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity 
@Getter 
@Setter 
public class Message {

    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageId;
    
    @Column(nullable = false)
    private Long senderId;

    @Column(nullable = false)
    private Long getterId;

    @Column(nullable = false)
    private String content;

    public Message(){}
    
    public Message(Long senderId, Long getterId, String content){
        this.senderId = senderId;
        this.getterId = getterId;
        this.content = content;
    }
}

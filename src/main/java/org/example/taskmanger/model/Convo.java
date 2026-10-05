package org.example.taskmanger.model;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import lombok.Getter;
import lombok.Setter;

@Entity 
@Getter 
@Setter 
public class Convo{

    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long convoId;

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "convo_id")
    private List<Message> messages;

    public Convo(){}

    public Convo(List<Message> messages){
        this.messages = messages;
    }
    
}

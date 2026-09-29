package org.example.taskmanger.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Entity
@Getter
@Setter
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long taskId;

    @NotNull 
    @Enumerated(EnumType.STRING)
    private Priority priority;

    // unique per owner (see V4 migration)
    private String title;

    private String description;

    @NotNull
    private Date dueDate;

    @NotNull 
    @Enumerated(EnumType.STRING)
    private Status status;



    // never serialized: it would expose the owner's password hash
    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User owner;



    public Task() {}


    public Task(String title, String description, Date dueDate) {
        this.title = title;
        this.description = description;
        this.priority = Priority.MEDIUM;
        this.dueDate = dueDate;
        this.status = Status.TODO;
    }


    public Task(String title, String description, Priority priority , Date dueDate) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.dueDate = dueDate;
        this.status = Status.TODO;
    }


    public Task(String title, String description, Priority priority , Date dueDate ,Status status) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.dueDate = dueDate;
        this.status = status;
    }







    // shown to admins on the board and list pages
    @JsonProperty("ownerName")
    public String getOwnerName() {
        return owner == null ? null : owner.getDisplayName();
    }
}

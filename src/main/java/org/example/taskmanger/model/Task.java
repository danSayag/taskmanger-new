package org.example.taskmanger.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Entity
@Getter
@Setter
@Table(name = "tasks")
public class Task {

    @id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Priority priority;

    @Column(unique = true)
    private String title;

    private String description;

    @NotNull
    private Date dueDate;



    public Task() {}

    public Task(String title, String description, Date dueDate) {
        this.title = title;
        this.description = description;
        priority = Priority.MEDIUM;
        this.dueDate = dueDate;
    }

    public Task(String title, String description, Priority priority , Date dueDate) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.dueDate = dueDate;
    }



}

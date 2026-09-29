package org.example.taskmanger.repository;

import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task,Long> {

    List<Task> findByPriority(Priority priority);

    List<Task> findByOwner(User owner);

    List<Task> findByOwnerAndPriority(User owner, Priority priority);

    List<Task> findByOwnerAndDueDateLessThanEqual(User owner, Date dueDate);

    long countByOwner(User owner);

    List<Task> findByDueDateLessThanEqual(Date dueDate);
}

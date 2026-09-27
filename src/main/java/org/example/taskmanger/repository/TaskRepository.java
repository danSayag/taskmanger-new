package org.example.taskmanger.repository;

import org.example.taskmanger.model.Task;
import org.springframework.data.repository.CrudRepository;

public interface TaskRepository extends CrudRepository<Task,Long> {
}

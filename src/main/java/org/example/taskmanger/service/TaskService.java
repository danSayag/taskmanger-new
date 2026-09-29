package org.example.taskmanger.service;

import org.example.taskmanger.exception.PriorityNotChangedException;
import org.example.taskmanger.exception.TaskNotFoundException;
import org.example.taskmanger.exception.UserNotFoundException;
import org.example.taskmanger.model.Priority;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.util.List;

// Users only see and change their own tasks; admins see and change everyone's.
@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final CurrentUserService currentUser;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository, CurrentUserService currentUser, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.currentUser = currentUser;
        this.userRepository = userRepository;
    }

    public List<Task> getAllTasks(){
        if (currentUser.isAdmin()) {
            return taskRepository.findAll();
        }
        return taskRepository.findByOwner(currentUser.get());
    }

    // someone else's task is reported as not found, so ids of other users' tasks aren't revealed
    public Task getTaskById(Long taskId){
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException(taskId));
        boolean isOwner = task.getOwner() != null && task.getOwner().getId().equals(currentUser.get().getId());
        if (!isOwner && !currentUser.isAdmin()) {
            throw new TaskNotFoundException(taskId);
        }
        return task;
    }



    public void addTask(Task task){
        addTask(task, null);
    }

    // ownerId: create the task for another user (admins only); null means the current user
    public void addTask(Task task, Long ownerId){
        if(task == null){
            throw new IllegalArgumentException("Task object cannot be null");
        }
        if(task.getTitle() == null || task.getDueDate() == null){
            throw new IllegalArgumentException("Task title or due date cannot be null");
        }
        task.setTaskId(null);
        task.setOwner(resolveOwner(ownerId));
        taskRepository.save(task);
    }


    // copies the new values onto the existing row so the task keeps its id and owner
    public void updateTask(Task newTask , Long taskId){
        Task task = getTaskById(taskId);
        task.setTitle(newTask.getTitle());
        task.setDescription(newTask.getDescription());
        task.setPriority(newTask.getPriority());
        task.setDueDate(newTask.getDueDate());
        task.setStatus(newTask.getStatus());
        taskRepository.save(task);
    }


    public void deleteTask(Long taskId){
        Task task = getTaskById(taskId);
        taskRepository.delete(task);
    }



    public void changePriority(Long taskId, String newPriority) {
        Priority priority = Priority.valueOf(newPriority);
        Task task = getTaskById(taskId);

        if(priority == task.getPriority()){
            throw new PriorityNotChangedException(taskId);
        }
        task.setPriority(priority);
        taskRepository.save(task);
    }


    private User resolveOwner(Long ownerId) {
        User me = currentUser.get();
        if (ownerId == null || ownerId.equals(me.getId())) {
            return me;
        }
        if (!currentUser.isAdmin()) {
            throw new AccessDeniedException("Only admins can create tasks for other users");
        }
        return userRepository.findById(ownerId)
                .orElseThrow(() -> new UserNotFoundException("User with id " + ownerId + " not found"));
    }


    public List<Task> getTasksByPriority(String priorityStr){
        Priority priority = Priority.valueOf(priorityStr);
        if (currentUser.isAdmin()) {
            return taskRepository.findByPriority(priority);
        }
        return taskRepository.findByOwnerAndPriority(currentUser.get(), priority);
    }


    public List<Task> getTaskUpToADueDate(Date dueDate) {
        if (currentUser.isAdmin()) {
            return taskRepository.findByDueDateLessThanEqual(dueDate);
        }
        return taskRepository.findByOwnerAndDueDateLessThanEqual(currentUser.get(), dueDate);
    }
}

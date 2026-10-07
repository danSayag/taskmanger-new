package org.example.taskmanger.service;

import org.example.taskmanger.dto.CreateUserDto;
import org.example.taskmanger.dto.UserDto;
import org.example.taskmanger.dto.UserSummaryDto;
import org.example.taskmanger.exception.UserNotFoundException;
import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.StreamSupport;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final CurrentUserService currentUser;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, TaskRepository taskRepository,
                       CurrentUserService currentUser, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.currentUser = currentUser;
        this.passwordEncoder = passwordEncoder;
    }

    public UserDto getCurrentUser() {
        return toDto(currentUser.get());
    }

    public List<UserDto> getAllUsers() {
        return StreamSupport.stream(userRepository.findAll().spliterator(), false)
                .map(this::toDto)
                .toList();
    }

    // every user, with only their id and username
    public List<UserSummaryDto> getUserSummaries() {
        return StreamSupport.stream(userRepository.findAll().spliterator(), false)
                .map(user -> new UserSummaryDto(user.getId(), user.getDisplayName()))
                .toList();
    }

    public UserDto createUser(CreateUserDto input) {
        if (userRepository.findByEmail(input.email()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }
        if (userRepository.findByUsername(input.username()).isPresent()) {
            throw new IllegalArgumentException("Username already taken");
        }
        User user = new User(input.username(), passwordEncoder.encode(input.password()), input.email());
        user.setEnabled(true);
        user.setRole(input.role());
        
        return toDto(userRepository.save(user));
    }

    public UserDto changeRole(Long userId, Role role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with id " + userId + " not found"));

        // stops an admin from locking themselves (and possibly everyone) out of the admin panel
        if (user.getId().equals(currentUser.get().getId())) {
            throw new IllegalArgumentException("You can't change your own role");
        }
        user.setRole(role);
        return toDto(userRepository.save(user));
    }

    // deletes the user together with all of their tasks
    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with id " + userId + " not found"));
        if (user.getId().equals(currentUser.get().getId())) {
            throw new IllegalArgumentException("You can't delete your own account");
        }
        taskRepository.deleteAll(taskRepository.findByOwner(user));
        userRepository.delete(user);
    }

    private UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getDisplayName(), user.getEmail(), user.getRole(),
                taskRepository.countByOwner(user));
    }
}

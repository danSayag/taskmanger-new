package org.example.taskmanger.controller;

import jakarta.validation.Valid;
import org.example.taskmanger.dto.ChangeRoleDto;
import org.example.taskmanger.dto.CreateUserDto;
import org.example.taskmanger.dto.UserDto;
import org.example.taskmanger.dto.UserSummaryDto;
import org.example.taskmanger.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/me")
    public UserDto getCurrentUser() {
        return userService.getCurrentUser();
    }

    // everyone you can message; used by the "+ New message" picker on messages.html
    @GetMapping("/users")
    public List<UserSummaryDto> getUsers() {
        // TODO: return every user as a UserSummaryDto
        throw new UnsupportedOperationException("TODO");
    }

    // /admin/** is restricted to ROLE_ADMIN in SecurityConfiguration
    @GetMapping("/admin/users")
    public List<UserDto> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/admin/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createUser(@Valid @RequestBody CreateUserDto createUserDto) {
        return userService.createUser(createUserDto);
    }

    @DeleteMapping("/admin/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long userId) {
        userService.deleteUser(userId);
    }

    @PutMapping("/admin/users/{userId}/role")
    public UserDto changeRole(@PathVariable Long userId, @Valid @RequestBody ChangeRoleDto changeRoleDto) {
        return userService.changeRole(userId, changeRoleDto.role());
    }
}

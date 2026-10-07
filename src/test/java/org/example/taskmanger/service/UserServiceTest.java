package org.example.taskmanger.service;

import org.example.taskmanger.dto.CreateUserDto;
import org.example.taskmanger.dto.UserDto;
import org.example.taskmanger.dto.UserSummaryDto;
import org.example.taskmanger.exception.UserNotFoundException;
import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.Task;
import org.example.taskmanger.model.User;
import org.example.taskmanger.model.Convo;
import org.example.taskmanger.repository.ConvoRepository;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ConvoRepository convoRepository;
    @Mock
    private CurrentUserService currentUser;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User admin;
    private User alice;

    private static User user(long id, String name, Role role) {
        User user = new User(name, "hash", name + "@example.com");
        user.setId(id);
        user.setRole(role);
        return user;
    }

    @BeforeEach
    void setUp() {
        admin = user(1, "admin", Role.ADMIN);
        alice = user(2, "alice", Role.USER);
        lenient().when(currentUser.get()).thenReturn(admin);
        lenient().when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void currentUserIsReturnedWithTaskCount() {
        when(taskRepository.countByOwner(admin)).thenReturn(4L);

        assertEquals(new UserDto(1L, "admin", "admin@example.com", Role.ADMIN, 4L), userService.getCurrentUser());
    }

    @Test
    void listsAllUsers() {
        when(userRepository.findAll()).thenReturn(List.of(admin, alice));
        when(taskRepository.countByOwner(admin)).thenReturn(0L);
        when(taskRepository.countByOwner(alice)).thenReturn(2L);

        List<UserDto> users = userService.getAllUsers();

        assertEquals(List.of("admin", "alice"), users.stream().map(UserDto::username).toList());
        assertEquals(2L, users.get(1).taskCount());
    }

    @Test
    void createsEnabledUserWithEncodedPasswordAndRole() {
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("newbie")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("encoded");

        UserDto created = userService.createUser(new CreateUserDto("newbie", "new@example.com", "password123", Role.ADMIN));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals("encoded", saved.getValue().getPassword());
        assertTrue(saved.getValue().isEnabled());
        assertEquals(Role.ADMIN, created.role());
        assertEquals("newbie", created.username());
    }

    @Test
    void createFailsWhenEmailIsTaken() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(alice));

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                userService.createUser(new CreateUserDto("other", "alice@example.com", "password123", Role.USER)));
        assertEquals("Email already registered", e.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void createFailsWhenUsernameIsTaken() {
        when(userRepository.findByEmail("x@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));

        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () ->
                userService.createUser(new CreateUserDto("alice", "x@example.com", "password123", Role.USER)));
        assertEquals("Username already taken", e.getMessage());
    }

    @Test
    void changesAnotherUsersRole() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(alice));

        assertEquals(Role.ADMIN, userService.changeRole(2L, Role.ADMIN).role());
        assertEquals(Role.ADMIN, alice.getRole());
    }

    @Test
    void cannotChangeOwnRole() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThrows(IllegalArgumentException.class, () -> userService.changeRole(1L, Role.USER));
        assertEquals(Role.ADMIN, admin.getRole());
        verify(userRepository, never()).save(any());
    }

    @Test
    void changeRoleOfUnknownUserFails() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.changeRole(99L, Role.ADMIN));
    }

    @Test
    void deletingUserAlsoDeletesTheirTasks() {
        List<Task> tasks = List.of(new Task(), new Task());
        when(userRepository.findById(2L)).thenReturn(Optional.of(alice));
        when(taskRepository.findByOwner(alice)).thenReturn(tasks);

        userService.deleteUser(2L);

        verify(taskRepository).deleteAll(tasks);
        verify(userRepository).delete(alice);
    }

    @Test
    void deletingUserAlsoDeletesTheirConversations() {
        List<Convo> convos = List.of(new Convo(), new Convo());
        when(userRepository.findById(2L)).thenReturn(Optional.of(alice));
        when(convoRepository.findDistinctByMessagesSenderIdOrMessagesReceiverId(2L, 2L)).thenReturn(convos);

        userService.deleteUser(2L);

        // conversations go before the user, since their messages point at the user
        var order = inOrder(convoRepository, userRepository);
        order.verify(convoRepository).deleteAll(convos);
        order.verify(userRepository).delete(alice);
    }

    @Test
    void userSummariesHaveTheNameButNotTheEmail() {
        when(userRepository.findAll()).thenReturn(List.of(admin, alice));

        List<UserSummaryDto> users = userService.getUserSummaries();

        // getUsername() is the email (Spring Security logs in by email); summaries must use the display name
        assertEquals(List.of(new UserSummaryDto(1L, "admin"), new UserSummaryDto(2L, "alice")), users);
    }

    @Test
    void cannotDeleteOwnAccount() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        assertThrows(IllegalArgumentException.class, () -> userService.deleteUser(1L));
        verify(userRepository, never()).delete(any());
    }

    @Test
    void deletingUnknownUserFails() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> userService.deleteUser(99L));
    }
}

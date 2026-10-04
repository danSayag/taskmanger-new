package org.example.taskmanger.api;

import com.jayway.jsonpath.JsonPath;
import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.TaskRepository;
import org.example.taskmanger.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Starts the whole app on an in-memory database and calls it over HTTP with real JWTs.
// Every test starts with no users and no tasks.
@SpringBootTest
@AutoConfigureMockMvc
abstract class ApiTestSupport {

    static final String PASSWORD = "password123";

    @Autowired
    MockMvc mvc;
    @Autowired
    UserRepository userRepository;
    @Autowired
    TaskRepository taskRepository;
    @Autowired
    PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanDatabase() {
        taskRepository.deleteAll();
        userRepository.deleteAll();
    }

    // ---------- users ----------

    void signup(String username) throws Exception {
        mvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "%s", "email": "%s@example.com", "password": "%s"}
                                """.formatted(username, username, PASSWORD)))
                .andExpect(status().isCreated());
    }

    String login(String username) throws Exception {
        String body = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "%s", "password": "%s"}
                                """.formatted(username, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    // signs up and logs in a regular user; returns their token
    String userToken(String username) throws Exception {
        signup(username);
        return login(username);
    }

    // admins can't sign up through the API, so they're saved directly
    String adminToken(String username) throws Exception {
        User admin = new User(username, passwordEncoder.encode(PASSWORD), username + "@example.com");
        admin.setEnabled(true);
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        return login(username);
    }

    long userId(String username) {
        return userRepository.findByUsername(username).orElseThrow().getId();
    }

    // ---------- tasks ----------

    static String taskJson(String title, String priority, String dueDate) {
        return """
                {"title": "%s", "description": "about %s", "priority": "%s", "dueDate": "%s"}
                """.formatted(title, title, priority, dueDate);
    }

    // creates a task as the token's user and returns its id
    long createTask(String token, String title, String priority, String dueDate) throws Exception {
        String body = mvc.perform(post("/task").with(bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(taskJson(title, priority, dueDate)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.taskId")).longValue();
    }

    long createTask(String token, String title) throws Exception {
        return createTask(token, title, "MEDIUM", "2026-10-10");
    }

    static RequestPostProcessor bearer(String token) {
        return request -> {
            request.addHeader("Authorization", "Bearer " + token);
            return request;
        };
    }

    static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder builder, String body) {
        return builder.contentType(MediaType.APPLICATION_JSON).content(body);
    }
}

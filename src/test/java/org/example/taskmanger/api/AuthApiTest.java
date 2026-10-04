package org.example.taskmanger.api;

import org.example.taskmanger.model.User;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthApiTest extends ApiTestSupport {

    @Test
    void signupThenLoginWithUsernameReturnsToken() throws Exception {
        signup("alice");

        mvc.perform(json(post("/auth/login"), """
                        {"username": "alice", "password": "password123"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresIn").value(3600000));
    }

    @Test
    void loginWithEmailAlsoWorks() throws Exception {
        signup("alice");

        mvc.perform(json(post("/auth/login"), """
                        {"username": "alice@example.com", "password": "password123"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void wrongPasswordIsUnauthorized() throws Exception {
        signup("alice");

        mvc.perform(json(post("/auth/login"), """
                        {"username": "alice", "password": "wrong-password"}
                        """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void unknownUserIsUnauthorized() throws Exception {
        mvc.perform(json(post("/auth/login"), """
                        {"username": "ghost", "password": "password123"}
                        """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void disabledAccountCannotLogIn() throws Exception {
        User user = new User("sleepy", passwordEncoder.encode(PASSWORD), "sleepy@example.com");
        user.setEnabled(false);
        userRepository.save(user);

        mvc.perform(json(post("/auth/login"), """
                        {"username": "sleepy", "password": "password123"}
                        """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("Account is not verified"));
    }

    @Test
    void signupWithTakenEmailFails() throws Exception {
        signup("alice");

        mvc.perform(json(post("/auth/signup"), """
                        {"username": "alice2", "email": "alice@example.com", "password": "password123"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Email already registered"));
    }

    @Test
    void signupWithTakenUsernameFails() throws Exception {
        signup("alice");

        mvc.perform(json(post("/auth/signup"), """
                        {"username": "alice", "email": "other@example.com", "password": "password123"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Username already taken"));
    }

    @Test
    void signupValidatesFields() throws Exception {
        mvc.perform(json(post("/auth/signup"), """
                        {"username": "", "email": "not-an-email", "password": "short"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Validation failed"))
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void malformedJsonIsBadRequest() throws Exception {
        mvc.perform(json(post("/auth/login"), "{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Malformed request body"));
    }

    // ---------- tokens ----------

    @Test
    void requestWithoutTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/task"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value(containsString("Missing token")));
    }

    @Test
    void invalidTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/task").with(bearer("not.a.jwt")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or expired token"));
    }

    @Test
    void tokenOfDeletedUserIsUnauthorized() throws Exception {
        String token = userToken("alice");
        userRepository.deleteAll();

        mvc.perform(get("/task").with(bearer(token)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or expired token"));
    }

    @Test
    void currentUserEndpointReturnsMe() throws Exception {
        String token = userToken("alice");
        createTask(token, "One");

        mvc.perform(get("/users/me").with(bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.taskCount").value(1))
                .andExpect(content().string(not(containsString("password"))));
    }

    // ---------- public pages ----------

    @Test
    void frontendPagesArePublic() throws Exception {
        mvc.perform(get("/login.html")).andExpect(status().isOk());
        mvc.perform(get("/javascript/common.js")).andExpect(status().isOk());
        mvc.perform(get("/css/style.css")).andExpect(status().isOk());
    }
}

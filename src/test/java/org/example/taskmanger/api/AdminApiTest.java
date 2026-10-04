package org.example.taskmanger.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminApiTest extends ApiTestSupport {

    private String admin;
    private String alice;

    @BeforeEach
    void logIn() throws Exception {
        admin = adminToken("boss");
        alice = userToken("alice");
    }

    @Test
    void regularUsersCannotUseAdminEndpoints() throws Exception {
        mvc.perform(get("/admin/users").with(bearer(alice)))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/admin/users/{id}", userId("boss")).with(bearer(alice)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpointsNeedAToken() throws Exception {
        mvc.perform(get("/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listsUsersWithTaskCounts() throws Exception {
        createTask(alice, "One");
        createTask(alice, "Two");

        mvc.perform(get("/admin/users").with(bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].username", containsInAnyOrder("boss", "alice")))
                .andExpect(jsonPath("$[?(@.username == 'alice')].taskCount", contains(2)))
                .andExpect(jsonPath("$[?(@.username == 'boss')].role", contains("ADMIN")))
                .andExpect(content().string(not(containsString("password"))));
    }

    @Test
    void createdUserCanLogIn() throws Exception {
        mvc.perform(json(post("/admin/users").with(bearer(admin)), """
                        {"username": "carol", "email": "carol@example.com", "password": "password123", "role": "USER"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("carol"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(jsonPath("$.taskCount").value(0));

        login("carol");
    }

    @Test
    void createUserValidatesFields() throws Exception {
        mvc.perform(json(post("/admin/users").with(bearer(admin)), """
                        {"username": "carol", "email": "bad", "password": "short"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").exists())
                .andExpect(jsonPath("$.errors.role").exists());
    }

    @Test
    void createUserWithTakenEmailFails() throws Exception {
        mvc.perform(json(post("/admin/users").with(bearer(admin)), """
                        {"username": "other", "email": "alice@example.com", "password": "password123", "role": "USER"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Email already registered"));
    }

    // roles are read from the database on every request, so the same token gains admin access
    @Test
    void promotedUserGetsAdminAccess() throws Exception {
        mvc.perform(json(put("/admin/users/{id}/role", userId("alice")).with(bearer(admin)), """
                        {"role": "ADMIN"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mvc.perform(get("/admin/users").with(bearer(alice)))
                .andExpect(status().isOk());
    }

    @Test
    void adminCannotChangeOwnRole() throws Exception {
        mvc.perform(json(put("/admin/users/{id}/role", userId("boss")).with(bearer(admin)), """
                        {"role": "USER"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("You can't change your own role"));
    }

    @Test
    void unknownRoleIsBadRequest() throws Exception {
        mvc.perform(json(put("/admin/users/{id}/role", userId("alice")).with(bearer(admin)), """
                        {"role": "SUPERUSER"}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void changeRoleOfUnknownUserIsNotFound() throws Exception {
        mvc.perform(json(put("/admin/users/999999/role").with(bearer(admin)), """
                        {"role": "ADMIN"}
                        """))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingUserRemovesTheirTasksAndAccess() throws Exception {
        createTask(alice, "One");
        createTask(alice, "Two");

        mvc.perform(delete("/admin/users/{id}", userId("alice")).with(bearer(admin)))
                .andExpect(status().isNoContent());

        assertEquals(0, taskRepository.count());
        mvc.perform(get("/task").with(bearer(alice)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCannotDeleteThemselves() throws Exception {
        mvc.perform(delete("/admin/users/{id}", userId("boss")).with(bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("You can't delete your own account"));
    }

    @Test
    void deletingUnknownUserIsNotFound() throws Exception {
        mvc.perform(delete("/admin/users/999999").with(bearer(admin)))
                .andExpect(status().isNotFound());
    }
}

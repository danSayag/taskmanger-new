package org.example.taskmanger.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class TaskApiTest extends ApiTestSupport {

    private String alice;
    private String bob;

    @BeforeEach
    void logIn() throws Exception {
        alice = userToken("alice");
        bob = userToken("bob");
    }

    // ---------- create ----------

    @Test
    void createReturnsTheNewTask() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)), """
                        {"title": "Buy milk", "description": "2 liters", "priority": "HIGH",
                         "status": "IN_PROGRESS", "dueDate": "2026-10-15"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.taskId").isNumber())
                .andExpect(jsonPath("$.title").value("Buy milk"))
                .andExpect(jsonPath("$.description").value("2 liters"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.dueDate").value("2026-10-15"))
                .andExpect(jsonPath("$.ownerName").value("alice"))
                .andExpect(jsonPath("$.owner").doesNotExist());
    }

    @Test
    void statusDefaultsToTodo() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)), taskJson("No status", "LOW", "2026-10-15")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("TODO"));
    }

    @Test
    void createValidatesRequiredFields() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)), """
                        {"title": " ", "description": "x"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.priority").exists())
                .andExpect(jsonPath("$.errors.dueDate").exists());
    }

    @Test
    void unknownPriorityIsBadRequest() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)), taskJson("Task", "URGENT", "2026-10-15")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Malformed request body"));
    }

    @Test
    void badDateIsBadRequest() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)), taskJson("Task", "LOW", "15/10/2026")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateTitleForSameUserIsConflict() throws Exception {
        createTask(alice, "Same title");

        mvc.perform(json(post("/task").with(bearer(alice)), taskJson("Same title", "LOW", "2026-10-15")))
                .andExpect(status().isConflict());
    }

    @Test
    void userCannotCreateTaskForSomeoneElse() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)).param("ownerId", String.valueOf(userId("bob"))),
                        taskJson("For Bob", "LOW", "2026-10-15")))
                .andExpect(status().isForbidden());
    }

    // ---------- read ----------

    @Test
    void usersOnlySeeTheirOwnTasks() throws Exception {
        createTask(alice, "Alice 1");
        createTask(alice, "Alice 2");
        createTask(bob, "Bob 1");

        mvc.perform(get("/task").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title", containsInAnyOrder("Alice 1", "Alice 2")));
    }

    @Test
    void getTaskById() throws Exception {
        long id = createTask(alice, "Mine");

        mvc.perform(get("/task/{id}", id).with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Mine"));
    }

    @Test
    void someoneElsesTaskLooksNotFound() throws Exception {
        long id = createTask(bob, "Bob's");

        mvc.perform(get("/task/{id}", id).with(bearer(alice)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Task with id " + id + " not found"));
    }

    @Test
    void missingTaskIsNotFound() throws Exception {
        mvc.perform(get("/task/999999").with(bearer(alice)))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonNumericIdIsBadRequest() throws Exception {
        mvc.perform(get("/task/abc").with(bearer(alice)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Invalid value 'abc' for 'taskId'"));
    }

    @Test
    void filterByPriority() throws Exception {
        createTask(alice, "High one", "HIGH", "2026-10-10");
        createTask(alice, "Low one", "LOW", "2026-10-10");
        createTask(bob, "Bob high", "HIGH", "2026-10-10");

        mvc.perform(get("/task/priority/HIGH").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains("High one")));
    }

    @Test
    void unknownPriorityFilterIsBadRequest() throws Exception {
        mvc.perform(get("/task/priority/URGENT").with(bearer(alice)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void filterByDueDateIncludesThatDay() throws Exception {
        createTask(alice, "Due 10th", "LOW", "2026-10-10");
        createTask(alice, "Due 20th", "LOW", "2026-10-20");

        mvc.perform(get("/task/due/2026-10-10").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains("Due 10th")));
    }

    // ---------- update / delete ----------

    @Test
    void updateChangesTheTask() throws Exception {
        long id = createTask(alice, "Old title");

        mvc.perform(json(put("/task/{id}", id).with(bearer(alice)), """
                        {"title": "New title", "description": "new", "priority": "LOW",
                         "status": "DONE", "dueDate": "2026-12-31"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId").value(id))
                .andExpect(jsonPath("$.title").value("New title"))
                .andExpect(jsonPath("$.status").value("DONE"))
                .andExpect(jsonPath("$.dueDate").value("2026-12-31"));
    }

    @Test
    void cannotUpdateSomeoneElsesTask() throws Exception {
        long id = createTask(bob, "Bob's");

        mvc.perform(json(put("/task/{id}", id).with(bearer(alice)), taskJson("Hacked", "LOW", "2026-10-10")))
                .andExpect(status().isNotFound());
        mvc.perform(get("/task/{id}", id).with(bearer(bob)))
                .andExpect(jsonPath("$.title").value("Bob's"));
    }

    @Test
    void deleteRemovesTheTask() throws Exception {
        long id = createTask(alice, "Temporary");

        mvc.perform(delete("/task/{id}", id).with(bearer(alice)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/task/{id}", id).with(bearer(alice)))
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotDeleteSomeoneElsesTask() throws Exception {
        long id = createTask(bob, "Bob's");

        mvc.perform(delete("/task/{id}", id).with(bearer(alice)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/task/{id}", id).with(bearer(bob)))
                .andExpect(status().isOk());
    }

    @Test
    void changePriority() throws Exception {
        long id = createTask(alice, "Task", "LOW", "2026-10-10");

        mvc.perform(json(patch("/task/{id}/priority", id).with(bearer(alice)), """
                        {"priority": "HIGH"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void changingToSamePriorityIsBadRequest() throws Exception {
        long id = createTask(alice, "Task", "LOW", "2026-10-10");

        mvc.perform(json(patch("/task/{id}/priority", id).with(bearer(alice)), """
                        {"priority": "LOW"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Priority of task " + id + " has not changed"));
    }

    @Test
    void changePriorityRequiresAValue() throws Exception {
        long id = createTask(alice, "Task");

        mvc.perform(json(patch("/task/{id}/priority", id).with(bearer(alice)), "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.priority").exists());
    }

    // ---------- search ----------

    @Test
    void searchFindsMatchingTasks() throws Exception {
        createTask(alice, "Groceries");   // description: "about Groceries"
        createTask(alice, "Dentist");

        mvc.perform(get("/task/search/groceries").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains("Groceries")));
    }

    @Test
    void searchToleratesTypos() throws Exception {
        mvc.perform(json(post("/task").with(bearer(alice)), """
                        {"title": "Shopping", "description": "groceries", "priority": "LOW", "dueDate": "2026-10-10"}
                        """))
                .andExpect(status().isCreated());

        mvc.perform(get("/task/search/grocries").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains("Shopping")));
    }

    @Test
    void searchDoesNotReturnOtherUsersTasks() throws Exception {
        createTask(bob, "Bob groceries");

        mvc.perform(get("/task/search/groceries").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", empty()));
    }

    @Test
    void searchWithMultipleWords() throws Exception {
        createTask(alice, "Pay rent");

        mvc.perform(get("/task/search/{q}", "pay rent").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains("Pay rent")));
    }

    // ---------- admin access to tasks ----------

    @Test
    void adminSeesEveryonesTasks() throws Exception {
        createTask(alice, "Alice 1");
        createTask(bob, "Bob 1");
        String admin = adminToken("boss");

        mvc.perform(get("/task").with(bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].ownerName", containsInAnyOrder("alice", "bob")));
    }

    @Test
    void adminCanEditSomeoneElsesTask() throws Exception {
        long id = createTask(alice, "Alice's");
        String admin = adminToken("boss");

        mvc.perform(json(put("/task/{id}", id).with(bearer(admin)), taskJson("Edited by admin", "HIGH", "2026-10-10")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerName").value("alice"));
    }

    @Test
    void adminCanCreateTaskForAnotherUser() throws Exception {
        String admin = adminToken("boss");

        mvc.perform(json(post("/task").with(bearer(admin)).param("ownerId", String.valueOf(userId("bob"))),
                        taskJson("Assigned", "LOW", "2026-10-15")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerName").value("bob"));

        mvc.perform(get("/task").with(bearer(bob)))
                .andExpect(jsonPath("$[*].title", contains("Assigned")));
    }

    @Test
    void adminCreatingTaskForUnknownUserIsNotFound() throws Exception {
        String admin = adminToken("boss");

        mvc.perform(json(post("/task").with(bearer(admin)).param("ownerId", "999999"),
                        taskJson("Nobody's", "LOW", "2026-10-15")))
                .andExpect(status().isNotFound());
    }
}

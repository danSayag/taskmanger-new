package org.example.taskmanger.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Messaging end to end: /convo, /convo/{id}/messages and GET /users
class ConvoApiTest extends ApiTestSupport {

    private String alice;
    private String bob;
    private String carol;

    @BeforeEach
    void logIn() throws Exception {
        alice = userToken("alice");
        bob = userToken("bob");
        carol = userToken("carol");
    }

    // ---------- starting a conversation ----------

    @Test
    void startingAConvoReturnsItWithTheFirstMessage() throws Exception {
        mvc.perform(json(post("/convo").with(bearer(alice)), """
                        {"receiverId": %d, "content": "hi bob"}
                        """.formatted(userId("bob"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.convoId").isNumber())
                .andExpect(jsonPath("$.messages", hasSize(1)))
                .andExpect(jsonPath("$.messages[0].messageId").isNumber())
                .andExpect(jsonPath("$.messages[0].senderId").value(userId("alice")))
                .andExpect(jsonPath("$.messages[0].receiverId").value(userId("bob")))
                .andExpect(jsonPath("$.messages[0].content").value("hi bob"));
    }

    @Test
    void cannotMessageYourself() throws Exception {
        mvc.perform(json(post("/convo").with(bearer(alice)), """
                        {"receiverId": %d, "content": "me again"}
                        """.formatted(userId("alice"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("You can't start a conversation with yourself"));
    }

    @Test
    void cannotMessageSomeoneWhoDoesNotExist() throws Exception {
        mvc.perform(json(post("/convo").with(bearer(alice)), """
                        {"receiverId": 999999, "content": "anyone there?"}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void startingAConvoValidatesTheBody() throws Exception {
        mvc.perform(json(post("/convo").with(bearer(alice)), """
                        {"content": "   "}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.receiverId").exists())
                .andExpect(jsonPath("$.errors.content").exists());
    }

    @Test
    void messagesHaveAMaximumLength() throws Exception {
        mvc.perform(json(post("/convo").with(bearer(alice)), """
                        {"receiverId": %d, "content": "%s"}
                        """.formatted(userId("bob"), "x".repeat(2001))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").exists());
    }

    // ---------- who sees what ----------

    @Test
    void bothPeopleSeeTheConvo() throws Exception {
        long convo = startConvo(alice, userId("bob"), "hi bob");

        mvc.perform(get("/convo").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].convoId", contains((int) convo)));
        // the receiver sees it before ever replying
        mvc.perform(get("/convo").with(bearer(bob)))
                .andExpect(jsonPath("$[*].convoId", contains((int) convo)))
                .andExpect(jsonPath("$[0].messages[0].content").value("hi bob"));
    }

    @Test
    void outsidersDoNotSeeTheConvo() throws Exception {
        startConvo(alice, userId("bob"), "just between us");

        mvc.perform(get("/convo").with(bearer(carol)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void aConvoIsListedOnceNoMatterHowManyMessages() throws Exception {
        long convo = startConvo(alice, userId("bob"), "one");
        reply(bob, convo, "two");
        reply(alice, convo, "three");

        mvc.perform(get("/convo").with(bearer(alice)))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].messages", hasSize(3)));
    }

    @Test
    void adminsSeeEveryConvo() throws Exception {
        String admin = adminToken("boss");
        startConvo(alice, userId("bob"), "a to b");
        startConvo(bob, userId("carol"), "b to c");

        mvc.perform(get("/convo").with(bearer(admin)))
                .andExpect(jsonPath("$", hasSize(2)));
    }

    // ---------- replying ----------

    @Test
    void backAndForthKeepsTheOrderAndTheRightPeople() throws Exception {
        long convo = startConvo(alice, userId("bob"), "hi bob");

        mvc.perform(json(post("/convo/{id}/messages", convo).with(bearer(bob)), """
                        {"content": "hi alice"}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.messageId").isNumber())
                .andExpect(jsonPath("$.senderId").value(userId("bob")))
                .andExpect(jsonPath("$.receiverId").value(userId("alice")))
                .andExpect(jsonPath("$.content").value("hi alice"));
        reply(alice, convo, "how are you?");

        mvc.perform(get("/convo").with(bearer(bob)))
                .andExpect(jsonPath("$[0].messages[*].content", contains("hi bob", "hi alice", "how are you?")))
                .andExpect(jsonPath("$[0].messages[2].senderId").value(userId("alice")))
                .andExpect(jsonPath("$[0].messages[2].receiverId").value(userId("bob")));
    }

    @Test
    void outsidersCannotReply() throws Exception {
        long convo = startConvo(alice, userId("bob"), "private");

        mvc.perform(json(post("/convo/{id}/messages", convo).with(bearer(carol)), """
                        {"content": "butting in"}
                        """))
                .andExpect(status().isNotFound());
    }

    @Test
    void replyingToAMissingConvoIsNotFound() throws Exception {
        mvc.perform(json(post("/convo/{id}/messages", 999999).with(bearer(alice)), """
                        {"content": "hello?"}
                        """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("convo with id 999999 not found"));
    }

    @Test
    void anEmptyReplyIsRejected() throws Exception {
        long convo = startConvo(alice, userId("bob"), "hi");

        mvc.perform(json(post("/convo/{id}/messages", convo).with(bearer(bob)), """
                        {"content": ""}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.content").exists());
    }

    @Test
    void messagingNeedsAToken() throws Exception {
        mvc.perform(get("/convo")).andExpect(status().isUnauthorized());
        mvc.perform(json(post("/convo"), """
                        {"receiverId": 1, "content": "hi"}
                        """))
                .andExpect(status().isUnauthorized());
    }

    // ---------- deleting a user ----------

    @Test
    void deletingAUserDeletesTheirConversations() throws Exception {
        String admin = adminToken("boss");
        startConvo(alice, userId("bob"), "a to b");
        long bobAndCarol = startConvo(bob, userId("carol"), "b to c");

        mvc.perform(delete("/admin/users/{id}", userId("alice")).with(bearer(admin)))
                .andExpect(status().isNoContent());

        // alice's conversation is gone for bob too; bob and carol's is untouched
        mvc.perform(get("/convo").with(bearer(bob)))
                .andExpect(jsonPath("$[*].convoId", contains((int) bobAndCarol)));
        assertEquals(1, convoRepository.count());
    }

    // ---------- people you can message ----------

    @Test
    void usersListHasNamesButNoEmails() throws Exception {
        String body = mvc.perform(get("/users").with(bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].username", containsInAnyOrder("alice", "bob", "carol")))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andReturn().getResponse().getContentAsString();

        assertTrue(!body.contains("@example.com") && !body.contains("email"), "GET /users must not expose emails: " + body);
    }

    @Test
    void usersListNeedsAToken() throws Exception {
        mvc.perform(get("/users")).andExpect(status().isUnauthorized());
    }

    private void reply(String token, long convoId, String content) throws Exception {
        mvc.perform(json(post("/convo/{id}/messages", convoId).with(bearer(token)), """
                        {"content": "%s"}
                        """.formatted(content)))
                .andExpect(status().isCreated());
    }
}

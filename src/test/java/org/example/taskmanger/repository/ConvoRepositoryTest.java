package org.example.taskmanger.repository;

import org.example.taskmanger.model.Convo;
import org.example.taskmanger.model.Message;
import org.example.taskmanger.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Runs the Flyway migrations on an in-memory database, so this also checks the convo/message tables match the entities
@DataJpaTest
class ConvoRepositoryTest {

    @Autowired
    private ConvoRepository convoRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TestEntityManager entityManager;

    private User alice;
    private User bob;
    private User carol;

    private Convo save(Message... messages) {
        return convoRepository.save(new Convo(new ArrayList<>(List.of(messages))));
    }

    private static Message message(User from, User to, String content) {
        return new Message(from.getId(), to.getId(), content);
    }

    private List<Long> convoIdsFor(User user) {
        return convoRepository.findDistinctByMessagesSenderIdOrMessagesReceiverId(user.getId(), user.getId())
                .stream().map(Convo::getConvoId).sorted().toList();
    }

    @BeforeEach
    void setUp() {
        alice = userRepository.save(new User("alice", "hash", "alice@example.com"));
        bob = userRepository.save(new User("bob", "hash", "bob@example.com"));
        carol = userRepository.save(new User("carol", "hash", "carol@example.com"));
    }

    @Test
    void savingAConvoSavesItsMessages() {
        Convo convo = save(message(alice, bob, "hi"));
        entityManager.flush();
        entityManager.clear();

        Convo loaded = convoRepository.findById(convo.getConvoId()).orElseThrow();
        assertEquals(1, loaded.getMessages().size());
        assertNotNull(loaded.getMessages().get(0).getMessageId());
        assertEquals("hi", loaded.getMessages().get(0).getContent());
    }

    @Test
    void findsConvosTheUserSentOrReceivedIn() {
        Convo aliceToBob = save(message(alice, bob, "a to b"));
        Convo carolToAlice = save(message(carol, alice, "c to a"));
        Convo bobToCarol = save(message(bob, carol, "b to c"));

        assertEquals(List.of(aliceToBob.getConvoId(), carolToAlice.getConvoId()), convoIdsFor(alice));
        assertEquals(List.of(aliceToBob.getConvoId(), bobToCarol.getConvoId()), convoIdsFor(bob));
    }

    @Test
    void theReceiverFindsTheConvoBeforeReplying() {
        Convo convo = save(message(alice, bob, "first"));

        assertEquals(List.of(convo.getConvoId()), convoIdsFor(bob));
    }

    @Test
    void aConvoWithManyMessagesIsFoundOnce() {
        Convo convo = save(message(alice, bob, "1"), message(bob, alice, "2"), message(alice, bob, "3"));

        assertEquals(List.of(convo.getConvoId()), convoIdsFor(alice));
    }

    @Test
    void someoneWithNoMessagesFindsNothing() {
        save(message(alice, bob, "private"));

        assertTrue(convoIdsFor(carol).isEmpty());
    }

    @Test
    void messagesComeBackOldestFirst() {
        Convo convo = save(message(alice, bob, "first"));
        convo.getMessages().add(message(bob, alice, "second"));
        convo.getMessages().add(message(alice, bob, "third"));
        convoRepository.save(convo);
        entityManager.flush();
        entityManager.clear();

        List<String> contents = convoRepository.findById(convo.getConvoId()).orElseThrow()
                .getMessages().stream().map(Message::getContent).toList();
        assertEquals(List.of("first", "second", "third"), contents);
    }

    @Test
    void deletingAConvoDeletesItsMessages() {
        Convo convo = save(message(alice, bob, "1"), message(bob, alice, "2"));
        entityManager.flush();

        convoRepository.delete(convo);
        entityManager.flush();

        Long remaining = entityManager.getEntityManager()
                .createQuery("select count(m) from Message m", Long.class).getSingleResult();
        assertEquals(0L, remaining);
    }
}

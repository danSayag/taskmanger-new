package org.example.taskmanger.service;

import org.example.taskmanger.dto.ConvoResponse;
import org.example.taskmanger.dto.CreateConvoDto;
import org.example.taskmanger.dto.MessageResponse;
import org.example.taskmanger.dto.SendMessageDto;
import org.example.taskmanger.exception.ConvoNotFoundException;
import org.example.taskmanger.model.Convo;
import org.example.taskmanger.model.Message;
import org.example.taskmanger.model.Role;
import org.example.taskmanger.model.User;
import org.example.taskmanger.repository.ConvoRepository;
import org.example.taskmanger.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConvoServiceTest {

    @Mock
    private ConvoRepository convoRepository;
    @Mock
    private CurrentUserService currentUser;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ConvoService convoService;

    private User alice;
    private User bob;
    private User carol;

    private static User user(long id, String name, Role role) {
        User user = new User(name, "hash", name + "@example.com");
        user.setId(id);
        user.setRole(role);
        return user;
    }

    // a conversation alice started with bob
    private static Convo aliceToBob() {
        Convo convo = new Convo(new ArrayList<>(List.of(new Message(1L, 2L, "hi bob"))));
        convo.setConvoId(10L);
        return convo;
    }

    private void loggedInAs(User user) {
        lenient().when(currentUser.get()).thenReturn(user);
        lenient().when(currentUser.isAdmin()).thenReturn(user.getRole() == Role.ADMIN);
    }

    @BeforeEach
    void setUp() {
        alice = user(1, "alice", Role.USER);
        bob = user(2, "bob", Role.USER);
        carol = user(3, "carol", Role.USER);
        loggedInAs(alice);
        lenient().when(convoRepository.save(any(Convo.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------- listing ----------

    @Test
    void usersGetTheConvosTheySentOrReceivedIn() {
        Convo convo = aliceToBob();
        when(convoRepository.findDistinctByMessagesSenderIdOrMessagesReceiverId(1L, 1L)).thenReturn(List.of(convo));

        List<ConvoResponse> convos = convoService.getAllConvos();

        assertEquals(1, convos.size());
        assertEquals(10L, convos.get(0).convoId());
        verify(convoRepository, never()).findAll();
    }

    @Test
    void adminsGetEveryConvo() {
        loggedInAs(user(9, "boss", Role.ADMIN));
        when(convoRepository.findAll()).thenReturn(List.of(aliceToBob()));

        assertEquals(1, convoService.getAllConvos().size());
        verify(convoRepository, never()).findDistinctByMessagesSenderIdOrMessagesReceiverId(anyLong(), anyLong());
    }

    // ---------- starting a conversation ----------

    @Test
    void startsAConvoWithTheFirstMessage() {
        when(userRepository.existsById(2L)).thenReturn(true);

        ConvoResponse response = convoService.createConvo(new CreateConvoDto(2L, "hello"));

        ArgumentCaptor<Convo> saved = ArgumentCaptor.forClass(Convo.class);
        verify(convoRepository).save(saved.capture());
        Message first = saved.getValue().getMessages().get(0);
        assertEquals(1L, first.getSenderId());
        assertEquals(2L, first.getReceiverId());
        assertEquals("hello", first.getContent());
        assertEquals(1, response.messages().size());
        assertEquals("hello", response.messages().get(0).content());
    }

    @Test
    void theMessageListCanGrowLater() {
        // sendMessage adds to this list, so it must not be an unmodifiable List.of(...)
        when(userRepository.existsById(2L)).thenReturn(true);

        convoService.createConvo(new CreateConvoDto(2L, "hello"));

        ArgumentCaptor<Convo> saved = ArgumentCaptor.forClass(Convo.class);
        verify(convoRepository).save(saved.capture());
        assertDoesNotThrow(() -> saved.getValue().getMessages().add(new Message(2L, 1L, "hi")));
    }

    @Test
    void cannotMessageYourself() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> convoService.createConvo(new CreateConvoDto(1L, "talking to myself")));

        assertEquals("You can't start a conversation with yourself", e.getMessage());
        verify(convoRepository, never()).save(any());
    }

    @Test
    void cannotMessageSomeoneWhoDoesNotExist() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> convoService.createConvo(new CreateConvoDto(99L, "hello?")));
        verify(convoRepository, never()).save(any());
    }

    // ---------- replying ----------

    @Test
    void theReceiverRepliesToTheSender() {
        loggedInAs(bob);
        when(convoRepository.findById(10L)).thenReturn(Optional.of(aliceToBob()));

        MessageResponse reply = convoService.sendMessage(10L, new SendMessageDto("hi alice"));

        assertEquals(2L, reply.senderId());
        assertEquals(1L, reply.receiverId());
        assertEquals("hi alice", reply.content());
    }

    @Test
    void theSenderCanWriteAgain() {
        when(convoRepository.findById(10L)).thenReturn(Optional.of(aliceToBob()));

        MessageResponse reply = convoService.sendMessage(10L, new SendMessageDto("are you there?"));

        assertEquals(1L, reply.senderId());
        assertEquals(2L, reply.receiverId());
    }

    @Test
    void theReplyIsAddedToTheConvoAndSaved() {
        Convo convo = aliceToBob();
        when(convoRepository.findById(10L)).thenReturn(Optional.of(convo));

        convoService.sendMessage(10L, new SendMessageDto("second"));

        verify(convoRepository).save(convo);
        assertEquals(List.of("hi bob", "second"), convo.getMessages().stream().map(Message::getContent).toList());
    }

    @Test
    void outsidersCannotReply() {
        loggedInAs(carol);
        when(convoRepository.findById(10L)).thenReturn(Optional.of(aliceToBob()));

        // same error as a missing convo, so outsiders can't tell the convo exists
        assertThrows(ConvoNotFoundException.class, () -> convoService.sendMessage(10L, new SendMessageDto("butting in")));
        verify(convoRepository, never()).save(any());
    }

    @Test
    void replyingToAMissingConvoFails() {
        when(convoRepository.findById(404L)).thenReturn(Optional.empty());

        ConvoNotFoundException e = assertThrows(ConvoNotFoundException.class,
                () -> convoService.sendMessage(404L, new SendMessageDto("hello?")));
        assertEquals("convo with id 404 not found", e.getMessage());
    }
}

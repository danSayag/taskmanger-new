package org.example.taskmanger.service;

import org.example.taskmanger.dto.ConvoResponse;
import org.example.taskmanger.dto.CreateConvoDto;
import org.example.taskmanger.dto.MessageResponse;
import org.example.taskmanger.dto.SendMessageDto;
import org.example.taskmanger.model.Convo;
import org.example.taskmanger.model.Message;
import org.example.taskmanger.repository.ConvoRepository;
import org.example.taskmanger.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ConvoService {

    private final ConvoRepository convoRepository;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;


    public ConvoService(
        ConvoRepository convoRepository,
        CurrentUserService currentUserService,
        UserRepository userRepository){
        this.convoRepository = convoRepository;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
    }

    // admins see every conversation, everyone else only the ones they sent messages in
    public List<ConvoResponse> getAllConvos(){
        List<Convo> convos = currentUserService.isAdmin()
            ? convoRepository.findAll()
            : convoRepository.findDistinctByMessagesSenderId(currentUserService.get().getId());
        return toResponses(convos);
    }

    // starts a new conversation between the current user and input.receiverId(), with input.content() as the first message
    public ConvoResponse createConvo(CreateConvoDto input) {
        Long currentUserId = currentUserService.get().getId();

        if(currentUserId.equals(input.receiverId())){
            throw new IllegalArgumentException("You can't start a conversation with yourself");
        }
        if(!userRepository.existsById(input.receiverId())){
            throw new IllegalArgumentException("User with " + input.receiverId() + " does not exist");
        }

        Message message = new Message(currentUserId , input.receiverId(), input.content());
        Convo newConvo = convoRepository.save(new Convo(new ArrayList<>(List.of(message))));
        return ConvoResponse.from(newConvo);
    }

    // adds a message from the current user to an existing conversation
    public MessageResponse sendMessage(Long convoId, SendMessageDto input) {
        // TODO: find the convo, or throw a not-found exception
        // TODO: check the current user is part of it
        // TODO: work out the receiver (the other person in the convo)
        // TODO: save the message and return it as a MessageResponse
        throw new UnsupportedOperationException("TODO");
    }

    private List<ConvoResponse> toResponses(List<Convo> convos) {
        return convos.stream().map(ConvoResponse::from).toList();
    }
}

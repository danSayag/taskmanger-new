package org.example.taskmanger.service;

import org.example.taskmanger.dto.ConvoResponse;
import org.example.taskmanger.dto.CreateConvoDto;
import org.example.taskmanger.dto.MessageResponse;
import org.example.taskmanger.dto.SendMessageDto;
import org.example.taskmanger.model.Convo;
import org.example.taskmanger.repository.ConvoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConvoService {

    private final ConvoRepository convoRepository;
    private final CurrentUserService currentUserService;


    public ConvoService(
        ConvoRepository convoRepository,
        CurrentUserService currentUserService){
        this.convoRepository = convoRepository;
        this.currentUserService = currentUserService;
    }

    // admins see every conversation, everyone else only the ones they sent messages in
    public List<ConvoResponse> getAllConvos(){
        List<Convo> convos = currentUserService.isAdmin()
            ? convoRepository.findAll()
            : convoRepository.findDistinctByMessagesSenderId(currentUserService.get().getId());
        return toResponses(convos);
    }

    // starts a new conversation between the current user and input.getterId(), with input.content() as the first message
    public ConvoResponse createConvo(CreateConvoDto input) {
        // TODO: check the getter exists and isn't the current user
        // TODO: build the first Message (sender = current user, from the token, never from the body)
        // TODO: save a new Convo holding that message and return it as a ConvoResponse
        throw new UnsupportedOperationException("TODO");
    }

    // adds a message from the current user to an existing conversation
    public MessageResponse sendMessage(Long convoId, SendMessageDto input) {
        // TODO: find the convo, or throw a not-found exception
        // TODO: check the current user is part of it
        // TODO: work out the getter (the other person in the convo)
        // TODO: save the message and return it as a MessageResponse
        throw new UnsupportedOperationException("TODO");
    }

    private List<ConvoResponse> toResponses(List<Convo> convos) {
        return convos.stream().map(ConvoResponse::from).toList();
    }
}

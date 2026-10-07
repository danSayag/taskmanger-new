package org.example.taskmanger.service;

import org.example.taskmanger.dto.ConvoResponse;
import org.example.taskmanger.dto.CreateConvoDto;
import org.example.taskmanger.dto.MessageResponse;
import org.example.taskmanger.dto.SendMessageDto;
import org.example.taskmanger.exception.ConvoNotFoundException;
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
    

    public MessageResponse sendMessage(Long convoId, SendMessageDto input) {
    Long currentUserId = currentUserService.get().getId();
    Convo convo = convoRepository.findById(convoId)
            .orElseThrow(() -> new ConvoNotFoundException(convoId));

    Message firstMessage = convo.getMessages().get(0);
    boolean isParticipant = currentUserId.equals(firstMessage.getSenderId())
            || currentUserId.equals(firstMessage.getReceiverId());
    if (!isParticipant) {
        throw new ConvoNotFoundException(convoId);
    }

    Long receiverId = firstMessage.getSenderId().equals(currentUserId)
            ? firstMessage.getReceiverId()
            : firstMessage.getSenderId();

    convo.getMessages().add(new Message(currentUserId, receiverId, input.content()));
    Convo savedConvo = convoRepository.save(convo);

    List<Message> messages = savedConvo.getMessages();
    return MessageResponse.from(messages.get(messages.size() - 1));
}

    private List<ConvoResponse> toResponses(List<Convo> convos) {
        return convos.stream().map(ConvoResponse::from).toList();
    }
}

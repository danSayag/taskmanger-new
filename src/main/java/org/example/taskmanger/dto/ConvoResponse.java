package org.example.taskmanger.dto;

import org.example.taskmanger.model.Convo;

import java.util.List;

// What the API returns for a conversation, with its messages
public record ConvoResponse(
        Long convoId,
        List<MessageResponse> messages) {

    public static ConvoResponse from(Convo convo) {
        return new ConvoResponse(
                convo.getConvoId(),
                convo.getMessages() == null
                        ? List.of()
                        : convo.getMessages().stream().map(MessageResponse::from).toList());
    }
}

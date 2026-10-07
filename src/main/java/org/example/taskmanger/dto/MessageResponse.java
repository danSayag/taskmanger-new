package org.example.taskmanger.dto;

import org.example.taskmanger.model.Message;

// What the API returns for a single message
public record MessageResponse(
        Long messageId,
        Long senderId,
        Long receiverId,
        String content) {

    public static MessageResponse from(Message message) {
        return new MessageResponse(
                message.getMessageId(),
                message.getSenderId(),
                message.getReceiverId(),
                message.getContent());
    }
}

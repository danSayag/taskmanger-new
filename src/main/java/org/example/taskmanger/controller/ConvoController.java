package org.example.taskmanger.controller;

import jakarta.validation.Valid;
import org.example.taskmanger.dto.ConvoResponse;
import org.example.taskmanger.dto.CreateConvoDto;
import org.example.taskmanger.dto.MessageResponse;
import org.example.taskmanger.dto.SendMessageDto;
import org.example.taskmanger.service.ConvoService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Endpoints used by messages.html (see the comment at the top of messages.js)
@RestController
@RequestMapping("/convo")
public class ConvoController {

    private final ConvoService convoService;

    public ConvoController(ConvoService convoService) {
        this.convoService = convoService;
    }

    // GET /convo -> your conversations (admins: all of them)
    @GetMapping
    public List<ConvoResponse> getAllConvos() {
        return convoService.getAllConvos();
    }

    // POST /convo {receiverId, content} -> starts a conversation with its first message
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConvoResponse createConvo(@Valid @RequestBody CreateConvoDto createConvoDto) {
        return createConvo(createConvoDto);
    }

    // POST /convo/{convoId}/messages {content} -> adds a message to an existing conversation
    @PostMapping("/{convoId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(@PathVariable Long convoId, @Valid @RequestBody SendMessageDto sendMessageDto) {
        return sendMessage(convoId, sendMessageDto);
    }
}

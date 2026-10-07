package org.example.taskmanger.repository;

import java.util.List;

import org.example.taskmanger.model.Convo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConvoRepository extends JpaRepository<Convo,Long> {

    // conversations with at least one message sent or received by this user
    List<Convo> findDistinctByMessagesSenderIdOrMessagesReceiverId(Long senderId, Long receiverId);
}

package org.example.taskmanger.repository;

import java.util.List;

import org.example.taskmanger.model.Convo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConvoRepository extends JpaRepository<Convo,Long> {

    // conversations with at least one message sent by this user
    List<Convo> findDistinctByMessagesSenderId(Long senderId);
}

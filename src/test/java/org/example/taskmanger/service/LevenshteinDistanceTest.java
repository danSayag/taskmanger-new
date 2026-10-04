package org.example.taskmanger.service;

import org.example.taskmanger.model.Task;
import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LevenshteinDistanceTest {

    private final LevenshteinDistance levenshtein = new LevenshteinDistance(new MinMaxService());

    private static Task task(String description) {
        return new Task("title", description, new Date());
    }

    @Test
    void findsDescriptionWithSmallTypo() {
        Task groceries = task("groceries");
        assertEquals(List.of(groceries), levenshtein.searchTasks(List.of(groceries), "grocries"));
    }

    @Test
    void ignoresCase() {
        Task groceries = task("Buy Groceries");
        assertEquals(List.of(groceries), levenshtein.searchTasks(List.of(groceries), "buy grocerys"));
    }

    @Test
    void exactMatchIsFound() {
        Task laundry = task("laundry");
        assertEquals(List.of(laundry), levenshtein.searchTasks(List.of(laundry), "laundry"));
    }

    @Test
    void skipsUnrelatedDescriptions() {
        Task groceries = task("groceries");
        Task bank = task("bank");
        assertEquals(List.of(groceries), levenshtein.searchTasks(List.of(groceries, bank), "grocries"));
    }

    @Test
    void emptyDescriptionDoesNotMatch() {
        assertTrue(levenshtein.searchTasks(List.of(task("")), "groceries").isEmpty());
    }

    @Test
    void blankOrNullQueryReturnsNothing() {
        List<Task> tasks = List.of(task("groceries"));
        assertTrue(levenshtein.searchTasks(tasks, null).isEmpty());
        assertTrue(levenshtein.searchTasks(tasks, "").isEmpty());
        assertTrue(levenshtein.searchTasks(tasks, "   ").isEmpty());
    }

    @Test
    void emptyTaskListReturnsNothing() {
        assertTrue(levenshtein.searchTasks(List.of(), "groceries").isEmpty());
    }
}

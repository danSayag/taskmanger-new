package org.example.taskmanger.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MinMaxServiceTest {

    private final MinMaxService minMaxService = new MinMaxService();

    @Test
    void minReturnsSmallestOfThreeWhereverItIs() {
        assertEquals(1, minMaxService.min(1, 2, 3));
        assertEquals(1, minMaxService.min(2, 1, 3));
        assertEquals(1, minMaxService.min(3, 2, 1));
    }

    @Test
    void minHandlesEqualAndNegativeValues() {
        assertEquals(4, minMaxService.min(4, 4, 4));
        assertEquals(-5, minMaxService.min(0, -5, 3));
    }

    @Test
    void maxReturnsLargerOfTwo() {
        assertEquals(7, minMaxService.max(7, 3));
        assertEquals(7, minMaxService.max(3, 7));
        assertEquals(2, minMaxService.max(2, 2));
    }
}

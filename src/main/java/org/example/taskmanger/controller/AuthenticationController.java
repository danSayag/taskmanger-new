package org.example.taskmanger.controller;

import jakarta.validation.Valid;
import org.example.taskmanger.dto.LoginResponse;
import org.example.taskmanger.dto.LoginUserDto;
import org.example.taskmanger.dto.RegisterUserDto;
import org.example.taskmanger.model.User;
import org.example.taskmanger.service.AuthenticationService;
import org.example.taskmanger.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthenticationController {

    private final JwtService jwtService;
    private final AuthenticationService authenticationService;

    public AuthenticationController(JwtService jwtService, AuthenticationService authenticationService) {
        this.jwtService = jwtService;
        this.authenticationService = authenticationService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(@Valid @RequestBody RegisterUserDto registerUserDto) {
        authenticationService.signup(registerUserDto);
    }

    @PostMapping("/login")
    public LoginResponse authenticate(@Valid @RequestBody LoginUserDto loginUserDto) {
        User authenticatedUser = authenticationService.authenticate(loginUserDto);
        String jwtToken = jwtService.generateToken(authenticatedUser);
        return new LoginResponse(jwtToken, jwtService.getJwtExpirationTime());
    }
}

package org.example.taskmanger.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity 
@Getter 
@Setter
public class Employee extends User{

    public Employee(String username, String password, String email){
        super(username, password, email);
    }

    public Employee(){
    }

    // TODO: not implemented - creates a throwaway Employee instead of initializing this one; employeeId is unused
    public Employee(User user, Long employeeId){
        new Employee(user.getUsername(), user.getPassword(), user.getEmail());
    }


}

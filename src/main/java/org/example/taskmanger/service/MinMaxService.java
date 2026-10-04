package org.example.taskmanger.service;

import org.springframework.stereotype.Service;

@Service 
public class MinMaxService {

    public MinMaxService(){}


    public int min(int a ,int b , int c){
       int res = a;
    
       if(b < res) res = b;
       if(c < res) res = c;

       return res;
    }


    public int max(int a , int b){
        return a > b ? a : b ;
    }

    
}

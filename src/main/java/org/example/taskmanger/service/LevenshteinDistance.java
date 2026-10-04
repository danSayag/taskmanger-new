package org.example.taskmanger.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import org.example.taskmanger.model.Task;


@Service 
public class LevenshteinDistance {

    private final MinMaxService minMaxService;

    
    public LevenshteinDistance(MinMaxService minMaxService){
        this.minMaxService = minMaxService;
    }




    public List<Task> searchTasks(List<Task> tasksListForSearch, String query){

        if(query == null || query.isBlank() || tasksListForSearch.isEmpty()){
            return new ArrayList<>();
        }

        List<Task> resTasksList = new ArrayList<>();
        String lowCaseQuery = query.toLowerCase();
        int sizeOfQuery = query.length();

        for(Task task : tasksListForSearch){
            int[][] levArray = new int[task.getDescription().length() + 1][sizeOfQuery + 1];
             
            for(int i = 0 ; i < levArray.length; i++){
                levArray[i][0] = i;
            }
            for(int i = 0 ; i < levArray[0].length; i++){
                levArray[0][i] = i;
            }

            String taskDescription = task.getDescription().toLowerCase();
            int taskLength = taskDescription.length();

            for(int i = 0 ; i < taskLength ; i++){
                for(int j = 0 ; j < sizeOfQuery ; j++ ){
                    if(taskDescription.charAt(i) == lowCaseQuery.charAt(j)){
                        levArray[i+1][j+1] = levArray[i][j];
                    }
                    else {
                        levArray[i+1][j+1] = 1 + minMaxService.min(levArray[i][j + 1],levArray[i + 1][j],levArray[i][j]);
                    }    
                }
            }
            int distance = levArray[taskLength][sizeOfQuery];

            double mf = 1.0 - ( (double)distance  / (double)minMaxService.max(taskLength , sizeOfQuery)); 

            if( mf >= 0.1){
                resTasksList.add(task);
            }
        }
        return resTasksList;
        }





        
    }


    


import express from "express";
import dotenv from 'dotenv';
import { getDesignByDate, getDesignsDate } from "../services/queries/designs";
import { formatDate } from "../utils/date";

const router = express.Router()
dotenv.config();

const api = process.env.CANVA_CONNECT_API;

const endpoints = {
    DATE_LIST: "/date-list",
    DESIGN_BY_DATE: "/design-by-date"
};

router.get(endpoints.DATE_LIST, async(req, res) => {
    try {
        const result = await getDesignsDate();
        return res.send(result)
    } catch (error) {
        return res.status(400).send({ message: 'No data available'});
    }
})

router.get(`${endpoints.DESIGN_BY_DATE}/:date`, async(req, res) => {
    try {
        const { date } = req.params;
        const convertDate = formatDate(new Date(date));
        const response = await getDesignByDate(convertDate);

        // Initialize an empty array to hold the processed data
        let processedData: any[] = [];
        
        // Iterate over each item in the response
        response.forEach(item => {
            // Parse the JSON data if it exists
            let data;
            try {
                data = JSON.parse(item.data);
            } catch (error) {
                console.error('Error parsing JSON data:', error);
                return;
            }
    
            // Check if the data is an array
            if (Array.isArray(data)) {
                // Flatten the array and add to the processed data
                data.forEach(entry => {
                    processedData.push({
                        job:{
                            result:{
                                design:{
                                    id: item.id,
                                    created_at: item.created_at,
                                    ...entry.job.result.design
                                }
                            }
                        }
                    });
                });
            }
        });

        return res.send(processedData)
    } catch (error) {
        return res.status(400).send({ message: 'No data available'});
    }
})


export default router;
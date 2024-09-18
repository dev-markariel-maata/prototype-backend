import express from "express";
import { AUTH_COOKIE_NAME } from "../services/auth";
import axios from "axios";
import dotenv from 'dotenv';

const router = express.Router()
dotenv.config();

const api = process.env.CANVA_CONNECT_API;

const endpoints = {
    GET_TEMPLATE: "/",
    GET_TEMPLATE_DATASET: "/",
    LIST_TEMPLATE: "/brand-templates",
};

router.get(endpoints.LIST_TEMPLATE, async(req, res) => {
    const token = req.signedCookies[AUTH_COOKIE_NAME];
    
    if(token){
        const access_token = token.access_token;

        
        const result = await axios.get(api + endpoints.LIST_TEMPLATE, {
            headers: {
                Authorization: `Bearer ${access_token}`, // Correct Authorization header
            },
        });

        res.send(result.data)
    } else {
        console.log("No token found in cookies");
    } 
})

export default router;
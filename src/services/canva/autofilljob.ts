import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const API = process.env.CANVA_CONNECT_API;

export const createAutofill = async (requestBody: object, access_token: string) => {
    return await axios.post(`${API}/autofills`, requestBody, {
        headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
        },
    });
};

export const getAutofill = async (jobID: string, access_token: string) => {
    return await axios.get(`${API}/autofills/${jobID}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
};


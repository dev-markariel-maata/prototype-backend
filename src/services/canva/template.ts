import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const API = process.env.CANVA_CONNECT_API;

export const getTemplateDataset = async (templateId: string, access_token: string) => {
    return await axios.get(`${API}/brand-templates/${templateId}/dataset`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
};

export const getTemplateList = async(access_token: string) => {
    return await axios.get(`${API}/brand-templates`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}
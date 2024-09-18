import db from '../../database/db';
import { GetAutofill } from '../../types/autofill';

export const setDesignData = async (data: GetAutofill[]): Promise<any> => {
    return new Promise((resolve, reject) => {
        const query = "INSERT INTO designs (data, created_at) VALUES (?, NOW())"; // Use placeholders for values
        const values = [JSON.stringify(data)]; // Values to be inserted into the query

        db.query(query, values, (err: any, results: any) => {
            if (err) {
                console.error('Error inserting designs:', err);
                return reject(err); // Reject the promise on error
            }
            resolve(results); // Resolve the promise with the results
        });
    });
}

export const getDesignsDate = async (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const query = "SELECT DATE(created_at) AS designDate FROM designs GROUP BY DATE(created_at)";
        db.query(query, (err: any, results: any) => {   
            if (err) {
                console.error('Error fetching designs:', err);
                return reject(err);
            }   
            resolve(results);
        });
    });
}

export const getDesignByDate = async (date: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const query = "SELECT * FROM designs WHERE DATE(created_at) = ?";
        const values = [date];
        db.query(query, values, (err: any, results: any) => {   
            if (err) {
                console.error('Error fetching designs:', err);
                return reject(err);
            }
            resolve(results);
        });
    });
}
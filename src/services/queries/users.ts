import db from '../../database/db';

export const setToken = async (token: string, claimsSub: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const query = "INSERT INTO users (id, token) VALUES (?, ?)"; // Use placeholders for values
        const values = [claimsSub, JSON.stringify(token)]; // Values to be inserted into the query

        db.query(query, values, (err: any, results: any) => {
            if (err) {
                console.error('Error inserting token:', err);
                return reject(err); // Reject the promise on error
            }
            resolve(results); // Resolve the promise with the results
        });
    });
}

export const getToken = async (claimsSub: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const query = "SELECT token FROM users WHERE id = ?";
        db.query(query, [claimsSub], (err: any, results: any) => {
            if (err) {
                console.error('Error fetching token:', err);
                return reject(err); // Reject on error
            }
            if (results.length > 0) {
                const token = JSON.parse(results[0].token); // Parse the token string back to JSON
                resolve(token);
            } else {
                resolve(null); // No token found for the given claimsSub
            }
        });
    });
}

export const updateToken = async (token: string, claimsSub: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const query = "UPDATE users SET token = ? WHERE id = ?"; // Update query
        const values = [JSON.stringify(token), claimsSub]; // Values to update

        db.query(query, values, (err: any, results: any) => {
            if (err) {
                console.error('Error updating token:', err);
                return reject(err); // Reject the promise on error
            }
            resolve(results); // Resolve the promise with the results
        });
    });
}

export const deleteToken = async (id: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const query = "DELETE FROM users WHERE id = ?"; // Delete query
        const values = [id]; // Value to identify which record to delete

        db.query(query, values, (err: any, results: any) => {
            if (err) {
                console.error('Error deleting record:', err);
                return reject(err); // Reject the promise on error
            }
            resolve(results); // Resolve the promise with the results
        });
    });
}
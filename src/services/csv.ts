import path from "path";
const multer = require('multer')

// Upload CSV to folder
export const uploadCSV = multer({
    storage: multer.diskStorage({
        destination: (req: Request, file: any, cb: any) => {
            cb(null, 'src/uploads/'); // Specify where to store the uploaded files
        },
        filename: (req: Request, file: any, cb: any) => {
            cb(null, `${Date.now()}-${file.originalname}`); // Name the file uniquely
        }
    }),
    fileFilter: (req: Request, file: any, cb: any) => {
        const ext = path.extname(file.originalname);
        if (ext !== '.csv') {
            return cb(new Error('Only CSV files are allowed'), false);
        }
        cb(null, true);
    }
});
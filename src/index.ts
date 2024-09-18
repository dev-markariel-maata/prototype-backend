import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import authRoutes from "./routes/auth"
import cookieParser from 'cookie-parser';
import path from 'path';
import templates from './routes/templates';
import fillable from './routes/fillable';
import design from './routes/design';

/**
 * We extend the Express Request interface to include the custom properties
 * that will be injected by the `injectClient` middleware on routes where
 * that is added (which should be all authenticated routes).
 */
declare global {
  namespace Express {
    interface Request {
      // The Canva Connect client, configured for the current user
      client: string;
      // The access token, in case you need to make a call to the
      // Connect API that isn't yet supported by the client
      token: string;
      file?: Multer.File;
    }
  }
}

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://127.0.0.1:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

const port = process.env.CANVA_BACKEND_PORT;

app.use(authRoutes)
app.use(templates)
app.use(fillable)
app.use(design);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

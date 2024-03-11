import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import userProfileRouter from "./routes/userProfileRouter";
import movieRouter from "./routes/movieRouter";

// creates an instance of an Express server
const app = express();
app.use(cors());
app.use(express.json());
app.use("/userProfiles", userProfileRouter);
app.use("/movies", movieRouter);

export const api = functions.https.onRequest(app);

// require the express module
import express from "express";
import { getClient } from "../db";
import UserProfile, { RankedMovie } from "../models/UserProfile";
import { MongoClient } from "mongodb";
import { getUserProfileQuery } from "../services/mongodb/userQueries";

// create a new Router object
const userProfileRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// GET requests
userProfileRouter.get("/search-profile/uid/:uid", async (req, res) => {
  try {
    const uid: string = req.params.uid;

    const client: MongoClient = await getClient();
    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

userProfileRouter.get(
  "/search-profile/username/:username",
  async (req, res) => {
    try {
      const username: string = req.params.username;

      const client: MongoClient = await getClient();
      const returnedUserProfile = await getUserProfileQuery(
        "username",
        username,
        client
      );

      res.status(200).json(returnedUserProfile);
    } catch (err) {
      errorResponse(err, res);
    }
  }
);

// POST request
userProfileRouter.post("/add-profile", async (req, res) => {
  try {
    const newUserProfile: UserProfile = req.body.newUserProfile;

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .insertOne(newUserProfile);

    const returnedUserProfile = await getUserProfileQuery(
      "uid",
      newUserProfile.uid,
      client
    );

    res.status(201).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

// PUT requests
userProfileRouter.put("/update-profile", async (req, res) => {
  try {
    const updatedUserProfile: UserProfile = req.body.updatedUserProfile;
    const { uid } = updatedUserProfile;

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .replaceOne({ uid }, updatedUserProfile);

    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

userProfileRouter.put("/add-movie", async (req, res) => {
  try {
    const uid: string = req.body.uid;
    const id: number = Number(req.body.id);
    const preference: string = req.body.preference;
    const ranking: number = Number(req.body.ranking);

    const rankedMovie: RankedMovie = {
      id,
      preference,
      ranking,
      rating: 10,
    };

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .updateOne({ uid }, { $push: { rankedMovies: rankedMovie } });

    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userProfileRouter;

// require the express module
import express from "express";
import { getClient } from "../db";
import UserProfile, { SavedMovie } from "../models/UserProfile";
import { MongoClient } from "mongodb";
import { getUserProfileQuery } from "../services/mongodb/userQueries";

// create a new Router object
const userProfileRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// GET requests
/**
 * Used to search for a user profile. Can use either uid or username to complete the request
 */
userProfileRouter.get("/search-profile/:type/:identifier", async (req, res) => {
  try {
    const type: string = req.params.type;
    const identifier: string = req.params.identifier;

    const client: MongoClient = await getClient();
    const returnedUserProfile = await getUserProfileQuery(
      type,
      identifier,
      client
    );

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

// POST request
/**
 * Used to create a new user profile
 */
userProfileRouter.post("/add-profile", async (req, res) => {
  try {
    const uid: string = req.body.uid;
    const newUserProfile: UserProfile = {
      uid,
      email: "",
      username: "",
      displayName: "",
      photoURL: "",
      watchedMovies: [],
      watchlistMovies: [],
    };

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
/**
 * Used to update things on the user's profile, such as email, phone number, etc.
 */
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

/**
 * Used to add movies to the user's watchedMovies array. Will also remove the movie from the user's watchlist if applicable
 */
userProfileRouter.put("/add-watched-movie", async (req, res) => {
  try {
    const uid: string = req.body.uid;
    const id: number = Number(req.body.id);
    const preference: string = req.body.preference;
    const ranking: number = Number(req.body.ranking);

    const savedMovie: SavedMovie = {
      id,
      preference,
      ranking,
      rating: 10,
    };

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .updateOne(
        { uid },
        {
          $push: { watchedMovies: savedMovie },
          $pull: { watchlistMovies: { id } },
        }
      );

    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

/**
 * Used to remove a movie from the user's watchedMovie array
 */
userProfileRouter.put("/remove-watched-movie", async (req, res) => {
  try {
    const uid: string = req.body.uid;
    const id: number = Number(req.body.id);

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .updateOne({ uid }, { $pull: { watchedMovies: { id } } });

    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

/**
 * Used to add movies to the user's watchlist array
 */
userProfileRouter.put("/add-watchlist-movie", async (req, res) => {
  try {
    const uid: string = req.body.uid;
    const id: number = Number(req.body.id);

    const savedMovie: SavedMovie = {
      id,
    };

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .updateOne({ uid }, { $push: { watchlistMovies: savedMovie } });

    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

/**
 * Used to remove a movie from the user's watchlist array
 */
userProfileRouter.put("/remove-watchlist-movie", async (req, res) => {
  try {
    const uid: string = req.body.uid;
    const id: number = Number(req.body.id);

    const client: MongoClient = await getClient();

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .updateOne({ uid }, { $pull: { watchlistMovies: { id } } });

    const returnedUserProfile = await getUserProfileQuery("uid", uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userProfileRouter;

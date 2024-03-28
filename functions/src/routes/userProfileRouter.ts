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
 * Used to search for a user profile. Uses uid to complete the request
 */
userProfileRouter.get("/search-profile-by-uid/:uid", async (req, res) => {
  try {
    const uid: string = req.params.uid;

    const client: MongoClient = await getClient();
    const returnedUserProfile = await getUserProfileQuery(uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

/**
 * Used to search for an array of user profiles based on supplied query
 */
userProfileRouter.get(
  "/search-profiles-by-query/:query/:username",
  async (req, res) => {
    try {
      const query: string = req.params.query;
      const username: string = req.params.username;

      const client: MongoClient = await getClient();
      const results = await client
        .db()
        .collection<UserProfile>("userProfiles")
        .aggregate([
          {
            $match: {
              username: {
                $regex: query,
                $options: "i",
                $ne: username,
              },
            },
          },
          {
            $unwind: {
              path: "$watchedMovies",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: "$_id",
              uid: { $first: "$uid" },
              email: { $first: "$email" },
              username: { $first: "$username" },
              displayName: { $first: "$displayName" },
              photoURL: { $first: "$photoURL" },
              watchedMovies: { $push: "$watchedMovies" },
              watchlistMovies: { $first: "$watchlistMovies" },
            },
          },
          {
            $lookup: {
              from: "movies",
              localField: "watchedMovies.id",
              foreignField: "id",
              as: "watchedMovie",
            },
          },
          {
            $set: {
              watchedMovies: {
                $map: {
                  input: "$watchedMovies",
                  in: {
                    $mergeObjects: [
                      "$$this",
                      {
                        movie: {
                          $arrayElemAt: [
                            "$watchedMovie",
                            {
                              $indexOfArray: ["$watchedMovie.id", "$$this.id"],
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $unwind: {
              path: "$watchlistMovies",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: "$_id",
              uid: { $first: "$uid" },
              email: { $first: "$email" },
              username: { $first: "$username" },
              displayName: { $first: "$displayName" },
              photoURL: { $first: "$photoURL" },
              watchedMovies: { $first: "$watchedMovies" },
              watchlistMovies: { $push: "$watchlistMovies" },
            },
          },
          {
            $lookup: {
              from: "movies",
              localField: "watchlistMovies.id",
              foreignField: "id",
              as: "watchlistMovie",
            },
          },
          {
            $set: {
              watchlistMovies: {
                $map: {
                  input: "$watchlistMovies",
                  in: {
                    $mergeObjects: [
                      "$$this",
                      {
                        movie: {
                          $arrayElemAt: [
                            "$watchlistMovie",
                            {
                              $indexOfArray: [
                                "$watchlistMovie.id",
                                "$$this.id",
                              ],
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              watchedMovie: 0,
              watchlistMovie: 0,
            },
          },
        ])
        .toArray();

      res.status(200).json(results);
    } catch (err) {
      errorResponse(err, res);
    }
  }
);

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

    const returnedUserProfile = await getUserProfileQuery(uid, client);

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

    const returnedUserProfile = await getUserProfileQuery(uid, client);

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
    // Checks to see if incoming watched movie has same ranking as another
    const match: boolean = req.body.match;

    const savedMovie: SavedMovie = {
      id,
      preference,
      ranking,
      rating: 10,
    };

    const client: MongoClient = await getClient();

    // If incoming watched movie does not match another,
    // then increment all movies ranked after by 1
    if (!match) {
      await client
        .db()
        .collection<UserProfile>("userProfiles")
        .updateOne(
          { uid },
          { $inc: { "watchedMovies.$[elem].ranking": 1 } },
          { arrayFilters: [{ "elem.ranking": { $gte: ranking } }] }
        );
    }

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

    const returnedUserProfile = await getUserProfileQuery(uid, client);

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
    const uid = req.body.uid;
    const id = Number(req.body.id);

    const client = await getClient();

    const userProfile = await client
      .db()
      .collection<UserProfile>("userProfiles")
      .findOne({ uid });

    const movieToBeRemovedIndex = userProfile?.watchedMovies.findIndex(
      (movie) => movie.id === id
    );

    if (movieToBeRemovedIndex !== -1 && movieToBeRemovedIndex) {
      const movieToBeRemoved = userProfile?.watchedMovies.splice(
        movieToBeRemovedIndex,
        1
      )[0];

      if (movieToBeRemoved) {
        const match = userProfile?.watchedMovies.some(
          (movie) => movie.ranking === movieToBeRemoved.ranking
        );

        if (!match) {
          await client
            .db()
            .collection<UserProfile>("userProfiles")
            .updateOne(
              { uid },
              { $inc: { "watchedMovies.$[elem].ranking": -1 } },
              {
                arrayFilters: [
                  { "elem.ranking": { $gt: movieToBeRemoved.ranking } },
                ],
              }
            );
        }
      }
    }

    await client
      .db()
      .collection<UserProfile>("userProfiles")
      .updateOne({ uid }, { $pull: { watchedMovies: { id } } });

    const returnedUserProfile = await getUserProfileQuery(uid, client);

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

    const returnedUserProfile = await getUserProfileQuery(uid, client);

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

    const returnedUserProfile = await getUserProfileQuery(uid, client);

    res.status(200).json(returnedUserProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userProfileRouter;

import { Document, MongoClient } from "mongodb";
import UserProfile from "../../models/UserProfile";

export const getUserProfileQuery = async (
  uid: string,
  client: MongoClient
): Promise<UserProfile | null> => {
  const results: Document = await client
    .db()
    .collection<UserProfile>("userProfiles")
    .aggregate([
      { $match: { uid } },
      { $unwind: { path: "$watchedMovies", preserveNullAndEmptyArrays: true } },
      { $sort: { "watchedMovies.ranking": 1 } },
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
                        { $indexOfArray: ["$watchedMovie.id", "$$this.id"] },
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
        $unwind: { path: "$watchlistMovies", preserveNullAndEmptyArrays: true },
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
                        { $indexOfArray: ["$watchlistMovie.id", "$$this.id"] },
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

  return results[0];
};

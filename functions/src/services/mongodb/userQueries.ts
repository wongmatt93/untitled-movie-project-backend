import { Document, MongoClient } from "mongodb";
import UserProfile from "../../models/UserProfile";

export const getUserProfileQuery = async (
  type: string,
  identifier: string,
  client: MongoClient
): Promise<UserProfile | null> => {
  const identifyingObject =
    type === "uid" ? { uid: identifier } : { username: identifier };

  const results: Document = await client
    .db()
    .collection<UserProfile>("userProfiles")
    .aggregate([
      { $match: { ...identifyingObject } },
      { $unwind: "$rankedMovies" },
      {
        $lookup: {
          from: "movies",
          localField: "rankedMovies.id",
          foreignField: "id",
          as: "rankedMovies.movie",
        },
      },
      { $unwind: "$rankedMovies.movie" },
      {
        $group: {
          _id: "$_id",
          uid: { $first: "$uid" },
          email: { $first: "$email" },
          username: { $first: "$username" },
          displayName: { $first: "$displayName" },
          photoURL: { $first: "$photoURL" },
          rankedMovies: { $push: "$rankedMovies" },
        },
      },
      { $project: { _id: 0, "rankedMovies.movie._id": 0 } },
    ])
    .toArray();

  return results[0];
};

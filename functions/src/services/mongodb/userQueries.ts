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
      {
        $lookup: {
          from: "movies", // Name of the collection containing movie information
          localField: "watchedMovies.positive.id", // Field in the userProfiles collection
          foreignField: "id", // Field in the movies collection
          as: "positiveMovies", // Alias for the joined documents
        },
      },
      {
        $addFields: {
          "watchedMovies.positive": {
            $map: {
              input: "$watchedMovies.positive",
              as: "positiveMovie",
              in: {
                $mergeObjects: [
                  "$$positiveMovie",
                  {
                    movie: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$positiveMovies",
                            as: "positiveMovieDoc",
                            cond: {
                              $eq: [
                                "$$positiveMovieDoc.id",
                                "$$positiveMovie.id",
                              ],
                            },
                          },
                        },
                        0,
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
        $lookup: {
          from: "movies", // Name of the collection containing movie information
          localField: "watchedMovies.neutral.id", // Field in the userProfiles collection
          foreignField: "id", // Field in the movies collection
          as: "neutralMovies", // Alias for the joined documents
        },
      },
      {
        $addFields: {
          "watchedMovies.neutral": {
            $map: {
              input: "$watchedMovies.neutral",
              as: "neutralMovie",
              in: {
                $mergeObjects: [
                  "$$neutralMovie",
                  {
                    movie: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$neutralMovies",
                            as: "neutralMovieDoc",
                            cond: {
                              $eq: [
                                "$$neutralMovieDoc.id",
                                "$$neutralMovie.id",
                              ],
                            },
                          },
                        },
                        0,
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
        $lookup: {
          from: "movies", // Name of the collection containing movie information
          localField: "watchedMovies.negative.id", // Field in the userProfiles collection
          foreignField: "id", // Field in the movies collection
          as: "negativeMovies", // Alias for the joined documents
        },
      },
      {
        $addFields: {
          "watchedMovies.negative": {
            $map: {
              input: "$watchedMovies.negative",
              as: "negativeMovie",
              in: {
                $mergeObjects: [
                  "$$negativeMovie",
                  {
                    movie: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$negativeMovies",
                            as: "negativeMovieDoc",
                            cond: {
                              $eq: [
                                "$$negativeMovieDoc.id",
                                "$$negativeMovie.id",
                              ],
                            },
                          },
                        },
                        0,
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

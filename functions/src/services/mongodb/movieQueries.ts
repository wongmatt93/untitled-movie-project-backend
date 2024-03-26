import Movie, { MovieCredits } from "../../models/Movie";
import axios from "axios";
import { getClient } from "../../db";

export const getMoviesQuery = async (
  movies: Movie[],
  api_key: string
): Promise<Movie[]> => {
  const client = await getClient();

  return await Promise.all(
    movies.map(async (movie) => {
      const result = await client
        .db()
        .collection<Movie>("movies")
        .findOne({ id: movie.id });

      if (result) {
        return result;
      } else {
        const tmdbCredits: MovieCredits = (
          await axios.get(
            `https://api.themoviedb.org/3/movie/${movie.id}/credits`,
            {
              params: { api_key },
            }
          )
        ).data;

        const {
          id,
          title,
          release_date,
          overview,
          genres,
          poster_path,
          backdrop_path,
          runtime,
        } = movie;

        const { cast, crew } = tmdbCredits;

        const newMovie: Movie = {
          id,
          title,
          release_date,
          overview,
          genres,
          poster_path,
          backdrop_path,
          runtime,
          credits: { cast, crew },
        };

        await client
          .db()
          .collection<Movie>("movies")
          .updateOne({ id }, { $setOnInsert: newMovie }, { upsert: true });

        const addedMovie = await client
          .db()
          .collection<Movie>("movies")
          .findOne({ id: newMovie.id });

        return addedMovie!;
      }
    })
  );
};

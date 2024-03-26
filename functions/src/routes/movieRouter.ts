// require the express module
import * as functions from "firebase-functions";
import express from "express";
import { getClient } from "../db";
import Movie from "../models/Movie";
import axios from "axios";
import { MovieCredits } from "../models/Movie";
import { getMoviesQuery } from "../services/mongodb/movieQueries";

// create a new Router object
const movieRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// GET request
/**
 * Used to search for a movie. Uses id to complete the request
 */
movieRouter.get("/search/:id", async (req, res) => {
  try {
    const id: number = Number(req.params.id);
    const client = await getClient();
    const result = await client
      .db()
      .collection<Movie>("movies")
      .findOne({ id });

    if (result) {
      res.status(200).json(result);
    } else {
      const api_key: string = functions.config().tmdb.api_key;
      const tmdbResult: Movie = (
        await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
          params: { api_key },
        })
      ).data;

      const tmdbCredits: MovieCredits = (
        await axios.get(`https://api.themoviedb.org/3/movie/${id}/credits`, {
          params: { api_key },
        })
      ).data;

      const {
        title,
        release_date,
        overview,
        genres,
        poster_path,
        backdrop_path,
        runtime,
      } = tmdbResult;

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
        .updateOne(
          { id: newMovie.id },
          { $setOnInsert: newMovie },
          { upsert: true }
        );

      const addedMovie = await client
        .db()
        .collection<Movie>("movies")
        .findOne({ id: newMovie.id });

      res.status(201).json(addedMovie);
    }
  } catch (err) {
    errorResponse(err, res);
  }
});

/**
 * Used to get Popular movies from TMDB and formatted in a way for this app
 */
movieRouter.get("/get-popular-movies", async (_, res) => {
  try {
    const api_key: string = functions.config().tmdb.api_key;
    const popularMovies: Movie[] = (
      await axios.get("https://api.themoviedb.org/3/movie/popular", {
        params: { api_key },
      })
    ).data.results;

    const movies: Movie[] = await getMoviesQuery(popularMovies, api_key);

    res.status(201).json(movies);
  } catch (err) {
    errorResponse(err, res);
  }
});

/**
 * Used to get movies per search query from TMDB and formatted in a way for this app
 */
movieRouter.get("/get-movies-by-query/:query", async (req, res) => {
  try {
    const query: string = req.params.query;
    const api_key: string = functions.config().tmdb.api_key;

    const returnedMovies: Movie[] = (
      await axios.get("https://api.themoviedb.org/3/search/movie", {
        params: { api_key, query },
      })
    ).data.results;

    const movies: Movie[] = await getMoviesQuery(returnedMovies, api_key);

    res.status(201).json(movies);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default movieRouter;

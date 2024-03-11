import { ObjectId } from "mongodb";

interface Person {
  adult: string;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  profile_path: string;
  cast_id: number;
  character: string;
  credit_id: string;
  order: number;
}

export interface MovieCredits {
  cast: Person[];
  crew: Person[];
}

interface Genre {
  id: number;
  name: string;
}

export default interface Movie {
  _id?: ObjectId;
  id: number;
  title: string;
  release_date: string;
  overview: string;
  genres: Genre[];
  poster_path: string;
  backdrop_path: string;
  runtime: number;
  credits: MovieCredits;
}

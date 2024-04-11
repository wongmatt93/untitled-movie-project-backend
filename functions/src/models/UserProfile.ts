import { ObjectId } from "mongodb";

interface WatchedMovies {
  positive: SavedMovie[];
  neutral: SavedMovie[];
  negative: SavedMovie[];
}

export interface SavedMovie {
  id: number;
  ranking?: number;
  rating?: number;
}

export default interface UserProfile {
  _id?: ObjectId;
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  watchedMovies: WatchedMovies;
  watchlistMovies: SavedMovie[];
}

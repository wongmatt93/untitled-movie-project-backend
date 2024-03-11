import { ObjectId } from "mongodb";

export interface RankedMovie {
  id: number;
  preference: string;
  ranking: number;
  rating: number;
}

export default interface UserProfile {
  _id?: ObjectId;
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  rankedMovies: RankedMovie[];
}

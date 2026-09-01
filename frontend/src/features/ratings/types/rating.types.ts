export interface FacilityRatingScores {
  cleanliness: number;
  safety: number;
  accessibility: number;
  accuracy: number;
}

export interface FacilityRating extends FacilityRatingScores {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityRatingSummary {
  count: number;
  overall: number | null;
  cleanliness: number | null;
  safety: number | null;
  accessibility: number | null;
  accuracy: number | null;
}

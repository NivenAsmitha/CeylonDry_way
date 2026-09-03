export interface FacilityRatingScores {
  cleanliness: number;
  safety: number;
  accessibility: number;
  accuracy: number;
}

export interface FacilityRating extends FacilityRatingScores {
  id: string;
  reviewText: string | null;
  visitDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityRatingInput extends FacilityRatingScores {
  reviewText?: string | null;
  visitDate?: string | null;
}

export interface FacilityReview extends FacilityRating {
  author: { id: string; name: string };
  reply: {
    id: string;
    message: string;
    author: { id: string; name: string };
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface FacilityReviewList {
  items: FacilityReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FacilityRatingSummary {
  count: number;
  overall: number | null;
  cleanliness: number | null;
  safety: number | null;
  accessibility: number | null;
  accuracy: number | null;
}

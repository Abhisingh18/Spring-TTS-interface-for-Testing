/** Records shared by every storage driver. */

export interface ParticipantRecord {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface RatingRecord {
  participantId: string;
  participantName: string;
  pairSlug: string;
  modelKey: string;
  naturalness: number | null;
  similarity: number | null;
  note: string | null;
  updatedAt: string;
}

export interface FeedbackRecord {
  participantId: string;
  participantName: string;
  text: string;
  updatedAt: string;
}

export interface Snapshot {
  participants: ParticipantRecord[];
  ratings: RatingRecord[];
  feedback: FeedbackRecord[];
}

export interface Store {
  /** Human-readable driver name, shown on the admin page. */
  readonly kind: "file" | "postgres";
  upsertParticipant: (participant: ParticipantRecord) => Promise<void>;
  saveRating: (rating: RatingRecord) => Promise<void>;
  saveFeedback: (feedback: FeedbackRecord) => Promise<void>;
  ratingsFor: (participantId: string) => Promise<RatingRecord[]>;
  snapshot: () => Promise<Snapshot>;
}

export type ContestStatus = "draft" | "scheduled" | "running" | "ended";

export type Contest = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: ContestStatus;
  created_at: string;
};

export type Admin = {
  id: string;
  name: string;
  email: string;
};

export type Team = {
  id: string;
  contest_id: string;
  team_code: string;
  display_name: string;
};

export type Question = {
  id: string;
  contest_id: string;
  serial: number;
  word: string | null;
  answer_options: string[];
  audio_storage_path: string;
  audio_file_name: string;
  hint: string | null;
  points: number;
};

export type ScoreboardRow = {
  team_id: string;
  team_code: string;
  display_name: string;
  score: number;
  correct_count: number;
  submitted_count: number;
  total_questions: number;
  updated_at: string | null;
};

CREATE TABLE IF NOT EXISTS project_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,

  innovation_density_score integer,
  experimentation_score integer,
  uncertainty_score integer,
  iteration_score integer,

  documentation_strength integer,
  evidence_score integer,
  timeline_score integer,
  narrative_score integer,
  cost_support_score integer,

  overall_health_score integer,
  health_rating text,
  risk_level text,

  reasons_json jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_health_scores_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES claim_projects(id) ON DELETE CASCADE,
  CONSTRAINT project_health_scores_health_rating_check
    CHECK (health_rating IN ('excellent','strong','moderate','weak') OR health_rating IS NULL),
  CONSTRAINT project_health_scores_risk_level_check
    CHECK (risk_level IN ('low','medium','high') OR risk_level IS NULL)
);

ALTER TABLE project_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_health_scores_all_auth
  ON project_health_scores
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_project_health_scores_project_id
  ON project_health_scores(project_id);

CREATE INDEX IF NOT EXISTS idx_project_health_scores_updated_at
  ON project_health_scores(updated_at DESC);
ALTER TABLE public.sdr_prospects
ADD COLUMN engagement_strategy_json jsonb NULL,
ADD COLUMN engagement_recommended_first_touch text NULL,
ADD COLUMN engagement_fallback_touch text NULL,
ADD COLUMN engagement_confidence text NULL,
ADD COLUMN engagement_account_persona text NULL,
ADD COLUMN engagement_email_score numeric(5,2) NULL,
ADD COLUMN engagement_call_score numeric(5,2) NULL,
ADD COLUMN engagement_face_to_face_score numeric(5,2) NULL,
ADD COLUMN engagement_digital_maturity_score numeric(5,2) NULL,
ADD COLUMN engagement_relationship_score numeric(5,2) NULL,
ADD COLUMN engagement_local_visit_score numeric(5,2) NULL,
ADD COLUMN engagement_decision_maker_access_score numeric(5,2) NULL,
ADD COLUMN engagement_education_need_score numeric(5,2) NULL,
ADD COLUMN engagement_commercial_value_score numeric(5,2) NULL,
ADD COLUMN engagement_urgency_trigger_score numeric(5,2) NULL,
ADD COLUMN engagement_reason_codes text[] NULL,
ADD COLUMN engagement_evidence_summary text[] NULL,
ADD COLUMN engagement_suggested_opener text NULL,
ADD COLUMN engagement_suggested_subject_line text NULL,
ADD COLUMN engagement_suggested_call_opener text NULL,
ADD COLUMN engagement_suggested_meeting_angle text NULL,
ADD COLUMN engagement_next_best_action text NULL,
ADD COLUMN engagement_observed_real_preference text NULL,
ADD COLUMN engagement_observed_preference_notes text NULL,
ADD COLUMN engagement_last_tested_channel text NULL,
ADD COLUMN engagement_last_tested_outcome text NULL,
ADD COLUMN engagement_generated_at timestamp with time zone NULL,
ADD COLUMN engagement_generated_from_version text NULL,
ADD COLUMN engagement_ai_generation_status text NULL;

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_recommended_first_touch_check
CHECK (
  engagement_recommended_first_touch IS NULL
  OR engagement_recommended_first_touch IN ('email','call','face_to_face')
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_fallback_touch_check
CHECK (
  engagement_fallback_touch IS NULL
  OR engagement_fallback_touch IN ('email','call','face_to_face')
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_observed_real_preference_check
CHECK (
  engagement_observed_real_preference IS NULL
  OR engagement_observed_real_preference IN ('email','call','face_to_face')
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_last_tested_channel_check
CHECK (
  engagement_last_tested_channel IS NULL
  OR engagement_last_tested_channel IN ('email','call','face_to_face')
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_confidence_check
CHECK (
  engagement_confidence IS NULL
  OR engagement_confidence IN ('high','medium','low')
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_account_persona_check
CHECK (
  engagement_account_persona IS NULL
  OR engagement_account_persona IN (
    'owner_led_practical_sme',
    'operationally_stretched_growth_company',
    'formal_mid_market_business',
    'technical_engineering_led_business',
    'procurement_or_compliance_led_organisation',
    'relationship_led_local_business'
  )
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_ai_generation_status_check
CHECK (
  engagement_ai_generation_status IS NULL
  OR engagement_ai_generation_status IN ('pending','success','error')
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_email_score_check
CHECK (
  engagement_email_score IS NULL
  OR (engagement_email_score >= 0 AND engagement_email_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_call_score_check
CHECK (
  engagement_call_score IS NULL
  OR (engagement_call_score >= 0 AND engagement_call_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_face_to_face_score_check
CHECK (
  engagement_face_to_face_score IS NULL
  OR (engagement_face_to_face_score >= 0 AND engagement_face_to_face_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_digital_maturity_score_check
CHECK (
  engagement_digital_maturity_score IS NULL
  OR (engagement_digital_maturity_score >= 0 AND engagement_digital_maturity_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_relationship_score_check
CHECK (
  engagement_relationship_score IS NULL
  OR (engagement_relationship_score >= 0 AND engagement_relationship_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_local_visit_score_check
CHECK (
  engagement_local_visit_score IS NULL
  OR (engagement_local_visit_score >= 0 AND engagement_local_visit_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_decision_maker_access_score_check
CHECK (
  engagement_decision_maker_access_score IS NULL
  OR (engagement_decision_maker_access_score >= 0 AND engagement_decision_maker_access_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_education_need_score_check
CHECK (
  engagement_education_need_score IS NULL
  OR (engagement_education_need_score >= 0 AND engagement_education_need_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_commercial_value_score_check
CHECK (
  engagement_commercial_value_score IS NULL
  OR (engagement_commercial_value_score >= 0 AND engagement_commercial_value_score <= 100)
);

ALTER TABLE public.sdr_prospects
ADD CONSTRAINT sdr_prospects_engagement_urgency_trigger_score_check
CHECK (
  engagement_urgency_trigger_score IS NULL
  OR (engagement_urgency_trigger_score >= 0 AND engagement_urgency_trigger_score <= 100)
);
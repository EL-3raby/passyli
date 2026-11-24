-- =====================================================================
-- باصيلي (Passyli) — Phase 7: Matchmaking & Open Matches System
-- =====================================================================

-- 1. Enhance matchmaking_posts table structure
ALTER TABLE public.matchmaking_posts 
  ALTER COLUMN creator_id DROP NOT NULL;

ALTER TABLE public.matchmaking_posts 
  ADD COLUMN IF NOT EXISTS creator_name TEXT NOT NULL DEFAULT 'كابتن الفرقة',
  ADD COLUMN IF NOT EXISTS creator_phone VARCHAR(20) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- 2. Adjust RLS Policies
DROP POLICY IF EXISTS "Authenticated users can create matchmaking posts" ON public.matchmaking_posts;

CREATE POLICY "Anyone can create matchmaking posts" 
  ON public.matchmaking_posts FOR INSERT 
  WITH CHECK (TRUE);

CREATE POLICY "Anyone can update matchmaking posts status" 
  ON public.matchmaking_posts FOR UPDATE 
  USING (TRUE);

-- 3. RPC: Create Matchmaking Post (إنشاء منشور تقسيمة مفتوحة)
CREATE OR REPLACE FUNCTION public.create_matchmaking_post(
  p_court_id UUID,
  p_sport public.sport_type,
  p_match_date DATE,
  p_start_time TIME,
  p_players_needed INTEGER,
  p_cost_per_player INTEGER,
  p_creator_name TEXT,
  p_creator_phone VARCHAR(20),
  p_whatsapp_number VARCHAR(20) DEFAULT NULL,
  p_required_position TEXT DEFAULT 'أي مركز',
  p_skill_level TEXT DEFAULT 'متوسط',
  p_notes TEXT DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_post_id UUID;
BEGIN
  INSERT INTO public.matchmaking_posts (
    court_id,
    sport,
    match_date,
    start_time,
    players_needed,
    current_players,
    cost_per_player,
    creator_name,
    creator_phone,
    whatsapp_number,
    required_position,
    skill_level,
    notes,
    booking_id,
    status
  ) VALUES (
    p_court_id,
    p_sport,
    p_match_date,
    p_start_time,
    p_players_needed,
    0,
    p_cost_per_player,
    p_creator_name,
    p_creator_phone,
    COALESCE(p_whatsapp_number, p_creator_phone),
    p_required_position,
    p_skill_level,
    p_notes,
    p_booking_id,
    'open'
  )
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'post_id', v_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Update Matchmaking Status (اكتمل العدد أو إلغاء التقسيمة)
CREATE OR REPLACE FUNCTION public.update_matchmaking_status(
  p_post_id UUID,
  p_status public.matchmaking_status
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.matchmaking_posts
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_posts;
  EXCEPTION WHEN duplicate_object THEN
    -- already added
  END;
END $$;

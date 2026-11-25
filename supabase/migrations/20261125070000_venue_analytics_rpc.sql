-- =====================================================================
-- باصيلي (Passyli) — Venue Owner Financial & Operational Analytics RPC
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_venue_analytics(
  p_venue_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  v_authorized BOOLEAN;
  v_days_count INTEGER;
  v_active_courts_count INTEGER;
  v_total_avail_hours NUMERIC;
  v_summary JSONB;
  v_courts JSONB;
  v_daily JSONB;
  v_hourly JSONB;
  v_channels JSONB;
  v_payments JSONB;
  v_ratings JSONB;
BEGIN
  -- 1. Authorization check: Owner or Super Admin
  v_authorized := public.is_venue_owner_or_admin(p_venue_id);
  IF NOT v_authorized THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'غير مصرح لك باستعراض الإحصائيات المالية لهذه المنشأة'
    );
  END IF;

  -- Ensure valid date range
  IF p_start_date > p_end_date THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية'
    );
  END IF;

  v_days_count := (p_end_date - p_start_date) + 1;

  -- 2. Count active courts and total operating hours available (assuming 16 hours daily per court: 09:00 to 01:00)
  SELECT COUNT(*) INTO v_active_courts_count
  FROM public.courts
  WHERE venue_id = p_venue_id AND is_active = TRUE;

  IF v_active_courts_count = 0 THEN
    SELECT COUNT(*) INTO v_active_courts_count
    FROM public.courts
    WHERE venue_id = p_venue_id;
  END IF;

  v_total_avail_hours := GREATEST(v_active_courts_count * v_days_count * 16, 1);

  -- 3. Core Financial & Operational Summary
  WITH venue_courts AS (
    SELECT id FROM public.courts WHERE venue_id = p_venue_id
  ),
  period_bookings AS (
    SELECT 
      b.*,
      EXTRACT(EPOCH FROM (
        CASE 
          WHEN b.end_time < b.start_time THEN (b.end_time + INTERVAL '24 hours') - b.start_time
          ELSE b.end_time - b.start_time
        END
      )) / 3600.0 AS duration_hours
    FROM public.bookings b
    WHERE b.court_id IN (SELECT id FROM venue_courts)
      AND b.booking_date >= p_start_date
      AND b.booking_date <= p_end_date
  )
  SELECT jsonb_build_object(
    'total_bookings', COALESCE(COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')), 0),
    'completed_bookings', COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0),
    'confirmed_bookings', COALESCE(COUNT(*) FILTER (WHERE status = 'confirmed'), 0),
    'cancelled_bookings', COALESCE(COUNT(*) FILTER (WHERE status = 'cancelled'), 0),
    'pending_payment_bookings', COALESCE(COUNT(*) FILTER (WHERE status = 'pending_payment'), 0),
    'gross_revenue', COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0),
    'collected_revenue', COALESCE(
      SUM(
        CASE 
          WHEN status = 'completed' THEN total_price
          WHEN status = 'confirmed' THEN deposit_paid
          ELSE 0
        END
      ), 0
    ),
    'pending_cash', COALESCE(SUM(cash_remaining) FILTER (WHERE status = 'confirmed'), 0),
    'total_booked_hours', ROUND(COALESCE(SUM(duration_hours) FILTER (WHERE status IN ('confirmed', 'completed')), 0)::NUMERIC, 1),
    'occupancy_rate', ROUND(
      LEAST(
        (COALESCE(SUM(duration_hours) FILTER (WHERE status IN ('confirmed', 'completed')), 0)::NUMERIC / v_total_avail_hours) * 100,
        100.0
      ), 1
    ),
    'avg_booking_price', ROUND(
      COALESCE(AVG(total_price) FILTER (WHERE status IN ('confirmed', 'completed')), 0)::NUMERIC, 0
    )
  ) INTO v_summary
  FROM period_bookings;

  -- 4. Per-Court Breakdown & Star Court Determination
  WITH venue_courts AS (
    SELECT c.id, c.name, c.sport, c.surface, c.price_morning, c.price_evening, c.is_active
    FROM public.courts c
    WHERE c.venue_id = p_venue_id
  ),
  court_stats AS (
    SELECT 
      vc.id AS court_id,
      vc.name AS court_name,
      vc.sport::TEXT AS sport,
      vc.surface::TEXT AS surface,
      vc.price_morning,
      vc.price_evening,
      vc.is_active,
      COALESCE(COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS total_bookings,
      COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS gross_revenue,
      COALESCE(
        SUM(
          CASE 
            WHEN b.status = 'completed' THEN b.total_price
            WHEN b.status = 'confirmed' THEN b.deposit_paid
            ELSE 0
          END
        ), 0
      ) AS collected_revenue,
      ROUND(
        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM (
              CASE 
                WHEN b.end_time < b.start_time THEN (b.end_time + INTERVAL '24 hours') - b.start_time
                ELSE b.end_time - b.start_time
              END
            )) / 3600.0
          ) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0
        )::NUMERIC, 1
      ) AS total_hours
    FROM venue_courts vc
    LEFT JOIN public.bookings b ON b.court_id = vc.id
      AND b.booking_date >= p_start_date
      AND b.booking_date <= p_end_date
    GROUP BY vc.id, vc.name, vc.sport, vc.surface, vc.price_morning, vc.price_evening, vc.is_active
  ),
  ranked_courts AS (
    SELECT 
      cs.*,
      ROUND(
        LEAST(
          (cs.total_hours / GREATEST(v_days_count * 16, 1)) * 100,
          100.0
        ), 1
      ) AS occupancy_rate,
      ROW_NUMBER() OVER (ORDER BY cs.gross_revenue DESC, cs.total_bookings DESC) AS rank_num
    FROM court_stats cs
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'court_id', rc.court_id,
        'court_name', rc.court_name,
        'sport', rc.sport,
        'surface', rc.surface,
        'price_morning', rc.price_morning,
        'price_evening', rc.price_evening,
        'is_active', rc.is_active,
        'total_bookings', rc.total_bookings,
        'gross_revenue', rc.gross_revenue,
        'collected_revenue', rc.collected_revenue,
        'total_hours', rc.total_hours,
        'occupancy_rate', rc.occupancy_rate,
        'is_star', (rc.rank_num = 1 AND rc.total_bookings > 0)
      ) ORDER BY rc.gross_revenue DESC, rc.total_bookings DESC
    ),
    '[]'::JSONB
  ) INTO v_courts
  FROM ranked_courts rc;

  -- 5. Daily Timeline (Aggregated per day for charts / trend table)
  WITH venue_courts AS (
    SELECT id FROM public.courts WHERE venue_id = p_venue_id
  ),
  days_series AS (
    SELECT d::DATE AS day_date
    FROM generate_series(p_start_date::TIMESTAMP, p_end_date::TIMESTAMP, '1 day'::INTERVAL) d
  ),
  daily_agg AS (
    SELECT 
      ds.day_date,
      COALESCE(COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS bookings_count,
      COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) AS gross_revenue,
      COALESCE(
        SUM(
          CASE 
            WHEN b.status = 'completed' THEN b.total_price
            WHEN b.status = 'confirmed' THEN b.deposit_paid
            ELSE 0
          END
        ), 0
      ) AS collected_revenue,
      COALESCE(SUM(b.cash_remaining) FILTER (WHERE b.status = 'confirmed'), 0) AS pending_cash
    FROM days_series ds
    LEFT JOIN public.bookings b ON b.booking_date = ds.day_date
      AND b.court_id IN (SELECT id FROM venue_courts)
    GROUP BY ds.day_date
    ORDER BY ds.day_date ASC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', TO_CHAR(day_date, 'YYYY-MM-DD'),
        'bookings_count', bookings_count,
        'gross_revenue', gross_revenue,
        'collected_revenue', collected_revenue,
        'pending_cash', pending_cash
      ) ORDER BY day_date ASC
    ),
    '[]'::JSONB
  ) INTO v_daily
  FROM daily_agg;

  -- 6. Hourly Distribution (From 09:00 to 01:00 next day)
  WITH venue_courts AS (
    SELECT id FROM public.courts WHERE venue_id = p_venue_id
  ),
  hours_template AS (
    SELECT h,
      CASE 
        WHEN h < 12 THEN LPAD(h::TEXT, 2, '0') || ':00 ص'
        WHEN h = 12 THEN '12:00 م'
        WHEN h < 24 THEN LPAD((h - 12)::TEXT, 2, '0') || ':00 م'
        WHEN h = 24 THEN '12:00 ص'
        ELSE LPAD((h - 24)::TEXT, 2, '0') || ':00 ص'
      END AS slot_label,
      (h >= 17 OR h < 6) AS is_peak
    FROM generate_series(9, 25) h
  ),
  hourly_booked AS (
    SELECT 
      CASE 
        WHEN EXTRACT(HOUR FROM b.start_time) < 6 THEN EXTRACT(HOUR FROM b.start_time)::INTEGER + 24
        ELSE EXTRACT(HOUR FROM b.start_time)::INTEGER
      END AS booking_hour,
      COUNT(b.id) AS cnt
    FROM public.bookings b
    WHERE b.court_id IN (SELECT id FROM venue_courts)
      AND b.booking_date >= p_start_date
      AND b.booking_date <= p_end_date
      AND b.status IN ('confirmed', 'completed')
    GROUP BY booking_hour
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'hour_24', ht.h,
        'slot_label', ht.slot_label,
        'is_peak', ht.is_peak,
        'bookings_count', COALESCE(hb.cnt, 0)
      ) ORDER BY ht.h ASC
    ),
    '[]'::JSONB
  ) INTO v_hourly
  FROM hours_template ht
  LEFT JOIN hourly_booked hb ON hb.booking_hour = ht.h;

  -- 7. Channel Split (Online vs Walk-in)
  WITH venue_courts AS (
    SELECT id FROM public.courts WHERE venue_id = p_venue_id
  )
  SELECT jsonb_build_object(
    'online_count', COALESCE(COUNT(*) FILTER (WHERE is_walkin = FALSE AND status IN ('confirmed', 'completed')), 0),
    'online_revenue', COALESCE(SUM(total_price) FILTER (WHERE is_walkin = FALSE AND status IN ('confirmed', 'completed')), 0),
    'walkin_count', COALESCE(COUNT(*) FILTER (WHERE is_walkin = TRUE AND status IN ('confirmed', 'completed')), 0),
    'walkin_revenue', COALESCE(SUM(total_price) FILTER (WHERE is_walkin = TRUE AND status IN ('confirmed', 'completed')), 0)
  ) INTO v_channels
  FROM public.bookings
  WHERE court_id IN (SELECT id FROM venue_courts)
    AND booking_date >= p_start_date
    AND booking_date <= p_end_date;

  -- 8. Payment Method Split
  WITH venue_courts AS (
    SELECT id FROM public.courts WHERE venue_id = p_venue_id
  ),
  booking_receipt_data AS (
    SELECT 
      r.payment_method::TEXT AS method,
      r.amount_paid
    FROM public.receipts r
    JOIN public.bookings b ON b.id = r.booking_id
    WHERE b.court_id IN (SELECT id FROM venue_courts)
      AND b.booking_date >= p_start_date
      AND b.booking_date <= p_end_date
      AND r.status = 'verified'
  )
  SELECT jsonb_build_object(
    'instapay_count', COALESCE(COUNT(*) FILTER (WHERE method = 'instapay'), 0),
    'instapay_amount', COALESCE(SUM(amount_paid) FILTER (WHERE method = 'instapay'), 0),
    'vodafone_count', COALESCE(COUNT(*) FILTER (WHERE method = 'vodafone_cash'), 0),
    'vodafone_amount', COALESCE(SUM(amount_paid) FILTER (WHERE method = 'vodafone_cash'), 0),
    'cash_on_pitch_amount', COALESCE((v_summary->>'collected_revenue')::INTEGER, 0) - COALESCE(SUM(amount_paid), 0)
  ) INTO v_payments
  FROM booking_receipt_data;

  -- 9. Ratings Summary (Turf, Lighting, Service from Phase 11 reviews)
  SELECT jsonb_build_object(
    'reviews_count', COALESCE(COUNT(*), 0),
    'avg_overall', ROUND(COALESCE(AVG(overall_rating), 0)::NUMERIC, 1),
    'avg_turf', ROUND(COALESCE(AVG(turf_rating), 0)::NUMERIC, 1),
    'avg_lighting', ROUND(COALESCE(AVG(lighting_rating), 0)::NUMERIC, 1),
    'avg_service', ROUND(COALESCE(AVG(service_rating), 0)::NUMERIC, 1)
  ) INTO v_ratings
  FROM public.venue_reviews
  WHERE venue_id = p_venue_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'venue_id', p_venue_id,
    'start_date', TO_CHAR(p_start_date, 'YYYY-MM-DD'),
    'end_date', TO_CHAR(p_end_date, 'YYYY-MM-DD'),
    'summary', v_summary,
    'courts_breakdown', v_courts,
    'daily_timeline', v_daily,
    'hourly_distribution', v_hourly,
    'channel_split', v_channels,
    'payment_methods', v_payments,
    'ratings_summary', v_ratings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SET CURRENT SCHEMA = 'EAGLE_EYE';

-- Drop existing procedure if recompiling
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLSTATE '42704' BEGIN END;
    EXECUTE IMMEDIATE 'DROP PROCEDURE EAGLE_EYE.SP_CALCULATE_CAMPUS_THREAT_INDEX';
END@

CREATE OR REPLACE PROCEDURE EAGLE_EYE.SP_CALCULATE_CAMPUS_THREAT_INDEX (
    IN  p_lookback_hours       INTEGER,
    OUT p_threat_score         DECIMAL(5, 2),
    OUT p_threat_level         VARCHAR(20),
    OUT p_critical_incidents   INTEGER,
    OUT p_recommended_action   VARCHAR(128)
)
LANGUAGE SQL
MODIFIES SQL DATA
DYNAMIC RESULT SETS 1
BEGIN
    -- Declare local counters
    DECLARE v_weapon_count      INTEGER DEFAULT 0;
    DECLARE v_fight_count       INTEGER DEFAULT 0;
    DECLARE v_unattended_count  INTEGER DEFAULT 0;
    DECLARE v_crowd_count       INTEGER DEFAULT 0;
    DECLARE v_raw_score         DECIMAL(7, 2) DEFAULT 0.0;
    
    -- Cursor for top recent high-risk incidents
    DECLARE c_recent_threats CURSOR WITH RETURN TO CLIENT FOR
        SELECT 
            I.INCIDENT_ID,
            C.CAMERA_CODE,
            C.LOCATION_LABEL,
            I.THREAT_TYPE,
            I.SEVERITY_LEVEL,
            I.CONFIDENCE_PCT,
            I.DETECTED_AT,
            I.DISPATCH_STATUS
        FROM EAGLE_EYE.INCIDENT_LOGS I
        JOIN EAGLE_EYE.CAMERAS C ON I.CAMERA_ID = C.CAMERA_ID
        WHERE I.DETECTED_AT >= (CURRENT TIMESTAMP - p_lookback_hours HOURS)
        ORDER BY 
            CASE I.SEVERITY_LEVEL
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                ELSE 4
            END,
            I.DETECTED_AT DESC
        FETCH FIRST 20 ROWS ONLY;

    -- Aggregate incident categories over lookback window
    SELECT 
        COALESCE(SUM(CASE WHEN THREAT_TYPE = 'WEAPON' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN THREAT_TYPE = 'FIGHT' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN THREAT_TYPE = 'UNATTENDED_OBJECT' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN THREAT_TYPE = 'OVERCROWDING' THEN 1 ELSE 0 END), 0)
    INTO 
        v_weapon_count,
        v_fight_count,
        v_unattended_count,
        v_crowd_count
    FROM EAGLE_EYE.INCIDENT_LOGS
    WHERE DETECTED_AT >= (CURRENT TIMESTAMP - p_lookback_hours HOURS);

    -- Calculate weighted threat score
    -- Weapons: 15 pts | Fights: 8 pts | Unattended Luggage: 4 pts | Overcrowding: 3 pts
    SET v_raw_score = (v_weapon_count * 15.0) + (v_fight_count * 8.0) + (v_unattended_count * 4.0) + (v_crowd_count * 3.0);
    
    -- Bound threat index between 0.0 and 100.0
    IF v_raw_score > 100.0 THEN
        SET p_threat_score = 100.00;
    ELSE
        SET p_threat_score = CAST(v_raw_score AS DECIMAL(5, 2));
    END IF;

    SET p_critical_incidents = v_weapon_count + v_fight_count;

    -- Categorize Tactical Security Readiness State
    IF p_threat_score >= 40.0 OR v_weapon_count > 0 THEN
        SET p_threat_level = 'CRITICAL (DEFCON-1)';
        SET p_recommended_action = 'Immediate campus lockdown & law enforcement tactical dispatch.';
    ELSEIF p_threat_score >= 20.0 OR v_fight_count > 0 THEN
        SET p_threat_level = 'ELEVATED THREAT';
        SET p_recommended_action = 'Deploy active ground patrol to north walkway & transit corridor.';
    ELSEIF p_threat_score >= 10.0 THEN
        SET p_threat_level = 'GUARDED MONITORING';
        SET p_recommended_action = 'Enhanced perimeter CCTV observation & alert queue triage.';
    ELSE
        SET p_threat_level = 'NOMINAL / NORMAL';
        SET p_recommended_action = 'Routine security monitoring. All systems nominal.';
    END IF;

    -- Open result set for visual display in IBM Db2 Developer Extension
    OPEN c_recent_threats;
END@

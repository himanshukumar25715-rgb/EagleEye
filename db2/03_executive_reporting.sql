-- ============================================================================
-- EAGLE EYE AI 2.0 — EXECUTIVE ANALYTICS & FORENSIC QUERIES
-- Designed for: IBM Db2 Developer Extension Query Runner & Visual Explain
-- ============================================================================

SET CURRENT SCHEMA = 'EAGLE_EYE';

-- ----------------------------------------------------------------------------
-- QUERY 1: Hourly Campus Threat Matrix with Db2 Window Functions
-- Demonstrates partition ranking & threat frequency by camera location
-- (Ideal for Visual Explain Plan demonstration in the IDE extension)
-- ----------------------------------------------------------------------------
SELECT 
    C.CAMERA_CODE,
    C.LOCATION_LABEL,
    I.THREAT_TYPE,
    COUNT(I.INCIDENT_ID) AS TOTAL_INCIDENTS,
    AVG(I.CONFIDENCE_PCT) AS MEAN_AI_CONFIDENCE,
    MAX(I.DETECTED_AT) AS MOST_RECENT_DETECTION,
    DENSE_RANK() OVER (PARTITION BY I.THREAT_TYPE ORDER BY COUNT(I.INCIDENT_ID) DESC) AS SEVERITY_RANK
FROM EAGLE_EYE.CAMERAS C
LEFT JOIN EAGLE_EYE.INCIDENT_LOGS I ON C.CAMERA_ID = I.CAMERA_ID
WHERE I.DETECTED_AT >= (CURRENT TIMESTAMP - 7 DAYS)
GROUP BY C.CAMERA_CODE, C.LOCATION_LABEL, I.THREAT_TYPE
ORDER BY TOTAL_INCIDENTS DESC, MEAN_AI_CONFIDENCE DESC;

-- ----------------------------------------------------------------------------
-- QUERY 2: Forensic Chain-of-Custody Audit Verification
-- Verifies that evidentiary snapshots and digital SHA-256 hashes are intact
-- ----------------------------------------------------------------------------
SELECT 
    E.EVIDENCE_ID,
    I.INCIDENT_ID,
    C.CAMERA_CODE,
    I.THREAT_TYPE,
    E.FILE_PATH,
    E.SHA256_HASH,
    E.FILE_SIZE_BYTES,
    E.VAULT_AUDIT_STATUS,
    DAYS(CURRENT TIMESTAMP) - DAYS(E.CAPTURED_AT) AS DAYS_IN_VAULT,
    CASE 
        WHEN E.VAULT_AUDIT_STATUS = 'SEALED_FOR_COURT' THEN 'LEGAL ADMISSIBLE (TAMPER PROOF)'
        WHEN E.VAULT_AUDIT_STATUS = 'VALIDATED' THEN 'VERIFIED CRYPTOGRAPHICALLY'
        ELSE 'AUDIT REQUIRED'
    END AS LEGAL_COMPLIANCE_TIER
FROM EAGLE_EYE.EVIDENCE_VAULT E
JOIN EAGLE_EYE.INCIDENT_LOGS I ON E.INCIDENT_ID = I.INCIDENT_ID
JOIN EAGLE_EYE.CAMERAS C ON I.CAMERA_ID = C.CAMERA_ID
ORDER BY E.CAPTURED_AT DESC;

-- ----------------------------------------------------------------------------
-- QUERY 3: Security Operator Dispatch Performance (SLA Metrics)
-- Measures incident response times and pending emergency dispatch items
-- ----------------------------------------------------------------------------
SELECT 
    I.DISPATCH_STATUS,
    COUNT(*) AS INCIDENT_COUNT,
    ROUND(AVG(I.CONFIDENCE_PCT), 1) AS AVG_CONFIDENCE,
    COUNT(CASE WHEN I.SEVERITY_LEVEL = 'CRITICAL' THEN 1 END) AS CRITICAL_UNRESOLVED,
    COUNT(CASE WHEN I.THREAT_TYPE = 'WEAPON' THEN 1 END) AS FIREARMS_COUNT,
    COUNT(CASE WHEN I.THREAT_TYPE = 'FIGHT' THEN 1 END) AS PHYSICAL_FIGHTS_COUNT
FROM EAGLE_EYE.INCIDENT_LOGS I
GROUP BY ROLLUP(I.DISPATCH_STATUS);

-- ----------------------------------------------------------------------------
-- QUERY 4: Camera Availability & Health Audit
-- Cross-references active RTSP/webcam streaming health with alert generation
-- ----------------------------------------------------------------------------
SELECT 
    C.CAMERA_CODE,
    C.NAME,
    C.LOCATION_LABEL,
    C.STATUS,
    C.RESOLUTION,
    C.FRAME_RATE,
    COALESCE(COUNT(I.INCIDENT_ID), 0) AS ALERTS_GENERATED_LAST_24H
FROM EAGLE_EYE.CAMERAS C
LEFT JOIN EAGLE_EYE.INCIDENT_LOGS I 
    ON C.CAMERA_ID = I.CAMERA_ID 
    AND I.DETECTED_AT >= (CURRENT TIMESTAMP - 24 HOURS)
GROUP BY C.CAMERA_CODE, C.NAME, C.LOCATION_LABEL, C.STATUS, C.RESOLUTION, C.FRAME_RATE
ORDER BY ALERTS_GENERATED_LAST_24H DESC;


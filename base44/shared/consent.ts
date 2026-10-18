// Shared helpers for the MediChain consent engine.
// Every function returns { success, message, data } and never throws.

export const RECORD_TYPES = ["Consultation", "Prescription", "Lab Report", "Vaccination", "Discharge Summary", "Diagnostic Report"];
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const CONSENT_STATUSES = ["Pending", "Approved", "Denied", "Revoked", "Expired"];
export const SCOPES = ["full", "emergency"];
export const DISCLAIMER = "AI-generated summary for decision support only. It does not diagnose or prescribe. Verify with clinical judgment.";

export function result(success, message, data = null) {
  return { success, message, data };
}

export function nowStr() {
  return new Date().toISOString();
}

export function normalizeAbhaId(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

export function isValidAbhaId(id) {
  return /^ABHA-\d{3,12}$/.test(String(id || ""));
}

export function splitList(text) {
  return String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000).toISOString();
}

export function secondsLeft(expiresAt) {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export async function logEvent(base44, abhaId, consentId, action, actor, details = "") {
  await base44.asServiceRole.entities.AuditLog.create({
    abha_id: abhaId,
    consent_id: consentId ? String(consentId) : "",
    action,
    actor,
    details: details || "",
    timestamp: nowStr(),
  });
}

// Marks approved consents whose time has passed as Expired, and logs EXPIRED once each.
export async function expireOldConsents(base44) {
  const now = nowStr();
  const page = await base44.asServiceRole.entities.Consent.filter(
    { status: "Approved", expires_at: { $lt: now } },
    { limit: 500, fields: ["id", "abha_id"] }
  );
  const stale = page.items || [];
  if (stale.length) {
    await base44.asServiceRole.entities.Consent.updateMany(
      { id: { $in: stale.map((c) => c.id) }, status: "Approved" },
      { $set: { status: "Expired", ended_at: now } }
    );
    for (const c of stale) {
      await logEvent(base44, c.abha_id, c.id, "EXPIRED", "system", "Consent expired automatically.");
    }
  }
  return stale.length;
}


export async function getConsentById(base44, consentId) {
  if (!consentId) return null;

  try {
    return await base44.asServiceRole.entities.Consent.get(String(consentId));
  } catch (error) {
    console.error("getConsentById failed:", error);
    return null;
  }
}


// THE KEY SECURITY RULE: the only way a doctor's view gets patient data.
// Re-checks consent validity on every call. Emergency scope returns only
// critical records and hides contact details.
export async function getAuthorizedData(base44, consentId) {
  await expireOldConsents(base44);
  const consent = await getConsentById(base44, consentId);
  if (!consent) return result(false, "Consent request not found.");
  if (consent.status === "Pending") return result(false, "Waiting for patient approval.");
  if (consent.status === "Denied") return result(false, "The patient denied this consent request.");
  if (consent.status === "Revoked") return result(false, "The patient revoked this consent.");
  if (consent.status === "Expired") return result(false, "This consent has expired.");
  const left = secondsLeft(consent.expires_at);
  if (consent.status !== "Approved" || left <= 0) return result(false, "This consent has expired.");

  const [patientPage, recordPage] = await Promise.all([
    base44.asServiceRole.entities.Patient.filter({ abha_id: consent.abha_id }, { limit: 1 }),
    base44.asServiceRole.entities.MedicalRecord.filter(
      { abha_id: consent.abha_id },
      { sort: "record_date", limit: 500 }
    ),
  ]);
  const patient = (patientPage.items || [])[0];
  if (!patient) return result(false, "Patient record not found.");

  const allRecords = recordPage.items || [];
  const scopedRecords = consent.scope === "emergency" ? allRecords.filter((r) => r.is_critical) : allRecords;
  const timeline = scopedRecords.map((r) => ({
    id: r.id,
    record_date: r.record_date,
    record_type: r.record_type,
    title: r.title,
    details: r.details || "",
    provider_name: r.provider_name || "",
    is_critical: Boolean(r.is_critical),
    is_abnormal: Boolean(r.is_abnormal),
  }));

  const patientData = {
    abha_id: patient.abha_id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender || "",
    blood_group: patient.blood_group,
    allergies: patient.allergies || "",
    chronic_conditions: patient.chronic_conditions || "",
    current_medicines: patient.current_medicines || "",
  };
  if (consent.scope !== "emergency") {
    patientData.emergency_contact_name = patient.emergency_contact_name || "";
    patientData.emergency_contact_phone = patient.emergency_contact_phone || "";
  }

  // Log DATA_ACCESSED once per consent.
  const auditPage = await base44.asServiceRole.entities.AuditLog.filter(
    { consent_id: String(consent.id), action: "DATA_ACCESSED" },
    { limit: 1, fields: ["id"] }
  );
  if (!(auditPage.items || []).length) {
    await logEvent(
      base44,
      consent.abha_id,
      consent.id,
      "DATA_ACCESSED",
      consent.doctor_name,
      `Doctor accessed records (${consent.scope} scope).`
    );
  }

  return result(true, "Access granted.", {
    patient: patientData,
    timeline,
    scope: consent.scope,
    expires_at: consent.expires_at,
    seconds_left: left,
    consent_id: consent.id,
    doctor_name: consent.doctor_name,
    purpose: consent.purpose,
  });
}
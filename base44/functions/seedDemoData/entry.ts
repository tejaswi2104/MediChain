import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result } from '../../shared/consent.ts';

// Synthetic demo patients and records (no real patient data).
const PATIENTS = [
  {
    abha_id: 'ABHA-123',
    name: 'Ananya Sharma',
    age: 54,
    gender: 'Female',
    blood_group: 'O+',
    emergency_contact_name: 'Rahul Sharma (Son)',
    emergency_contact_phone: '+91-90000-00001',
    allergies: 'Penicillin',
    chronic_conditions: 'Type 2 Diabetes',
    current_medicines: 'Metformin 500mg',
  },
  {
    abha_id: 'ABHA-456',
    name: 'Rohan Mehta',
    age: 32,
    gender: 'Male',
    blood_group: 'B+',
    emergency_contact_name: 'Priya Mehta (Wife)',
    emergency_contact_phone: '+91-90000-00002',
    allergies: 'None known',
    chronic_conditions: 'Mild asthma',
    current_medicines: 'Salbutamol inhaler as needed',
  },
];

const RECORDS = [
  { abha_id: 'ABHA-123', record_date: '2023-03-12', record_type: 'Vaccination', title: 'Influenza vaccine', details: '', provider_name: 'City Care Hospital', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-123', record_date: '2024-01-18', record_type: 'Consultation', title: 'Diabetes follow-up', details: 'HbA1c 7.8%', provider_name: 'City Care Hospital', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-123', record_date: '2024-06-02', record_type: 'Prescription', title: 'Metformin 500 mg twice daily', details: '', provider_name: 'HealthPlus Pharmacy', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-123', record_date: '2024-09-10', record_type: 'Consultation', title: 'Drug reaction: Penicillin allergy', details: 'Rash and hives after amoxicillin.', provider_name: 'City Care Hospital', is_critical: true, is_abnormal: false },
  { abha_id: 'ABHA-123', record_date: '2026-09-20', record_type: 'Lab Report', title: 'Kidney function test', details: 'Serum creatinine 1.9 mg/dL (HIGH), eGFR 38 (LOW), BUN 29 mg/dL (HIGH), fasting glucose 148 mg/dL (HIGH).', provider_name: 'Sunrise Diagnostics Lab', is_critical: true, is_abnormal: true },
  { abha_id: 'ABHA-123', record_date: '2026-10-05', record_type: 'Diagnostic Report', title: 'Abdominal ultrasound', details: 'No acute findings.', provider_name: 'Sunrise Diagnostics Lab', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-456', record_date: '2023-11-04', record_type: 'Vaccination', title: 'COVID-19 booster', details: '', provider_name: 'City Care Hospital', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-456', record_date: '2025-08-14', record_type: 'Consultation', title: 'Seasonal asthma review', details: '', provider_name: 'City Care Hospital', is_critical: true, is_abnormal: false },
  { abha_id: 'ABHA-456', record_date: '2026-08-22', record_type: 'Lab Report', title: 'Complete blood count', details: 'All values within normal range.', provider_name: 'Sunrise Diagnostics Lab', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-456', record_date: '2026-09-15', record_type: 'Prescription', title: 'Salbutamol inhaler refill', details: '', provider_name: 'HealthPlus Pharmacy', is_critical: false, is_abnormal: false },
  { abha_id: 'ABHA-456', record_date: '2026-10-01', record_type: 'Consultation', title: 'Persistent dry cough, 2 weeks', details: '', provider_name: 'City Care Hospital', is_critical: false, is_abnormal: false },
];

// Idempotent seed; with reset=true it wipes everything and re-seeds.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const reset = Boolean(body.reset);

    if (reset) {
      await base44.asServiceRole.entities.AuditLog.deleteMany({});
      await base44.asServiceRole.entities.MedicalRecord.deleteMany({});
      await base44.asServiceRole.entities.Consent.deleteMany({});
      await base44.asServiceRole.entities.Patient.deleteMany({});
    }

    const existing = await base44.asServiceRole.entities.Patient.filter(
      { abha_id: 'ABHA-123' },
      { limit: 1, fields: ['id'] }
    );
    if ((existing.items || []).length && !reset) {
      return Response.json(result(true, 'Demo data already present.'));
    }

    await base44.asServiceRole.entities.Patient.bulkCreate(PATIENTS);
    await base44.asServiceRole.entities.MedicalRecord.bulkCreate(RECORDS);
    return Response.json(
      result(true, reset ? 'Demo data reset.' : 'Demo data seeded.', { patients: PATIENTS.length, records: RECORDS.length })
    );
  } catch (error) {
    return Response.json(result(false, 'Could not set up the demo data. Please try again.'));
  }
}
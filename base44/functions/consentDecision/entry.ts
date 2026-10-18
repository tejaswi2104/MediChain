import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result, nowStr, addMinutes, logEvent, getConsentById } from '../../shared/consent.ts';

// Consent state machine: Pending -> Approved | Denied; Approved -> Revoked.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const consent = await getConsentById(base44, body.consent_id);
    if (!consent) return Response.json(result(false, 'Consent request not found.'));

    const now = nowStr();

    if (action === 'approve') {
      if (consent.status !== 'Pending') {
        return Response.json(result(false, `This request was already ${String(consent.status).toLowerCase()}.`));
      }
      let duration = parseInt(body.duration_minutes, 10);
      if (!Number.isFinite(duration)) duration = consent.duration_minutes || 1440;
      duration = Math.min(10080, Math.max(1, duration));
      const approvedBy = String(body.approved_by || 'patient');
      const expiresAt = addMinutes(new Date(), duration);
      await base44.asServiceRole.entities.Consent.update(consent.id, {
        status: 'Approved',
        approved_at: now,
        expires_at: expiresAt,
        approved_by: approvedBy,
        duration_minutes: duration,
      });
      await logEvent(
        base44,
        consent.abha_id,
        consent.id,
        'APPROVED',
        approvedBy,
        `Access approved for ${consent.doctor_name} (${consent.scope} scope, ${duration} min).`
      );
      return Response.json(result(true, 'Consent approved.', { status: 'Approved', expires_at: expiresAt, seconds_left: duration * 60 }));
    }

    if (action === 'deny') {
      if (consent.status !== 'Pending') {
        return Response.json(result(false, `This request was already ${String(consent.status).toLowerCase()}.`));
      }
      const actor = String(body.approved_by || 'patient');
      await base44.asServiceRole.entities.Consent.update(consent.id, {
        status: 'Denied',
        ended_at: now,
      });
      await logEvent(base44, consent.abha_id, consent.id, 'DENIED', actor, `Consent denied for ${consent.doctor_name}.`);
      return Response.json(result(true, 'Consent denied.', { status: 'Denied' }));
    }

    if (action === 'revoke') {
      if (consent.status !== 'Approved') {
        return Response.json(result(false, 'Only an approved consent can be revoked.'));
      }
      await base44.asServiceRole.entities.Consent.update(consent.id, {
        status: 'Revoked',
        ended_at: now,
      });
      await logEvent(base44, consent.abha_id, consent.id, 'REVOKED', 'patient', `Consent revoked; ${consent.doctor_name} no longer has access.`);
      return Response.json(result(true, 'Consent revoked. The doctor no longer has access.', { status: 'Revoked' }));
    }

    return Response.json(result(false, 'Unknown action.'));
  } catch (error) {
    return Response.json(result(false, 'Could not update the consent. Please try again.'));
  }
}
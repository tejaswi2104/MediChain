import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { result, getAuthorizedData } from '../../shared/consent.ts';

// The only endpoint the doctor's decision view uses to read patient data.
// It re-checks consent validity on every call.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const access = await getAuthorizedData(base44, body.consent_id);
    return Response.json(access);
  } catch (error) {
    return Response.json(result(false, 'Could not load the authorized records. Please try again.'));
  }
}
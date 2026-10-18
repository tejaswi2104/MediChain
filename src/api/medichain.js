import { base44 } from "@/api/base44Client";

async function invoke(name, payload) {
  const res = await base44.functions.invoke(name, payload || {});
  return res.data;
}

export const createConsentRequest = (p) => invoke("createConsentRequest", p);
export const consentDecision = (p) => invoke("consentDecision", p);
export const getConsentStatus = (p) => invoke("getConsentStatus", p);
export const getAuthorizedTimeline = (p) => invoke("getAuthorizedTimeline", p);
export const generateAiSummary = (p) => invoke("generateAiSummary", p);
export const getConsentOverview = (p) => invoke("getConsentOverview", p);
export const seedDemoData = (p) => invoke("seedDemoData", p);
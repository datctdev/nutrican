import { APIRequestContext, expect } from '@playwright/test';
import { API_BASE, localDateOffsetIso, customerRequest, ptRequest } from './api';

export function mondayOfWeek(offsetWeeks = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetWeeks * 7);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function searchFoodId(request: APIRequestContext, token: string, q = 'cơm'): Promise<string> {
  const res = await request.get(`${API_BASE}/foods/search`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { q, size: 5 },
  });
  expect(res.ok(), `food search ${res.status()}`).toBeTruthy();
  const json = await res.json();
  const items = json.data?.content || json.data || [];
  const first = Array.isArray(items) ? items[0] : null;
  expect(first?.id, 'need at least one food').toBeTruthy();
  return first.id as string;
}

export async function createSelfPlanItem(
  request: APIRequestContext,
  token: string,
  opts: { mealType: string; foodItemId: string; quantityG?: number; planDate?: string },
) {
  return request.post(`${API_BASE}/diet/self-plan`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      mealType: opts.mealType,
      foodItemId: opts.foodItemId,
      quantityG: opts.quantityG ?? 150,
      planDate: opts.planDate ?? localDateOffsetIso(0),
    },
  });
}

/** Ensure PT has published plan covering today (and optionally tomorrow). */
export async function ensurePublishedPlanForCustomer(
  request: APIRequestContext,
  clientId: string,
  planDateIso: string,
) {
  const ptToken = await ptRequest(request);
  const weekStart = mondayOfWeek(0);
  // If current week doesn't cover planDate, use next week
  const planDate = new Date(planDateIso + 'T12:00:00');
  const ws = new Date(weekStart + 'T12:00:00');
  const we = new Date(ws);
  we.setDate(we.getDate() + 6);
  let useWeek = weekStart;
  if (planDate < ws || planDate > we) {
    useWeek = mondayOfWeek(1);
  }

  const createRes = await request.post(`${API_BASE}/workspace/meal-plans`, {
    headers: { Authorization: `Bearer ${ptToken}` },
    data: {
      clientId,
      weekStart: useWeek,
      items: [
        {
          planDate: planDateIso,
          mealType: 'BREAKFAST',
          freeText: 'PT Com ga',
          portionGrams: 200,
        },
        {
          planDate: planDateIso,
          mealType: 'LUNCH',
          freeText: 'PT Pho bo',
          portionGrams: 350,
        },
      ],
    },
  });
  const extractPlanId = (body: { data?: { id?: string; plan?: { id?: string } } }) =>
    body.data?.plan?.id || body.data?.id;

  if (!createRes.ok()) {
    // maybe already exists — try update path or get existing
    const existing = await request.get(`${API_BASE}/workspace/meal-plans/${clientId}`, {
      headers: { Authorization: `Bearer ${ptToken}` },
      params: { weekStart: useWeek },
    });
    if (existing.ok()) {
      const body = await existing.json();
      const planId = extractPlanId(body);
      if (planId) {
        const pubExisting = await request.post(`${API_BASE}/workspace/meal-plans/${planId}/publish`, {
          headers: { Authorization: `Bearer ${ptToken}` },
        });
        expect(pubExisting.ok(), `publish existing ${pubExisting.status()}`).toBeTruthy();
        return planId as string;
      }
    }
    // upsert via PUT if create conflicted
    const updateRes = await request.put(`${API_BASE}/workspace/meal-plans/${clientId}`, {
      headers: { Authorization: `Bearer ${ptToken}` },
      data: {
        clientId,
        weekStart: useWeek,
        items: [
          {
            planDate: planDateIso,
            mealType: 'BREAKFAST',
            freeText: 'PT Com ga',
            portionGrams: 200,
          },
          {
            planDate: planDateIso,
            mealType: 'LUNCH',
            freeText: 'PT Pho bo',
            portionGrams: 350,
          },
        ],
      },
    });
    if (updateRes.ok()) {
      const updated = await updateRes.json();
      const planId = extractPlanId(updated);
      expect(planId, 'update meal plan id').toBeTruthy();
      const pubUpd = await request.post(`${API_BASE}/workspace/meal-plans/${planId}/publish`, {
        headers: { Authorization: `Bearer ${ptToken}` },
      });
      expect(pubUpd.ok(), `publish updated ${pubUpd.status()}`).toBeTruthy();
      return planId as string;
    }
  }
  expect(createRes.ok(), `create meal plan ${createRes.status()} ${await createRes.text()}`).toBeTruthy();
  const created = await createRes.json();
  const planId = extractPlanId(created);
  expect(planId, `create response plan id: ${JSON.stringify(created)}`).toBeTruthy();
  const pub = await request.post(`${API_BASE}/workspace/meal-plans/${planId}/publish`, {
    headers: { Authorization: `Bearer ${ptToken}` },
  });
  expect(pub.ok(), `publish ${pub.status()} ${await pub.text()}`).toBeTruthy();
  return planId as string;
}

export async function customerUserId(request: APIRequestContext): Promise<string> {
  const token = await customerRequest(request);
  const res = await request.get(`${API_BASE}/profile/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `profile/me ${res.status()}`).toBeTruthy();
  const json = await res.json();
  return String(json.data?.id);
}

export async function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export { customerRequest, ptRequest, API_BASE, localDateOffsetIso };

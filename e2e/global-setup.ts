import { request } from '@playwright/test';
import { waitForBackend } from './fixtures/api';

export default async function globalSetup() {
  const ctx = await request.newContext();
  try {
    await waitForBackend(ctx);
  } finally {
    await ctx.dispose();
  }
}

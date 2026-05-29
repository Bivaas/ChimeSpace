import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

/**
 * GET /api/cron/redis-keepalive
 *
 * Pings Upstash Redis weekly to keep the database active.
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
 * when CRON_SECRET is set as a Vercel env variable.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_REDIS', message: 'Redis not configured' } },
      { status: 503 }
    );
  }

  try {
    const ts = Date.now().toString();
    await redis.set('chimespace:keepalive', ts, { ex: 60 * 60 * 24 * 14 }); // 14d TTL
    const read = await redis.get<string>('chimespace:keepalive');
    return NextResponse.json({
      success: true,
      data: { pingedAt: ts, readBack: read },
    });
  } catch (err) {
    console.error('Redis keep-alive error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'REDIS_ERROR', message: 'Ping failed' } },
      { status: 500 }
    );
  }
}
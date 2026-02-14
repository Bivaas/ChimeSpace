import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  signJWT,
  setSessionCookie,
  setCsrfCookie,
  generateCsrfToken,
} from '@/lib/auth';
import User from '@/models/User';
import PendingInvite from '@/models/PendingInvite';
import WorkspaceMember from '@/models/WorkspaceMember';
import type { GoogleUserInfo } from '@/types';

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth 2.0 authorization code callback from Google.
 * Exchanges the code for tokens, upserts the user, resolves
 * pending invites, mints a JWT session, and redirects to /dashboard.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');

    /* ── Guard: OAuth errors ─────────────────────────────── */
    if (oauthError) {
      return NextResponse.redirect(`${appUrl}/?error=oauth_denied`);
    }
    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/?error=invalid_request`);
    }

    /* ── Guard: State parameter (CSRF) ───────────────────── */
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${appUrl}/?error=invalid_state`);
    }

    /* ── Exchange code for tokens ────────────────────────── */
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/?error=token_exchange_failed`);
    }

    const { access_token } = await tokenRes.json();
    if (!access_token) {
      return NextResponse.redirect(`${appUrl}/?error=no_access_token`);
    }

    /* ── Fetch Google profile ────────────────────────────── */
    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!profileRes.ok) {
      return NextResponse.redirect(`${appUrl}/?error=userinfo_failed`);
    }

    const googleUser: GoogleUserInfo = await profileRes.json();
    if (!googleUser.email || !googleUser.id) {
      return NextResponse.redirect(`${appUrl}/?error=incomplete_profile`);
    }

    /* ── Upsert user ─────────────────────────────────────── */
    await connectDB();

    let user = await User.findOne({ googleId: googleUser.id });

    if (!user) {
      user = await User.create({
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.id,
        name: googleUser.name || 'User',
        avatar: googleUser.picture || '',
      });

      // Process any pending invites for this email
      await processPendingInvites(
        user._id.toString(),
        googleUser.email.toLowerCase()
      );
    } else {
      // Refresh profile fields
      user.name = googleUser.name || user.name;
      user.avatar = googleUser.picture || user.avatar;
      await user.save();
    }

    /* ── Mint session ────────────────────────────────────── */
    const jwt = await signJWT({
      userId: user._id.toString(),
      email: user.email,
    });

    const response = NextResponse.redirect(`${appUrl}/dashboard`);
    setSessionCookie(response, jwt);
    setCsrfCookie(response, generateCsrfToken());

    // Clean up OAuth state cookie
    response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${appUrl}/?error=server_error`);
  }
}

/* ── Helper: resolve pending invites ──────────────────────── */

async function processPendingInvites(
  userId: string,
  email: string
): Promise<void> {
  const invites = await PendingInvite.find({ email }).lean();

  for (const invite of invites) {
    try {
      const exists = await WorkspaceMember.findOne({
        workspaceId: invite.workspaceId,
        userId,
      });
      if (!exists) {
        await WorkspaceMember.create({
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        });
      }
    } catch (err) {
      console.error(
        `Failed to process invite for workspace ${invite.workspaceId}:`,
        err
      );
    }
  }

  await PendingInvite.deleteMany({ email });
}

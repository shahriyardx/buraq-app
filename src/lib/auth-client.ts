"use client";

import { createAuthClient } from "better-auth/react";

// No baseURL: in the browser better-auth uses window.location.origin, so the
// same image works on any domain without a build-time URL.
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;

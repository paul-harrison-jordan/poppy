import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";
import { Session, Account } from "next-auth";
import { getServerSession } from "next-auth";

/* -------- extend the built-in types -------- */
declare module "next-auth" {
  interface Session {
    /** Gmail / Drive access token we copy from the JWT */
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Copied from OAuth account once after sign-in */
    accessToken?: string;
  }
}

/* -------- auth config -------- */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile " +
            "https://www.googleapis.com/auth/drive " +
            "https://www.googleapis.com/auth/documents",
        },
      },
    }),
  ],
  pages: { signIn: "/auth/signin" },

  callbacks: {
    async jwt({
      token,
      account,
    }: {
      token: JWT;
      account?: Account | null;
    }): Promise<JWT> {
      if (account) token.accessToken = account.access_token;
      return token;
    },

    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};
 
export async function getAuthServerSession() {
  return await getServerSession(authOptions);
} 
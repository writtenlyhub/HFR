import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "Admin Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(String(credentials.password), user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role || Role.CUSTOMER;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.role = (token.role as Role) || Role.CUSTOMER;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

/**
 * Validates whether the incoming request is authenticated as an administrator.
 * Returns { authorized: true, user } or { authorized: false, status: 401 | 403, error: string }.
 */
export async function requireAdminSession() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return {
        authorized: false,
        status: 401 as const,
        error: "Unauthorized: Administrator sign-in required",
      };
    }

    if (session.user.role !== Role.ADMIN) {
      return {
        authorized: false,
        status: 403 as const,
        error: "Forbidden: Administrator role required",
      };
    }

    return {
      authorized: true,
      user: session.user,
    };
  } catch {
    // When session cannot be resolved or request context is missing, deny access
    return {
      authorized: false,
      status: 401 as const,
      error: "Unauthorized: Administrator sign-in required",
    };
  }
}

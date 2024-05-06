import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "../../../../../prisma/prisma";
import bcryptjs from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";
import NextAuth from "next-auth/next";

const nextAuthOption: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: {
          label: "email",
        },
        password: {
          label: "password",
        },
      },
      async authorize(credential) {
        if (!credential?.email || !credential.password) {
          return null;
        }
        const user = await prisma.user.findFirst({
          where: {
            email: credential.email!,
          },
        });
        if (!user) {
          return null;
        }
        const password = await bcryptjs.compare(
          credential.password,
          user?.password!
        );
        if (!password) {
          return null;
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ user, token }) {
      if (user) {
        return {
          ...token,
          id: user.id,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
        },
      };
    },
    async signIn({ account, user }) {
      const userCheck = await prisma.user.findFirst({
        where: {
          username: user.name as string,
        },
      });
      if (!userCheck) {
        const users = await prisma.user.create({
          data: {
            username: user.name!,
            email: user.email as string,
            access_token: account?.access_token,
            token_id: account?.id_token,
          },
          //jhghg
        });
        try {
          if (users) {
            return true;
          }
        } catch (error) {
          return false;
        }
      }
      return true;
    },
  },
};

const auth = NextAuth(nextAuthOption);
export { auth as GET, auth as POST };

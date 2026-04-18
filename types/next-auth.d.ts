import { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import type { Role } from "@/lib/permissions";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: Role;
            username?: string;
            birthDate?: string;
            hasCompletedProfile?: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: Role;
        username?: string;
        birthDate?: string;
        hasCompletedProfile?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id?: string;
        role?: Role;
        username?: string;
        birthDate?: string;
        hasCompletedProfile?: boolean;
    }
}

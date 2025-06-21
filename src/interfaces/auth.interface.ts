import { Building, User, Plan, PlanType } from '@prisma/client';

export interface AuthResponse {
  access_token: string;
  user: (User & {
    buildings: {
      building: Building & {
        plan: Plan | null;
      };
    }[];
  }) | null;
  building: (Building & {
    plan: Plan | null;
  }) | null;
  trialEndsAt: Date | null;
  requiresVerification?: boolean;
}

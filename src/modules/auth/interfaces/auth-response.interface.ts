import { UserWithBuildingRelations } from '../../users/types/user.types';

export interface AuthResponse {
  access_token: string;
  user: UserWithBuildingRelations | null;
  building: any | null; // TODO: Add proper building type
  trialEndsAt: Date | null;
  requiresVerification: boolean;
}

export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  ownedBuildings: Array<{
    unitNumber: string;
    isVerified: boolean;
  }>;
}

export interface PendingInvitation {
  id: string;
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  unitNumber: string;
  expiresAt: string;
}

export interface InvitationResult {
  id: string;
  token: string;
  verifyCode: string;
  expiresAt: Date;
  message: string;
}

export interface VerificationResult {
  firstName: string;
  lastName: string;
  whatsappNumber: string;
  unitNumber: string;
  isValid: boolean;
}

export interface RegistrationResult {
  id: string;
  email: string;
  whatsappNumber: string;
  isProfileComplete: boolean;
}

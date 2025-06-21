export type AuthMethodType = 'EMAIL' | 'WHATSAPP';

export interface AuthCredentials {
    identifier: string;
    identifierType: AuthMethodType;
    password?: string;
    verificationCode?: string;
}

export interface AuthResponse {
    requiresVerification: boolean;
    verificationSent?: boolean;
    token?: string;
    user?: any; // TODO: Definir UserDTO
}

export interface VerificationRequest {
    identifier: string;
    identifierType: AuthMethodType;
    verificationCode?: string;
    password?: string;
}

export interface AuthConfig {
    method: AuthMethodType;
    requiresVerification: boolean;
    passwordRequired: boolean;
    codeRequired: boolean;
}

// Configuración por método de autenticación
export const AUTH_METHOD_CONFIG: Record<AuthMethodType, AuthConfig> = {
    EMAIL: {
        method: 'EMAIL',
        requiresVerification: false, // Por ahora, luego podemos activar verificación por email
        passwordRequired: true,
        codeRequired: false
    },
    WHATSAPP: {
        method: 'WHATSAPP',
        requiresVerification: true,
        passwordRequired: false,
        codeRequired: true
    }
};

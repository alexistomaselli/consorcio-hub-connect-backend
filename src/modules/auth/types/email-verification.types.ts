import { EmailVerification } from '@prisma/client';

export type EmailVerificationWithTempData = Omit<EmailVerification, 'tempData'> & {
  tempData: {
    firstName: string;
    lastName: string;
    building: {
      id: string;
      name: string;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
};

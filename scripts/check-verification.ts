import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVerification() {
  try {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: 'juanvelasco9888@gmail.com'
      }
    });
    
    console.log('Verification details:', verification);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVerification();

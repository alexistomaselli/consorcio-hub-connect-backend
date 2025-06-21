import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updatePassword() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const updatedUser = await prisma.user.update({
      where: {
        email: 'sebastianvettel01@gmail.com',
      },
      data: {
        password: hashedPassword,
      },
    });
    console.log('Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword().catch(console.error);

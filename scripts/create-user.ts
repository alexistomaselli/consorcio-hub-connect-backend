import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await prisma.user.create({
      data: {
        id: 'sebastianvettel01',
        email: 'sebastianvettel01@gmail.com',
        password: hashedPassword,
        firstName: 'Sebastian',
        lastName: 'Vettel',
        role: 'BUILDING_ADMIN',
        updatedAt: new Date(),

      },
    });
    console.log('User created successfully:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();

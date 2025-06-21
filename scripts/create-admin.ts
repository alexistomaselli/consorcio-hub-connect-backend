import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
      data: {
        id: 'sebastianvettel01',
        email: 'sebastianvettel01@gmail.com',
        password: hashedPassword,
        firstName: 'Sebastian',
        lastName: 'Vettel',
        role: UserRole.BUILDING_ADMIN,
        updatedAt: new Date(),
      },
    });
    console.log('Admin user created successfully:', user);
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required, all authorized
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false; // No user, not authorized
    }

    // Check if the user's role is included in the required roles
    return requiredRoles.includes(user.role);
  }
}

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core/services/reflector.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Request } from 'express';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (context.getType() !== 'http') {
      throw new Error('RolesGuard can only be used in HTTP context');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { isVerified: boolean; role: string } | undefined;
    if (!user) {
      return false;
    }

    if (!user.isVerified) {
      return false;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userRole = user?.role;

    return requiredRoles.some((role) => role === userRole);
  }
}

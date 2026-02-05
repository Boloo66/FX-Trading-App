import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { isVerified: boolean } | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('User is not verified to access this resource');
    }

    if (user && user.isVerified) {
      return true;
    }

    return false;
  }
}

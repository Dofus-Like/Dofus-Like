import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

const DEV_USER = {
  id: 'dev-player-id',
  username: 'DevPlayer',
  email: 'dev@test.com',
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (process.env.NODE_ENV !== 'production' && process.env.SKIP_AUTH === 'true') {
      const request = context.switchToHttp().getRequest();
      request.user = DEV_USER;
      return true;
    }
    return super.canActivate(context);
  }
}

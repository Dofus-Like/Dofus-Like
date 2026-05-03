import { Body, Controller, Param, Post, Request, Sse, UseGuards } from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { HUB_GLOBAL_CHANNEL } from '@game/shared-types';
import { Observable } from 'rxjs';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SseTicketResource } from '../shared/security/sse-ticket.decorator';
import { SseTicketGuard } from '../shared/security/sse-ticket.guard';
import { SseTicketService } from '../shared/security/sse-ticket.service';
import { SseService } from '../shared/sse/sse.service';

import { HubChatDto } from './dto/hub-chat.dto';
import { HubMoveDto } from './dto/hub-move.dto';
import { HubService } from './hub.service';

const HUB_RESOURCE_ID = 'global';

interface AuthedRequest {
  user: { id: string; username: string };
}

@Controller('hub')
export class HubController {
  constructor(
    private readonly hub: HubService,
    private readonly sse: SseService,
    private readonly sseTickets: SseTicketService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post('join')
  join(@Request() req: AuthedRequest) {
    return this.hub.join(req.user.id, req.user.username);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Post('heartbeat')
  async heartbeat(@Request() req: AuthedRequest) {
    await this.hub.heartbeat(req.user.id);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 600, ttl: seconds(60) } })
  @Post('move')
  async move(@Body() body: HubMoveDto, @Request() req: AuthedRequest) {
    await this.hub.moveTo(req.user.id, body.position, body.target);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: seconds(60) } })
  @Post('chat')
  chat(@Body() body: HubChatDto, @Request() req: AuthedRequest) {
    return this.hub.sendChat(req.user.id, req.user.username, body.text.trim());
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: seconds(60) } })
  @Post('leave')
  async leave(@Request() req: AuthedRequest) {
    await this.hub.leave(req.user.id);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('stream-ticket')
  issueStreamTicket(@Request() req: AuthedRequest) {
    return this.sseTickets.issueTicket({
      userId: req.user.id,
      resourceType: 'hub',
      resourceId: HUB_RESOURCE_ID,
    });
  }

  @UseGuards(SseTicketGuard)
  @Sse('events/:id')
  @SseTicketResource('hub')
  events(@Param('id') _id: string): Observable<unknown> {
    return this.sse.getStream(HUB_GLOBAL_CHANNEL);
  }
}

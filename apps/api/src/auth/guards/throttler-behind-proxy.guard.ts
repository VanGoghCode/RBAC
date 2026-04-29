import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected override async getTracker(req: ThrottlerRequest): Promise<string> {
    const httpReq = req as unknown as import('express').Request;
    return httpReq.ips?.[0] ?? httpReq.ip ?? 'unknown';
  }
}

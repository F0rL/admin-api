import { FastifyReply, FastifyRequest } from 'fastify';
import { fail } from '../lib/response.js';

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.status(401).send(fail('UNAUTHORIZED', 'Authentication required'));
  }
}

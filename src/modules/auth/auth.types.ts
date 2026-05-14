declare module '@fastify/session' {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

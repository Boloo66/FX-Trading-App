export interface JwtPayload {
  sub: string;
  email: string;
  isVerified: boolean;
  role: string;
  iat?: number;
  exp?: number;
  jid?: string;
}

export class EmailEventPayload {
  constructor(
    public readonly email: string,
    public readonly subject: string,
  ) {}
}

export const EMAIL_VERIFIED_EVENT = 'email.verified.send';

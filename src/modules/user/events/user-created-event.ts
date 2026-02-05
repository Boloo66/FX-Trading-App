export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly otp: string,
  ) {}
}

export const USER_CREATED_EVENT = 'user.created';

import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/entities/user.entity';
import { Otp } from './entities/otp.entity';
import { UserService } from '../user/user.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { WalletService } from '../wallet/wallet.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { USER_CREATED_EVENT, UserCreatedEvent } from '../user/events/user-created-event';
import { EMAIL_VERIFIED_EVENT, EmailEventPayload } from '../user/events/email-verified.event';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private jwtService: JwtService,
    private userService: UserService,
    private walletService: WalletService,
    private emitter: EventEmitter2,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password } = registerDto;

    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    await this.walletService.initializeWallet(user.id);

    await this.generateAndSendOtp(user);

    this.logger.log(`User registered: ${email}`);

    return {
      message: 'Registration successful. Please check your email for the verification code.',
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ accessToken: string }> {
    const { email, code } = verifyOtpDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid email or OTP');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = await this.otpRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    otp.isUsed = true;
    await this.otpRepository.save(otp);

    user.isVerified = true;
    await this.userRepository.save(user);

    this.emitter.emit(
      EMAIL_VERIFIED_EVENT,
      new EmailEventPayload(user.email, 'Welcome to FX Trading App! Your email has been verified.'),
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.generateAndSendOtp(user);

    return { message: 'OTP sent successfully' };
  }

  private async generateAndSendOtp(user: User): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const otp = this.otpRepository.create({
      code,
      userId: user.id,
      expiresAt,
      channel: 'email_verification',
    });

    await this.otpRepository.save(otp);

    this.emitter.emit(
      USER_CREATED_EVENT,
      new UserCreatedEvent(user.id, user.email, user.email, code),
    );
  }
}

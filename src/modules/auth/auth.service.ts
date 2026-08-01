import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';
import { EmailService } from '../../common/email/email.service.js';
import { AUTH_CONSTANTS } from '../../common/constants/auth.constants.js';
import { AUTH_MESSAGES } from '../../common/constants/messages.constants.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ==================== REGISTER ====================

  async register(registerDto: RegisterDto) {
    const { userName, email, password, ...rest } = registerDto;

    // Kiểm tra userName đã tồn tại chưa
    const existingUserName = await this.usersRepository.findOne({
      where: { userName },
    });
    if (existingUserName) {
      throw new ConflictException(AUTH_MESSAGES.USERNAME_EXISTS);
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException(AUTH_MESSAGES.EMAIL_EXISTS);
    }

    // Hash password
    const salt = await bcrypt.genSalt(AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Sinh OTP
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MS);

    // Tạo user
    const user = this.usersRepository.create({
      userName,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
      isActive: false,
      ...rest,
    });

    await this.usersRepository.save(user);

    // Gửi OTP qua email
    await this.emailService.sendOtpEmail(email, otp, user.fullName);

    this.logger.log(`User registered: ${email}`);

    return {
      message: AUTH_MESSAGES.REGISTER_SUCCESS,
      email: user.email,
    };
  }

  // ==================== VERIFY OTP ====================

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        otp: true,
        otpExpiry: true,
        isActive: true,
        fullName: true,
        userName: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.EMAIL_NOT_FOUND);
    }

    if (user.isActive) {
      throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ACTIVE);
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_MISSING);
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
    }

    if (user.otp !== otp) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_INCORRECT);
    }

    // Kích hoạt tài khoản và xóa OTP
    await this.usersRepository.update(user.id, {
      isActive: true,
      otp: undefined,
      otpExpiry: undefined,
    });

    this.logger.log(`User verified: ${email}`);

    return {
      message: AUTH_MESSAGES.VERIFY_SUCCESS,
    };
  }

  // ==================== RESEND OTP ====================

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.EMAIL_NOT_FOUND);
    }

    if (user.isActive) {
      throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_ACTIVE);
    }

    // Sinh OTP mới
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MS);

    await this.usersRepository.update(user.id, { otp, otpExpiry });

    // Gửi lại email
    await this.emailService.sendOtpEmail(email, otp, user.fullName);

    this.logger.log(`OTP resent to: ${email}`);

    return {
      message: AUTH_MESSAGES.RESEND_OTP_SUCCESS,
    };
  }

  // ==================== LOGIN ====================

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Tìm user (bao gồm password vì select: false)
    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        userName: true,
        fullName: true,
        email: true,
        phone: true,
        password: true,
        isActive: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    // Kiểm tra tài khoản đã kích hoạt chưa
    if (!user.isActive) {
      throw new UnauthorizedException(AUTH_MESSAGES.ACCOUNT_INACTIVE);
    }

    // Tạo tokens
    const tokens = await this.generateTokens(user);

    // Lưu hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    await this.usersRepository.update(user.id, { hashedRefreshToken });

    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = user;

    this.logger.log(`User logged in: ${email}`);

    return {
      message: AUTH_MESSAGES.LOGIN_SUCCESS,
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ==================== REFRESH TOKEN ====================

  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Tìm user với hashed refresh token
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          hashedRefreshToken: true,
          isActive: true,
        },
      });

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
      }

      // So sánh refresh token
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException(AUTH_MESSAGES.INVALID_REFRESH_TOKEN);
      }

      // Tạo tokens mới
      const tokens = await this.generateTokens(user);

      // Cập nhật hashed refresh token
      const newHashedRefreshToken = await bcrypt.hash(tokens.refreshToken, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
      await this.usersRepository.update(user.id, {
        hashedRefreshToken: newHashedRefreshToken,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.REFRESH_EXPIRED);
    }
  }

  // ==================== LOGOUT ====================

  async logout(userId: string) {
    await this.usersRepository.update(userId, {
      hashedRefreshToken: undefined,
    });

    return {
      message: AUTH_MESSAGES.LOGOUT_SUCCESS,
    };
  }

  // ==================== FORGOT PASSWORD ====================

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.EMAIL_NOT_FOUND_FORGOT);
    }

    if (!user.isActive) {
      throw new BadRequestException(AUTH_MESSAGES.ACCOUNT_INACTIVE_FORGOT);
    }

    // Sinh OTP
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MS);

    await this.usersRepository.update(user.id, { otp, otpExpiry });

    // Gửi email
    await this.emailService.sendOtpEmail(email, otp, user.fullName);

    this.logger.log(`Forgot password OTP sent to: ${email}`);

    return {
      message: AUTH_MESSAGES.FORGOT_PASSWORD_SUCCESS,
    };
  }

  // ==================== RESET PASSWORD ====================

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.usersRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        otp: true,
        otpExpiry: true,
      },
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.EMAIL_NOT_FOUND);
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException(AUTH_MESSAGES.NO_RESET_REQUEST);
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_EXPIRED);
    }

    if (user.otp !== otp) {
      throw new BadRequestException(AUTH_MESSAGES.OTP_INCORRECT);
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu và xóa OTP
    await this.usersRepository.update(user.id, {
      password: hashedPassword,
      otp: undefined,
      otpExpiry: undefined,
    });

    this.logger.log(`Password reset for: ${email}`);

    return {
      message: AUTH_MESSAGES.RESET_SUCCESS,
    };
  }

  // ==================== GET PROFILE ====================

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  // ==================== PRIVATE METHODS ====================

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async generateTokens(user: Pick<User, 'id' | 'email' | 'role'>) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessExpiration = this.configService.get<string>('JWT_EXPIRATION', '24h');
    const refreshExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessExpiration as any,
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: refreshExpiration as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}

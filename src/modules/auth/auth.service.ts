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
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

    // Kiểm tra email đã tồn tại chưa
    const existingEmail = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Sinh OTP
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 60 * 1000); // 1 phút

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
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhận mã OTP.',
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
      throw new NotFoundException('Email không tồn tại');
    }

    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException('Không có mã OTP. Vui lòng yêu cầu gửi lại.');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // Kích hoạt tài khoản và xóa OTP
    await this.usersRepository.update(user.id, {
      isActive: true,
      otp: undefined,
      otpExpiry: undefined,
    });

    this.logger.log(`User verified: ${email}`);

    return {
      message: 'Xác thực OTP thành công. Tài khoản đã được kích hoạt.',
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
      throw new NotFoundException('Email không tồn tại');
    }

    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }

    // Sinh OTP mới
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 60 * 1000); // 1 phút

    await this.usersRepository.update(user.id, { otp, otpExpiry });

    // Gửi lại email
    await this.emailService.sendOtpEmail(email, otp, user.fullName);

    this.logger.log(`OTP resent to: ${email}`);

    return {
      message: 'Mã OTP mới đã được gửi đến email của bạn.',
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
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra tài khoản đã kích hoạt chưa
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP.',
      );
    }

    // Tạo tokens
    const tokens = await this.generateTokens(user);

    // Lưu hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersRepository.update(user.id, { hashedRefreshToken });

    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = user;

    this.logger.log(`User logged in: ${email}`);

    return {
      message: 'Đăng nhập thành công',
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
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      // So sánh refresh token
      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.hashedRefreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      // Tạo tokens mới
      const tokens = await this.generateTokens(user);

      // Cập nhật hashed refresh token
      const newHashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
      await this.usersRepository.update(user.id, {
        hashedRefreshToken: newHashedRefreshToken,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  // ==================== LOGOUT ====================

  async logout(userId: string) {
    await this.usersRepository.update(userId, {
      hashedRefreshToken: undefined,
    });

    return {
      message: 'Đăng xuất thành công',
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
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    if (!user.isActive) {
      throw new BadRequestException(
        'Tài khoản chưa được kích hoạt. Vui lòng xác thực OTP trước.',
      );
    }

    // Sinh OTP
    const otp = this.generateOtp();
    const otpExpiry = new Date(Date.now() + 60 * 1000); // 1 phút

    await this.usersRepository.update(user.id, { otp, otpExpiry });

    // Gửi email
    await this.emailService.sendOtpEmail(email, otp, user.fullName);

    this.logger.log(`Forgot password OTP sent to: ${email}`);

    return {
      message: 'Mã OTP đã được gửi đến email của bạn.',
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
      throw new NotFoundException('Email không tồn tại');
    }

    if (!user.otp || !user.otpExpiry) {
      throw new BadRequestException(
        'Không có yêu cầu đặt lại mật khẩu. Vui lòng yêu cầu lại.',
      );
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu lại.');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Mã OTP không chính xác');
    }

    // Hash mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu và xóa OTP
    await this.usersRepository.update(user.id, {
      password: hashedPassword,
      otp: undefined,
      otpExpiry: undefined,
    });

    this.logger.log(`Password reset for: ${email}`);

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
    };
  }

  // ==================== GET PROFILE ====================

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
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

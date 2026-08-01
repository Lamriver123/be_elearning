import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../../common/types/request.types.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản', description: 'Tạo tài khoản mới. OTP sẽ được gửi qua email để xác thực.' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, OTP đã gửi qua email' })
  @ApiResponse({ status: 409, description: 'Tên đăng nhập hoặc email đã tồn tại' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // POST /auth/verify-otp
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực OTP', description: 'Nhập mã OTP được gửi qua email để kích hoạt tài khoản. OTP hết hạn sau 1 phút.' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công, tài khoản đã kích hoạt' })
  @ApiResponse({ status: 400, description: 'OTP không chính xác hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Email không tồn tại' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  // POST /auth/resend-otp
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lại OTP', description: 'Gửi lại mã OTP mới qua email (dành cho tài khoản chưa kích hoạt).' })
  @ApiResponse({ status: 200, description: 'OTP mới đã gửi qua email' })
  @ApiResponse({ status: 400, description: 'Tài khoản đã được kích hoạt' })
  @ApiResponse({ status: 404, description: 'Email không tồn tại' })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  // POST /auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập', description: 'Đăng nhập bằng email và mật khẩu. Trả về access token (24h) và refresh token (7 ngày).' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về JWT tokens' })
  @ApiResponse({ status: 401, description: 'Email/mật khẩu không chính xác hoặc tài khoản chưa kích hoạt' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // POST /auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới token', description: 'Sử dụng refresh token để lấy access token mới. Refresh token cũ sẽ bị thay thế.' })
  @ApiResponse({ status: 200, description: 'Trả về access token và refresh token mới' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  // POST /auth/logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đăng xuất', description: 'Xóa refresh token khỏi hệ thống. Yêu cầu JWT access token.' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token hết hạn' })
  async logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.user.id);
  }

  // POST /auth/forgot-password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quên mật khẩu', description: 'Gửi mã OTP qua email để đặt lại mật khẩu. OTP hết hạn sau 1 phút.' })
  @ApiResponse({ status: 200, description: 'OTP đã gửi qua email' })
  @ApiResponse({ status: 404, description: 'Email không tồn tại' })
  @ApiResponse({ status: 400, description: 'Tài khoản chưa kích hoạt' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  // POST /auth/reset-password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu', description: 'Nhập OTP và mật khẩu mới để đặt lại mật khẩu.' })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'OTP không chính xác hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Email không tồn tại' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // GET /auth/profile (Protected)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Xem thông tin cá nhân', description: 'Lấy thông tin user đang đăng nhập. Yêu cầu JWT access token.' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin user' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token hết hạn' })
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.id);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { AUTH_CONSTANTS } from '../../common/constants/auth.constants.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    await this.usersRepository.update(userId, updateProfileDto);

    return this.getProfile(userId);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    const salt = await bcrypt.genSalt(AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, salt);

    await this.usersRepository.update(userId, { password: hashedPassword });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh');
    }

    const uploadResult = await this.cloudinaryService.uploadImage(file);
    const avatarUrl = uploadResult.secure_url;

    await this.usersRepository.update(userId, { avatar: avatarUrl });

    return { avatar: avatarUrl, message: 'Cập nhật ảnh đại diện thành công' };
  }
}

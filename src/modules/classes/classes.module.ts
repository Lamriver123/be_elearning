import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesService } from './classes.service.js';
import { ClassesController } from './classes.controller.js';
import { Class } from './entities/class.entity.js';
import { ClassMember } from './entities/class-member.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, ClassMember, User]),
    CloudinaryModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}

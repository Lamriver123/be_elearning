import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity.js';
import { ClassMember, MemberStatus } from './entities/class-member.entity.js';
import { CreateClassDto } from './dto/create-class.dto.js';
import { ApproveMemberDto } from './dto/approve-member.dto.js';
import { UpdateClassDto } from './dto/update-class.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { User, Role } from '../users/entities/user.entity.js';
import * as crypto from 'crypto';
import { AUTH_CONSTANTS } from '../../common/constants/auth.constants.js';
import { CLASS_MESSAGES } from '../../common/constants/messages.constants.js';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(ClassMember)
    private classMembersRepository: Repository<ClassMember>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createClass(
    teacherId: string,
    createClassDto: CreateClassDto,
    posterFile?: Express.Multer.File,
  ) {
    const teacher = await this.usersRepository.findOne({ where: { id: teacherId } });
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_CREATE);
    }

    let posterUrl: string | undefined;
    if (posterFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(posterFile);
      posterUrl = uploadResult.secure_url;
    }

    // Sinh invite code duy nhất (VD: 8 ký tự ngẫu nhiên)
    let inviteCode = '';
    let isUnique = false;
    while (!isUnique) {
      inviteCode = crypto.randomBytes(AUTH_CONSTANTS.INVITE_CODE_BYTES).toString('hex').toUpperCase();
      const existing = await this.classesRepository.findOne({ where: { inviteCode } });
      if (!existing) {
        isUnique = true;
      }
    }

    const newClass = this.classesRepository.create({
      ...createClassDto,
      teacher,
      inviteCode,
      poster: posterUrl,
    });

    await this.classesRepository.save(newClass);

    return {
      message: CLASS_MESSAGES.CREATE_SUCCESS,
      class: {
        id: newClass.id,
        name: newClass.name,
        inviteCode: newClass.inviteCode,
        poster: newClass.poster,
      },
    };
  }

  async updateClass(
    teacherId: string,
    classId: string,
    updateClassDto: UpdateClassDto,
    posterFile?: Express.Multer.File,
  ) {
    const classInfo = await this.classesRepository.findOne({
      where: { id: classId },
      relations: { teacher: true },
    });

    if (!classInfo) throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND);
    if (classInfo.teacher.id !== teacherId) throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_UPDATE);

    let posterUrl = classInfo.poster;
    if (posterFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(posterFile);
      posterUrl = uploadResult.secure_url;
    }

    Object.assign(classInfo, updateClassDto);
    classInfo.poster = posterUrl;

    await this.classesRepository.save(classInfo);
    return { message: CLASS_MESSAGES.UPDATE_SUCCESS, class: { id: classInfo.id, name: classInfo.name, poster: classInfo.poster } };
  }

  async deleteClass(teacherId: string, classId: string) {
    const classInfo = await this.classesRepository.findOne({
      where: { id: classId },
      relations: { teacher: true },
    });

    if (!classInfo) throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND);
    if (classInfo.teacher.id !== teacherId) throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_DELETE);

    await this.classesRepository.remove(classInfo);
    return { message: CLASS_MESSAGES.DELETE_SUCCESS };
  }

  async previewClassByInviteCode(inviteCode: string) {
    const classInfo = await this.classesRepository.findOne({ 
      where: { inviteCode },
      relations: { teacher: true }
    });

    if (!classInfo) {
      throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND_CODE);
    }

    return {
      id: classInfo.id,
      name: classInfo.name,
      description: classInfo.description,
      poster: classInfo.poster,
      teacherName: classInfo.teacher.fullName,
    };
  }

  async joinClass(studentId: string, inviteCode: string) {
    const student = await this.usersRepository.findOne({ where: { id: studentId } });
    if (!student || student.role !== Role.STUDENT) {
      throw new ForbiddenException(CLASS_MESSAGES.STUDENT_ONLY_JOIN);
    }

    const classInfo = await this.classesRepository.findOne({ where: { inviteCode } });
    if (!classInfo) {
      throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND_CODE);
    }

    const existingMember = await this.classMembersRepository.findOne({
      where: { classInfo: { id: classInfo.id }, student: { id: studentId } },
    });

    if (existingMember) {
      throw new ConflictException(
        `Bạn đã tham gia lớp này (Trạng thái: ${existingMember.status})`,
      );
    }

    const classMember = this.classMembersRepository.create({
      classInfo,
      student,
      status: MemberStatus.PENDING,
    });

    await this.classMembersRepository.save(classMember);

    return {
      message: CLASS_MESSAGES.JOIN_SUCCESS,
    };
  }

  async approveMember(
    teacherId: string,
    classId: string,
    studentId: string,
    approveMemberDto: ApproveMemberDto,
  ) {
    const classInfo = await this.classesRepository.findOne({
      where: { id: classId },
      relations: { teacher: true },
    });

    if (!classInfo) {
      throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND);
    }

    if (classInfo.teacher.id !== teacherId) {
      throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_APPROVE);
    }

    const member = await this.classMembersRepository.findOne({
      where: { classInfo: { id: classId }, student: { id: studentId } },
    });

    if (!member) {
      throw new NotFoundException(CLASS_MESSAGES.STUDENT_NOT_FOUND_WAITING);
    }

    if (member.status !== MemberStatus.PENDING) {
      throw new BadRequestException(CLASS_MESSAGES.STUDENT_ALREADY_PROCESSED);
    }
    
    if (
      approveMemberDto.status !== MemberStatus.APPROVED &&
      approveMemberDto.status !== MemberStatus.REJECTED
    ) {
      throw new BadRequestException(CLASS_MESSAGES.INVALID_STATUS);
    }

    if (approveMemberDto.status === MemberStatus.REJECTED) {
      await this.classMembersRepository.remove(member);
    } else {
      member.status = approveMemberDto.status;
      await this.classMembersRepository.save(member);
    }

    return {
      message: `Đã ${
        approveMemberDto.status === MemberStatus.APPROVED ? 'chấp nhận' : 'từ chối'
      } học sinh`,
    };
  }

  async kickMember(teacherId: string, classId: string, studentId: string) {
    const classInfo = await this.classesRepository.findOne({
      where: { id: classId },
      relations: { teacher: true },
    });

    if (!classInfo) throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND);
    if (classInfo.teacher.id !== teacherId) throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_KICK);

    const member = await this.classMembersRepository.findOne({
      where: { classInfo: { id: classId }, student: { id: studentId } },
    });

    if (!member) throw new NotFoundException(CLASS_MESSAGES.STUDENT_NOT_FOUND);

    await this.classMembersRepository.remove(member);
    return { message: CLASS_MESSAGES.KICK_SUCCESS };
  }

  async inviteMember(teacherId: string, classId: string, inviteMemberDto: InviteMemberDto) {
    const classInfo = await this.classesRepository.findOne({
      where: { id: classId },
      relations: { teacher: true },
    });

    if (!classInfo) throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND);
    if (classInfo.teacher.id !== teacherId) throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_INVITE);

    const student = await this.usersRepository.findOne({ where: { email: inviteMemberDto.email } });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException(CLASS_MESSAGES.STUDENT_NOT_FOUND_EMAIL);
    }

    const existingMember = await this.classMembersRepository.findOne({
      where: { classInfo: { id: classId }, student: { id: student.id } },
    });

    if (existingMember) {
      throw new ConflictException(`Học sinh đã tồn tại trong lớp (Trạng thái: ${existingMember.status})`);
    }

    const classMember = this.classMembersRepository.create({
      classInfo,
      student,
      status: MemberStatus.INVITED,
    });

    await this.classMembersRepository.save(classMember);
    return { message: CLASS_MESSAGES.INVITE_SUCCESS };
  }

  async acceptInvite(studentId: string, classId: string) {
    const member = await this.classMembersRepository.findOne({
      where: { classInfo: { id: classId }, student: { id: studentId } },
    });

    if (!member || member.status !== MemberStatus.INVITED) {
      throw new NotFoundException(CLASS_MESSAGES.INVITE_NOT_FOUND);
    }

    member.status = MemberStatus.APPROVED;
    await this.classMembersRepository.save(member);
    return { message: CLASS_MESSAGES.ACCEPT_INVITE_SUCCESS };
  }

  async getClassesByRole(userId: string, role: Role) {
    if (role === Role.TEACHER) {
      const classes = await this.classesRepository.find({
        where: { teacher: { id: userId } },
        order: { createdAt: 'DESC' },
      });

      return Promise.all(
        classes.map(async (cls) => {
          const studentsCount = await this.classMembersRepository.count({
            where: { classInfo: { id: cls.id }, status: MemberStatus.APPROVED },
          });
          return { ...cls, studentsCount };
        })
      );
    } else if (role === Role.STUDENT) {
      const memberships = await this.classMembersRepository.find({
        where: { student: { id: userId } },
        relations: { classInfo: { teacher: true } },
        order: { joinedAt: 'DESC' },
      });
      return memberships.map((m) => ({
        ...m.classInfo,
        teacherName: m.classInfo.teacher.fullName,
        joinedAt: m.joinedAt,
        memberStatus: m.status,
      }));
    }
    return [];
  }

  async getClassMembers(teacherId: string, classId: string) {
    const classInfo = await this.classesRepository.findOne({
      where: { id: classId },
      relations: { teacher: true },
    });

    if (!classInfo) throw new NotFoundException(CLASS_MESSAGES.NOT_FOUND);
    if (classInfo.teacher.id !== teacherId) throw new ForbiddenException(CLASS_MESSAGES.TEACHER_ONLY_UPDATE);

    const members = await this.classMembersRepository.find({
      where: { classInfo: { id: classId } },
      relations: { student: true },
      order: { joinedAt: 'DESC' },
    });

    return members.map(m => ({
      id: m.id,
      status: m.status,
      joinedAt: m.joinedAt,
      student: {
        id: m.student.id,
        fullName: m.student.fullName,
        userName: m.student.userName,
        email: m.student.email,
        phone: m.student.phone,
        avatar: m.student.avatar,
        gender: m.student.gender,
        dateOfBirth: m.student.dateOfBirth,
        address: m.student.address,
        createdAt: m.student.createdAt,
      },
    }));
  }
}

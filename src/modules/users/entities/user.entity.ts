import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity.js';
import { ClassMember } from '../../classes/entities/class-member.entity.js';

export enum Role {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userName: string;

  @Column()
  fullName: string;

  @Column({ select: false })
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, select: false })
  otp: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  otpExpiry: Date;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ nullable: true })
  address: string;

  @Column({
    default:
      'https://res.cloudinary.com/vnvq5nup/image/upload/f_auto,q_auto/images_user_kafj7s',
  })
  avatar: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ nullable: true, select: false })
  hashedRefreshToken: string;

  @OneToMany(() => Class, (cls) => cls.teacher)
  classes: Class[];

  @OneToMany(() => ClassMember, (member) => member.student)
  joinedClasses: ClassMember[];

  @CreateDateColumn()
  createdAt: Date;
}

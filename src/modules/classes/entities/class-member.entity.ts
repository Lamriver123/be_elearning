import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Class } from './class.entity.js';

export enum MemberStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INVITED = 'INVITED',
}

@Entity('class_members')
export class ClassMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Class, (cls) => cls.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classInfo: Class;

  @ManyToOne(() => User, (user) => user.joinedClasses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  @CreateDateColumn()
  joinedAt: Date;
}

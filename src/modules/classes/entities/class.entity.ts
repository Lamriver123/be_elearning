import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { ClassMember } from './class-member.entity.js';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  poster: string;

  @Column({ unique: true })
  inviteCode: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => User, (user) => user.classes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @OneToMany(() => ClassMember, (classMember) => classMember.classInfo)
  members: ClassMember[];

  @CreateDateColumn()
  createdAt: Date;
}

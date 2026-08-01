import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { ExamClass } from './exam-class.entity.js';
import { ExamSection } from './exam-section.entity.js';
import { ExamFile } from './exam-file.entity.js';
import { SkillType, CreateMethod, ExamStatus } from './exam.enums.js';

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: SkillType, default: SkillType.MIXED })
  skillType: SkillType;

  @Column({ type: 'enum', enum: CreateMethod, default: CreateMethod.MANUAL })
  createMethod: CreateMethod;

  @Column({ type: 'enum', enum: ExamStatus, default: ExamStatus.DRAFT })
  status: ExamStatus;

  @Column({ type: 'int', name: 'total_points', default: 0 })
  totalPoints: number;

  @Column({ type: 'boolean', name: 'shuffle_questions', default: false })
  shuffleQuestions: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExamClass, (examClass) => examClass.exam)
  examClasses: ExamClass[];

  @OneToMany(() => ExamSection, (section) => section.exam)
  sections: ExamSection[];

  @OneToMany(() => ExamFile, (file) => file.exam)
  files: ExamFile[];
}
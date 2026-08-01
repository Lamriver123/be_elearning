import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Exam } from './exam.entity.js';
import { Question } from './question.entity.js';
import { ExamFile } from './exam-file.entity.js';
import { SkillType } from './exam.enums.js';

@Entity('exam_sections')
export class ExamSection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, (exam) => exam.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ type: 'enum', enum: SkillType, nullable: true })
  skillType: SkillType;

  @Column({ type: 'int', name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ type: 'int', name: 'points_per_question', nullable: true })
  pointsPerQuestion: number;

  @OneToMany(() => Question, (question) => question.section)
  questions: Question[];

  @OneToMany(() => ExamFile, (file) => file.section)
  files: ExamFile[];
}

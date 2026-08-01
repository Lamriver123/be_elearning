import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exam } from './exam.entity.js';
import { ExamSection } from './exam-section.entity.js';
import { Question } from './question.entity.js';
import { FileType, FilePurpose } from './exam.enums.js';

@Entity('exam_files')
export class ExamFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam, (exam) => exam.files, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => ExamSection, (section) => section.files, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'section_id' })
  section: ExamSection;

  @ManyToOne(() => Question, (question) => question.files, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ type: 'varchar', name: 'file_url', length: 1024 })
  fileUrl: string;

  @Column({ type: 'varchar', name: 'file_name', length: 255 })
  fileName: string;

  @Column({ type: 'enum', enum: FileType })
  fileType: FileType;

  @Column({ type: 'enum', enum: FilePurpose })
  purpose: FilePurpose;

  @Column({ type: 'int', name: 'file_size', nullable: true })
  fileSize: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}

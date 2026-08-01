import { PartialType } from '@nestjs/swagger';
import { CreateExamDto } from './create-exam.dto.js';

export class UpdateExamDto extends PartialType(CreateExamDto) {}

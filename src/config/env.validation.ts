import { plainToInstance, Type } from 'class-transformer';
import { IsString, IsNumber, validateSync, IsOptional } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  PORT: number = 3000;
  
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173';
  
  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validatedConfig);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

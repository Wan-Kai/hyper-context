import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string
}


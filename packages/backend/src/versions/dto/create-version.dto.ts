import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateVersionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  version?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}

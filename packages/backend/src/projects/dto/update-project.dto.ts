import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'error'])
  mcpStatus?: string
}


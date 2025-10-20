import { IsOptional, IsString } from 'class-validator'

export class ContentDto {
  @IsOptional()
  @IsString()
  content?: string
}


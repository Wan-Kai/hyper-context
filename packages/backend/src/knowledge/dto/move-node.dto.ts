import { IsOptional, IsString, ValidateIf } from 'class-validator'

export class MoveKnowledgeNodeDto {
  @ValidateIf((o) => o.targetParentId !== null)
  @IsString()
  targetParentId!: string | null

  @IsOptional()
  @ValidateIf((o) => o.beforeId !== null)
  @IsString()
  beforeId?: string | null
}


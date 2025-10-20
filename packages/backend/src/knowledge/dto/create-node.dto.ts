import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'

export class CreateKnowledgeNodeDto {
  @IsString()
  @MaxLength(200)
  name!: string

  @IsString()
  @IsIn(['file', 'folder'])
  type!: 'file' | 'folder'

  @IsOptional()
  @ValidateIf((o) => o.parentId !== null)
  @IsString()
  parentId?: string | null
}


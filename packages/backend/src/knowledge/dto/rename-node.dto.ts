import { IsString, MaxLength } from 'class-validator'

export class RenameKnowledgeNodeDto {
  @IsString()
  @MaxLength(200)
  name!: string
}


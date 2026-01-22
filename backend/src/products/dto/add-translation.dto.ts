import { IsEnum, IsString } from 'class-validator';
import { Language } from '../../common/enums/language.enum';

export class AddProductTranslationDto {
  @IsEnum(Language)
  language: Language;

  @IsString()
  name: string;

  @IsString()
  description: string;
}

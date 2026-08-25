import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserResponseDto } from '../../users/dto/current-user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived bearer access token' })
  accessToken!: string;

  @ApiProperty({ type: CurrentUserResponseDto })
  user!: CurrentUserResponseDto;
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { VisionService } from './vision.service';
import { ScanLineupDto } from './dto/scan-lineup.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/vision')
export class VisionController {
  constructor(private readonly visionService: VisionService) {}

  @Post('lineup')
  @UseGuards(JwtAuthGuard)
  scanLineup(@Body() dto: ScanLineupDto) {
    return this.visionService.scanLineup(dto);
  }
}

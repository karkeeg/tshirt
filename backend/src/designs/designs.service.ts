import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';

@Injectable()
export class DesignsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateDesignDto) {
    return this.prisma.design.create({
      data: {
        userId,
        productId: dto.productId,
        colorId: dto.colorId,
      },
      include: { layers: true },
    });
  }

  async findOne(userId: string, id: string) {
    const design = await this.prisma.design.findUnique({
      where: { id },
      include: { layers: true },
    });
    if (!design) {
      throw new NotFoundException(`Design ${id} not found`);
    }
    if (design.userId !== userId) {
      throw new ForbiddenException();
    }
    return design;
  }

  async update(userId: string, id: string, dto: UpdateDesignDto) {
    // Ensures the caller owns the design before touching its layers.
    await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      // Full replace: the editor saves both sides and every layer type in
      // one action, so there's no partial-side filter to preserve here.
      await tx.designLayer.deleteMany({ where: { designId: id } });
      if (dto.layers.length > 0) {
        await tx.designLayer.createMany({
          data: dto.layers.map((layer) => ({
            designId: id,
            side: layer.side,
            type: layer.type,
            imageUrl: layer.imageUrl,
            text: layer.text,
            fontFamily: layer.fontFamily,
            fontSize: layer.fontSize,
            color: layer.color,
            textAlign: layer.textAlign,
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            rotation: layer.rotation,
            zIndex: layer.zIndex,
          })),
        });
      }
      return tx.design.findUnique({ where: { id }, include: { layers: true } });
    });
  }
}

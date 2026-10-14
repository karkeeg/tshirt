import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

// Flat surcharge on top of the base shirt price for a custom design, per
// the project brief. No configurable pricing model exists yet — this is a
// simple constant, trivial to move into config/DB later if needed.
const CUSTOM_DESIGN_SURCHARGE = 350;

const ORDER_INCLUDE = {
  items: {
    include: { product: true, color: true },
  },
} as const;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    const design = await this.prisma.design.findUnique({
      where: { id: dto.designId },
      include: { layers: true, product: true },
    });

    if (!design) {
      throw new NotFoundException(`Design ${dto.designId} not found`);
    }
    if (design.userId !== userId) {
      throw new ForbiddenException();
    }
    if (design.layers.length === 0) {
      throw new BadRequestException('Add a design before ordering');
    }
    if (design.status !== 'DRAFT') {
      throw new ConflictException('This design has already been ordered');
    }

    const subtotal = Number(design.product.basePrice);
    const surcharge = CUSTOM_DESIGN_SURCHARGE;
    const total = subtotal + surcharge;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          shippingName: dto.shippingName,
          shippingPhone: dto.shippingPhone,
          shippingAddress: dto.shippingAddress,
          shippingCity: dto.shippingCity,
          subtotal,
          surcharge,
          total,
          items: {
            create: {
              designId: design.id,
              productId: design.productId,
              colorId: design.colorId,
              size: dto.size,
              unitPrice: subtotal,
              surcharge,
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      await tx.design.update({
        where: { id: design.id },
        data: { status: 'ORDERED' },
      });

      return order;
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
    });
  }

  async findOne(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException();
    }
    return order;
  }
}

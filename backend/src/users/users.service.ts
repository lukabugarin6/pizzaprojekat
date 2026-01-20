// src/users/users.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * ===== READ =====
   */

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * ===== CREATE =====
   */

  /**
   * Superuser kreira admina
   */
  async createAdmin(
    currentUser: User,
    data: { email: string; password: string },
  ): Promise<User> {
    if (currentUser.role !== Role.SUPERUSER) {
      throw new ForbiddenException('Only superuser can create admins');
    }

    return this.createUserInternal(data, Role.ADMIN);
  }

  /**
   * Superuser ili admin kreiraju običnog usera
   */
  async createUser(
    currentUser: User,
    data: { email: string; password: string },
  ): Promise<User> {
    if (![Role.SUPERUSER, Role.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('Not allowed to create users');
    }

    return this.createUserInternal(data, Role.USER);
  }

  private async createUserInternal(
    data: { email: string; password: string },
    role: Role,
  ): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = this.userRepository.create({
      email: data.email,
      password: hashedPassword,
      role,
    });

    return this.userRepository.save(user);
  }

  /**
   * ===== UPDATE =====
   */

  /**
   * User menja SAMO svoj password
   */
  async changePassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.findById(userId);

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  /**
   * Admin/Superuser može da deaktivira usera
   */
  async setActiveStatus(
    currentUser: User,
    targetUserId: number,
    isActive: boolean,
  ): Promise<void> {
    if (![Role.SUPERUSER, Role.ADMIN].includes(currentUser.role)) {
      throw new ForbiddenException('Not allowed');
    }

    const user = await this.findById(targetUserId);

    // Admin ne sme da dira superusera
    if (currentUser.role === Role.ADMIN && user.role === Role.SUPERUSER) {
      throw new ForbiddenException('Cannot modify superuser');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);
  }

  /**
   * ===== DELETE =====
   */

  async deleteUser(currentUser: User, targetUserId: number): Promise<void> {
    if (currentUser.role !== Role.SUPERUSER) {
      throw new ForbiddenException('Only superuser can delete users');
    }

    const user = await this.findById(targetUserId);
    await this.userRepository.remove(user);
  }
}

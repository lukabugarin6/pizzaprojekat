// src/database/seed/superuser.seed.ts
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../../users/user.entity';
import { Role } from '../../common/enums/role.enum';

export async function seedSuperUser(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);

  const exists = await userRepo.findOne({
    where: { role: Role.SUPERUSER },
  });

  if (exists) return;

  const password = await bcrypt.hash('lepjedan123', 10);

  const superuser = userRepo.create({
    email: 'lukabugarin6@gmail.com',
    password,
    role: Role.SUPERUSER,
  });

  await userRepo.save(superuser);
}

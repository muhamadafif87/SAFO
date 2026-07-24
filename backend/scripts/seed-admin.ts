import { AppDataSource } from '../src/database/data-source';
import { User, UserRole, UserStatus } from '../src/database/entities/user.entity';
import * as bcrypt from 'bcryptjs';

async function seedAdmin() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const email = 'admin@safo.com';
  
  const existingAdmin = await userRepository.findOne({ where: { email } });
  if (existingAdmin) {
    console.log('Admin user already exists!');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const admin = userRepository.create({
    email,
    passwordHash,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  });

  await userRepository.save(admin);
  console.log('Admin user seeded successfully with email: admin@safo.com and password: admin123');
  process.exit(0);
}

seedAdmin().catch(error => {
  console.error('Error seeding admin:', error);
  process.exit(1);
});

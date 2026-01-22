import { DataSource } from 'typeorm';
import { Category } from '../../categories/category.entity';
import { CategoryTranslation } from '../../categories/category-translation.entity';
import { Language } from '../../common/enums/language.enum';

const categories = [
  {
    slug: 'pizza',
    sortOrder: 1,
    translations: {
      'sr-Latn': 'Pizze',
      en: 'Pizzas',
      ru: 'Пицца',
    },
  },
  {
    slug: 'sandwich',
    sortOrder: 2,
    translations: {
      'sr-Latn': 'Sendviči',
      en: 'Sandwiches',
      ru: 'Сэндвичи',
    },
  },
  {
    slug: 'drink',
    sortOrder: 3,
    translations: {
      'sr-Latn': 'Pića',
      en: 'Drinks',
      ru: 'Напитки',
    },
  },
];

export async function seedCategories(dataSource: DataSource) {
  const categoryRepo = dataSource.getRepository(Category);
  const translationRepo = dataSource.getRepository(CategoryTranslation);

  for (const cat of categories) {
    let category = await categoryRepo.findOne({
      where: { slug: cat.slug },
      relations: ['translations'],
    });

    if (!category) {
      category = categoryRepo.create({
        slug: cat.slug,
        sortOrder: cat.sortOrder,
      });
      await categoryRepo.save(category);
    }

    for (const [lang, name] of Object.entries(cat.translations)) {
      const exists = await translationRepo.findOne({
        where: {
          category: { id: category.id },
          language: lang as Language,
        },
      });

      if (!exists) {
        const translation = translationRepo.create({
          category,
          language: lang as Language,
          name,
        });
        await translationRepo.save(translation);
      }
    }
  }
}

import { pool } from './index';

export const INITIAL_MENU_ITEMS = [
  {
    name: 'Artisan Wagyu Cheeseburger',
    description: 'Fresh brioche bun, prime wagyu beef patty, aged cheddar, caramelized onion, truffle aioli',
    price: 15.99,
    stock: 1, // EXACTLY 1 for concurrency race tests!
    category: 'Mains',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Neapolitan Margherita Pizza',
    description: 'San Marzano tomatoes, fresh mozzarella di bufala, basil, extra virgin olive oil',
    price: 13.50,
    stock: 15,
    category: 'Mains',
    image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Crispy Korean Fried Chicken',
    description: 'Double-fried wings glazed in spicy gochujang sweet-heat sauce, sesame seeds',
    price: 11.99,
    stock: 10,
    category: 'Mains',
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Garlic Truffle Parmesan Fries',
    description: 'Hand-cut russet potatoes, white truffle oil, grated parmesan, fresh rosemary',
    price: 6.50,
    stock: 25,
    category: 'Sides',
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Classic Caesar Salad',
    description: 'Crisp romaine hearts, shaved parmigiano-reggiano, garlic herb croutons, creamy caesar dressing',
    price: 8.99,
    stock: 12,
    category: 'Salads',
    image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Spicy Dragon Sushi Roll',
    description: 'Tempura shrimp, cucumber, avocado, spicy mayo, eel sauce, masago',
    price: 14.50,
    stock: 8,
    category: 'Mains',
    image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Molten Lava Chocolate Cake',
    description: 'Rich dark chocolate cake with warm flowing center, served with vanilla bean gelato',
    price: 7.99,
    stock: 14,
    category: 'Desserts',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Craft Strawberry Basil Soda',
    description: 'House-made strawberry puree, freshly slapped sweet basil, sparkling mineral water, lime',
    price: 4.50,
    stock: 30,
    category: 'Beverages',
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
  }
];

export async function seedMenu() {
  console.log('[Seed Engine] Seeding initial menu items...');
  const client = await pool.connect();
  try {
    for (const item of INITIAL_MENU_ITEMS) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, stock, category, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING;`,
        [item.name, item.description, item.price, item.stock, item.category, item.image_url]
      );
    }
    console.log('[Seed Engine] Menu seeded successfully.');
  } catch (err) {
    console.error('[Seed Engine] Failed to seed menu:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].includes('seed.ts')) {
  seedMenu()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

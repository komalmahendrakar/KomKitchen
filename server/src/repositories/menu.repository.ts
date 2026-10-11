import { pool } from '../db';
import { MenuItem } from '../shared/types';

export class MenuRepository {
  static async getAllMenuItems(): Promise<MenuItem[]> {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        description, 
        price::float AS price, 
        stock, 
        category, 
        image_url AS "imageUrl", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM menu_items
      ORDER BY name ASC;
    `);
    return result.rows;
  }

  static async getMenuItemById(id: string): Promise<MenuItem | null> {
    const result = await pool.query(
      `
      SELECT 
        id, 
        name, 
        description, 
        price::float AS price, 
        stock, 
        category, 
        image_url AS "imageUrl", 
        created_at AS "createdAt", 
        updated_at AS "updatedAt"
      FROM menu_items
      WHERE id = $1;
      `,
      [id]
    );
    return result.rows[0] || null;
  }
}

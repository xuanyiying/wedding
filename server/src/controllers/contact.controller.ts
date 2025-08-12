import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { ApiResponse } from '../interfaces';
import { Contact } from '../models';

export class ContactController {
  // 提交联系表单
  async submitContact(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, email, weddingDate, weddingTime, location, guestCount, serviceType, budget, requirements } =
        req.body;

      // 处理时间格式：从完整的 ISO 字符串中提取时间部分
      let formattedWeddingTime = weddingTime;
      if (weddingTime && typeof weddingTime === 'string') {
        // 如果是 ISO 格式的日期时间字符串，提取时间部分
        if (weddingTime.includes('T')) {
          const timeDate = new Date(weddingTime);
          formattedWeddingTime = timeDate.toTimeString().split(' ')[0]; // 格式：HH:MM:SS
        }
      }

      const contact = await Contact.create({
        name,
        phone,
        email,
        weddingDate,
        weddingTime: formattedWeddingTime,
        location,
        guestCount,
        serviceType,
        budget,
        requirements,
        status: 'pending',
      });

      const response: ApiResponse<Contact> = {
        success: true,
        message: '咨询信息提交成功，我们会在24小时内与您联系',
        data: contact,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('提交联系表单失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '提交失败，请稍后重试',
        data: null,
      };
      res.status(500).json(response);
    }
  }

  // 获取联系表单列表（管理员）
  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, status, startDate, endDate, search } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const whereClause: any = {};

      // 状态筛选
      if (status) {
        whereClause.status = status;
      }

      // 日期范围筛选
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate as string);
        }
      }

      // 搜索筛选
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { location: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows: contacts, count: total } = await Contact.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset,
      });

      const response: ApiResponse<{ contacts: Contact[]; total: number }> = {
        success: true,
        message: '获取联系表单列表成功',
        data: { contacts, total },
      };

      res.json(response);
    } catch (error) {
      console.error('获取联系表单列表失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '获取联系表单列表失败',
        data: null,
      };
      res.status(500).json(response);
    }
  }

  // 获取单个联系表单详情（管理员）
  async getContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        const response: ApiResponse<null> = {
          success: false,
          message: '联系表单不存在',
          data: null,
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Contact> = {
        success: true,
        message: '获取联系表单详情成功',
        data: contact,
      };

      res.json(response);
    } catch (error) {
      console.error('获取联系表单详情失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '获取联系表单详情失败',
        data: null,
      };
      res.status(500).json(response);
    }
  }

  // 更新联系表单状态（管理员）
  async updateContactStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        const response: ApiResponse<null> = {
          success: false,
          message: '联系表单不存在',
          data: null,
        };
        res.status(404).json(response);
        return;
      }

      await contact.update({
        status,
        notes,
        updatedAt: new Date(),
      });

      const response: ApiResponse<Contact> = {
        success: true,
        message: '更新联系表单状态成功',
        data: contact,
      };

      res.json(response);
    } catch (error) {
      console.error('更新联系表单状态失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '更新联系表单状态失败',
        data: null,
      };
      res.status(500).json(response);
    }
  }

  // 删除联系表单（管理员）
  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id);

      if (!contact) {
        const response: ApiResponse<null> = {
          success: false,
          message: '联系表单不存在',
          data: null,
        };
        res.status(404).json(response);
        return;
      }

      await contact.destroy();

      const response: ApiResponse<null> = {
        success: true,
        message: '删除联系表单成功',
        data: null,
      };

      res.json(response);
    } catch (error) {
      console.error('删除联系表单失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '删除联系表单失败',
        data: null,
      };
      res.status(500).json(response);
    }
  }

  // 批量删除联系表单（管理员）
  async batchDeleteContacts(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      await Contact.destroy({
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      const response: ApiResponse<null> = {
        success: true,
        message: '批量删除联系表单成功',
        data: null,
      };

      res.json(response);
    } catch (error) {
      console.error('批量删除联系表单失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '批量删除联系表单失败',
        data: null,
      };
      res.status(500).json(response);
    }
  }

  // 获取联系表单统计（管理员）
  async getContactStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const whereClause: any = {};

      // 日期范围筛选
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt[Op.gte] = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = new Date(endDate as string);
        }
      }

      const [total, pending, contacted, completed, cancelled] = await Promise.all([
        Contact.count({ where: whereClause }),
        Contact.count({ where: { ...whereClause, status: 'pending' } }),
        Contact.count({ where: { ...whereClause, status: 'contacted' } }),
        Contact.count({ where: { ...whereClause, status: 'completed' } }),
        Contact.count({ where: { ...whereClause, status: 'cancelled' } }),
      ]);

      const stats = {
        total,
        pending,
        contacted,
        completed,
        cancelled,
      };

      const response: ApiResponse<typeof stats> = {
        success: true,
        message: '获取联系表单统计成功',
        data: stats,
      };

      res.json(response);
    } catch (error) {
      console.error('获取联系表单统计失败:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: '获取联系表单统计失败',
        data: null,
      };
      res.status(500).json(response);
    }
  }
}

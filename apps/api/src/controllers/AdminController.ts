import { IUserRepository } from '../interfaces/IUserRepository';
import { UpdateUserRoleDTO } from '../types/domain';
import { ApiResponse, RequestContext } from '../types/http';

export class AdminController {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * GET /api/v1/admin/users
   * List all registered users (Admin only).
   */
  async listUsers(_ctx: RequestContext): Promise<Response> {
    const users = await this.userRepository.findAllUsers();
    const userSummaries = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    const response: ApiResponse = {
      success: true,
      data: userSummaries,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * PUT /api/v1/admin/users/:id/role
   * Update user role (Admin only).
   */
  async updateUserRole(ctx: RequestContext): Promise<Response> {
    const targetUserId = ctx.params.id;
    const body = (await ctx.request.json()) as UpdateUserRoleDTO;

    if (!body.role || (body.role !== 'admin' && body.role !== 'user')) {
      throw new Error('INVALID_INPUT: Role must be either "admin" or "user"');
    }

    const updated = await this.userRepository.updateRole(targetUserId, body.role);
    if (!updated) {
      throw new Error('NOT_FOUND: Target user not found');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: `User role updated to ${body.role}` },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

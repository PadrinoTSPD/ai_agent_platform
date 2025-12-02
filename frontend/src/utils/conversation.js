// 导入必要的工具函数和请求方法
import { get, post, del } from './user.js'

/**
 * 会话相关API
 */
export const conversationAPI = {
  /**
   * 获取会话列表
   */
  async getConversationList(params = {}) {
    try {
      // 构建查询参数
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 20,
        ...(params.agent_id && { agent_id: params.agent_id })
      }
      const response = await get('/conversation/get_conversation_list', queryParams)
      return response
    } catch (error) {
      console.error('获取会话列表失败:', error)
      throw error
    }
  },
  
  /**
   * 创建会话
   */
  async createConversation(data) {
    try {
      const response = await post('/conversation/create_conversation', data)
      return response
    } catch (error) {
      console.error('创建会话失败:', error)
      throw error
    }
  },
  
  /**
   * 获取会话详情
   */
  async getConversation(conversationId) {
    try {
      const response = await get(`/conversation/get_conversation/${conversationId}`)
      return response
    } catch (error) {
      console.error('获取会话详情失败:', error)
      throw error
    }
  },
  
  /**
   * 删除会话
   */
  async deleteConversation(conversationId) {
    try {
      const response = await del(`/conversation/delete_conversation/${conversationId}`)
      return response
    } catch (error) {
      console.error('删除会话失败:', error)
      throw error
    }
  },
  
  /**
   * 获取消息历史
   */
  async getMessageHistory(conversationId, params = {}) {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 20,
        ...(params.before && { before: params.before })
      }
      const response = await get(`/message/${conversationId}/history`, queryParams)
      return response
    } catch (error) {
      console.error('获取消息历史失败:', error)
      throw error
    }
  },
  
  /**
   * 发送消息
   */
  async sendMessage(conversationId, data) {
    try {
      const response = await post(`/conversations/${conversationId}/messages`, data)
      return response
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }
}


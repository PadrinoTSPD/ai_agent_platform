<template>
  <div class="agents-view-container">
    <!-- 左侧会话列表 -->
    <div class="conversations-sidebar">
      <div class="conversations-list">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: selectedConversationId === conversation.id }"
        >
          <div
            class="conversation-title"
            @click="selectConversation(conversation.id)"
          >
            {{ conversation.title }}
          </div>
          <button
            class="btn-delete-conversation"
            @click.stop="handleDeleteConversation(conversation)"
            title="删除会话"
          >
            ×
          </button>
        </div>
      </div>
      
      <!-- 创建会话按钮 -->
      <button class="btn-create-conversation" @click="showCreateModal = true">
        <span class="create-icon">+</span>
        <span>创建会话</span>
      </button>
    </div>

    <!-- 右侧消息区域 -->
    <div class="messages-area">
      <!-- 消息历史 -->
      <div class="messages-history" ref="messagesHistoryRef">
        <div v-if="!selectedConversationId" class="empty-state">
          <p>请选择一个会话开始对话</p>
        </div>
        <div v-else-if="loadingMessages" class="loading-state">
          <p>加载中...</p>
        </div>
        <div v-else-if="messageHistory.length === 0" class="empty-state">
          <p>暂无消息</p>
        </div>
        <div v-else class="messages-list">
          <div
            v-for="(messagePair, index) in messageHistory"
            :key="index"
            class="message-pair"
          >
            <!-- 用户消息 -->
            <div class="message message-user">
              <div class="message-content">{{ messagePair.userMessageVO?.content || '' }}</div>
              <div class="message-time">{{ formatTime(messagePair.userMessageVO?.createdAt) }}</div>
            </div>
            <!-- 智能体回复 -->
            <div v-if="messagePair.agentMessageVO" class="message message-agent">
              <div class="message-content">{{ messagePair.agentMessageVO.content }}</div>
              <div class="message-time">{{ formatTime(messagePair.agentMessageVO.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="message-input-area">
        <textarea
          v-model="messageInput"
          class="message-input"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="handleSendMessage"
          @keydown.enter.shift.exact="newline"
          rows="3"
          :disabled="!selectedConversationId || sendingMessage"
        ></textarea>
        <button
          class="btn-send"
          @click="handleSendMessage"
          :disabled="!selectedConversationId || !messageInput.trim() || sendingMessage"
        >
          {{ sendingMessage ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>

    <!-- 创建会话弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>创建会话</h3>
          <button class="modal-close" @click="showCreateModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="conversationTitle">会话标题</label>
            <input
              type="text"
              id="conversationTitle"
              v-model="newConversationTitle"
              placeholder="请输入会话标题"
              class="form-input"
              @keyup.enter="handleCreateConversation"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateModal = false">取消</button>
          <button
            class="btn-confirm"
            @click="handleCreateConversation"
            :disabled="!newConversationTitle.trim() || creatingConversation"
          >
            {{ creatingConversation ? '创建中...' : '创建会话' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../utils/api.js'

export default {
  name: 'AgentsView',
  data() {
    return {
      conversations: [],
      selectedConversationId: null,
      messageHistory: [],
      messageInput: '',
      loadingMessages: false,
      sendingMessage: false,
      showCreateModal: false,
      newConversationTitle: '',
      creatingConversation: false,
      agentId: null, // 当前智能体ID
      loadingConversations: false
    }
  },
  mounted() {
    // 从路由查询参数获取 agent_id
    this.agentId = this.$route.query.agent_id || this.$route.params.id || null
    
    // 加载会话列表
    this.loadConversations()
  },
  methods: {
    // 加载会话列表
    async loadConversations() {
      this.loadingConversations = true
      try {
        const params = {
          page: 1,
          limit: 100
        }
        if (this.agentId) {
          params.agent_id = this.agentId
        }
        const response = await api.conversation.getConversationList(params)
        this.conversations = response.conversations || []
      } catch (error) {
        console.error('获取会话列表失败:', error)
        alert('获取会话列表失败，请稍后重试')
      } finally {
        this.loadingConversations = false
      }
    },
    
    // 选择会话
    async selectConversation(conversationId) {
      this.selectedConversationId = conversationId
      await this.loadMessageHistory(conversationId)
    },
    
    // 加载消息历史
    async loadMessageHistory(conversationId) {
      this.loadingMessages = true
      try {
        const response = await api.conversation.getMessageHistory(conversationId, {
          page: 1,
          limit: 100
        })

        // 调试：打印后端返回的原始响应，便于排查不同后端返回格式
        console.debug('[loadMessageHistory] response:', response)

        // 兼容多种可能的返回结构：
        // 1) { history: [...] }
        // 2) { data: { history: [...] } }
        // 3) directly an array: [...] (某些实现可能直接返回数组)
        let history = []
        if (Array.isArray(response)) {
          history = response
        } else if (response && Array.isArray(response.history)) {
          history = response.history
        } else if (response && response.data && Array.isArray(response.data.history)) {
          history = response.data.history
        } else if (response && Array.isArray(response.data)) {
          history = response.data
        }

        this.messageHistory = history || []
        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('获取消息历史失败:', error)
        alert('获取消息历史失败，请稍后重试')
        this.messageHistory = []
      } finally {
        this.loadingMessages = false
      }
    },
    
    // 删除会话
    async handleDeleteConversation(conversation) {
      if (confirm(`确定要删除会话"${conversation.title}"吗？`)) {
        try {
          await api.conversation.deleteConversation(conversation.id)
          // 如果删除的是当前选中的会话，清除选择
          if (this.selectedConversationId === conversation.id) {
            this.selectedConversationId = null
            this.messageHistory = []
          }
          // 重新加载会话列表
          await this.loadConversations()
        } catch (error) {
          console.error('删除会话失败:', error)
          alert('删除会话失败，请稍后重试')
        }
      }
    },
    
    // 创建会话
    async handleCreateConversation() {
      if (!this.newConversationTitle.trim()) {
        return
      }
      
      if (!this.agentId) {
        alert('缺少智能体ID，请从智能体列表进入此页面')
        return
      }
      
      this.creatingConversation = true
      try {
        const response = await api.conversation.createConversation({
          agent_id: parseInt(this.agentId),
          title: this.newConversationTitle.trim(),
          metadata: {
            source: 'web',
            user_agent: navigator.userAgent
          }
        })
        
        // 关闭弹窗并重置
        this.showCreateModal = false
        this.newConversationTitle = ''
        
        // 重新加载会话列表
        await this.loadConversations()
        
        // 选择新创建的会话并加载消息历史
        if (response && response.id) {
          this.selectedConversationId = response.id
          await this.loadMessageHistory(response.id)
        }
      } catch (error) {
        console.error('创建会话失败:', error)
        alert('创建会话失败，请稍后重试')
      } finally {
        this.creatingConversation = false
      }
    },
    
    // 发送消息
    async handleSendMessage() {
      if (!this.messageInput.trim() || !this.selectedConversationId || this.sendingMessage) {
        return
      }
      
      const messageContent = this.messageInput.trim()
      this.messageInput = ''
      this.sendingMessage = true
      
      try {
        const response = await api.conversation.sendMessage(this.selectedConversationId, {
          content: messageContent,
          type: 'text',
          metadata: {}
        })
        
        // 立即显示用户消息
        if (response.userMessageVO) {
          this.messageHistory.push({
            userMessageVO: response.userMessageVO,
            agentMessageVO: null
          })
        }
        
        // 如果有智能体回复，也立即显示
        if (response.agentMessageVO) {
          // 更新最后一条消息对，添加智能体回复
          if (this.messageHistory.length > 0) {
            this.messageHistory[this.messageHistory.length - 1].agentMessageVO = response.agentMessageVO
          } else {
            this.messageHistory.push({
              userMessageVO: response.userMessageVO,
              agentMessageVO: response.agentMessageVO
            })
          }
        }
        
        // 滚动到底部
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('发送消息失败:', error)
        alert('发送消息失败，请稍后重试')
        // 恢复输入框内容
        this.messageInput = messageContent
      } finally {
        this.sendingMessage = false
      }
    },
    
    // 格式化时间
    formatTime(timeString) {
      if (!timeString) return ''
      const date = new Date(timeString)
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      
      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}小时前`
      
      const days = Math.floor(hours / 24)
      if (days < 7) return `${days}天前`
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    // 滚动到底部
    scrollToBottom() {
      const container = this.$refs.messagesHistoryRef
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
  }
}
</script>

<style scoped>
.agents-view-container {
  display: flex;
  height: 100vh;
  font-family: 'Arial', sans-serif;
  background-color: #f8fafc;
}

/* 左侧会话列表样式 */
.conversations-sidebar {
  width: 300px;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid transparent;
}

.conversation-item:hover {
  background-color: #f7fafc;
}

.conversation-item.active {
  background-color: #edf2f7;
  border-color: #667eea;
}

.conversation-title {
  flex: 1;
  font-size: 14px;
  color: #2d3748;
  word-break: break-word;
  padding-right: 8px;
}

.btn-delete-conversation {
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  color: #718096;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-delete-conversation:hover {
  background-color: #fed7d7;
  color: #c53030;
}

.btn-create-conversation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  margin: 16px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-create-conversation:hover {
  background-color: #5a67d8;
}

.create-icon {
  font-size: 20px;
  font-weight: 300;
}

/* 右侧消息区域样式 */
.messages-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-history {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background-color: #f8fafc;
}

.empty-state,
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #718096;
  font-size: 16px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message-pair {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
}

.message-user {
  align-self: flex-end;
  background-color: #667eea;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-agent {
  align-self: flex-start;
  background-color: #ffffff;
  color: #2d3748;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
}

.message-content {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
}

/* 输入区域样式 */
.message-input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.message-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.message-input:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
}

.btn-send {
  padding: 12px 24px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-send:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-send:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #a0aec0;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: #f7fafc;
  color: #4a5568;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #2d3748;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-cancel {
  background-color: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background-color: #edf2f7;
}

.btn-confirm {
  background-color: #667eea;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #5a67d8;
}

.btn-confirm:disabled {
  background-color: #a0aec0;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 滚动条样式 */
.conversations-list::-webkit-scrollbar,
.messages-history::-webkit-scrollbar {
  width: 6px;
}

.conversations-list::-webkit-scrollbar-track,
.messages-history::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.conversations-list::-webkit-scrollbar-thumb,
.messages-history::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.conversations-list::-webkit-scrollbar-thumb:hover,
.messages-history::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>
